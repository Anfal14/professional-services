package com.profecian;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.profecian.bookings.VendorJobRules;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

/**
 * Safeguards on the professional's job workflow: the customer's start code, the required "after"
 * photo, undo, and one job in progress at a time. The demo vendor (ven_1) does the jobs.
 */
class VendorJobIT extends IntegrationTestBase {
  @Autowired
  JdbcTemplate jdbc;

  /** A new Solapur electrician booking, assigned to the demo vendor. */
  private String assignedJob(String admin, String customer) {
    JsonNode b = post("/api/v1/customer/checkout", customer, Map.of(
        "groups", List.of(Map.of("categoryId", "electrician", "problemTypeIds", List.of("el-fan"))),
        "date", LocalDate.now().plusDays(2).toString(),
        "slot", "03:00 PM",
        "address", Map.of("id", "adr_cus_1", "label", "Home", "line", "10, Lake View, Hotgi Road", "city", "Solapur"),
        "contactName", "Priya Sharma",
        "contactPhone", "9876500001")).getBody().get(0);
    String id = b.get("id").asText();
    assertThat(post("/api/v1/admin/bookings/" + id + "/assign", admin, Map.of("vendorId", "ven_1")).getStatusCode()).isEqualTo(HttpStatus.OK);
    return id;
  }

  private JsonNode advance(String vendor, String id, String startCode) {
    return post("/api/v1/vendor/jobs/" + id + "/advance", vendor, startCode == null ? null : Map.of("startCode", startCode)).getBody();
  }

  private JsonNode booking(String token, String id) {
    for (JsonNode b : sync(token).get("bookings")) if (b.get("id").asText().equals(id)) return b;
    return null;
  }

  /** Support clears whatever the demo vendor has in progress (seeded demo jobs, or another test's). */
  private void finishOtherJobs(String admin, String vendor, String except) {
    for (JsonNode b : sync(vendor).get("bookings")) {
      if ("in_progress".equals(b.get("status").asText()) && !b.get("id").asText().equals(except)) {
        post("/api/v1/admin/bookings/" + b.get("id").asText() + "/status", admin, Map.of("status", "cancelled", "note", "Cleared for a test"));
      }
    }
  }

  private String upload(String token) {
    HttpHeaders h = new HttpHeaders();
    h.setContentType(MediaType.MULTIPART_FORM_DATA);
    h.setBearerAuth(token);
    HttpHeaders part = new HttpHeaders();
    part.setContentType(MediaType.IMAGE_PNG);
    MultiValueMap<String, Object> form = new LinkedMultiValueMap<>();
    form.add("file", new HttpEntity<>(new ByteArrayResource(new byte[] {(byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10, 0, 0, 0, 0}) {
      @Override
      public String getFilename() {
        return "after.png";
      }
    }, part));
    return http.postForEntity("/api/v1/files", new HttpEntity<>(form, h), JsonNode.class).getBody().get("key").asText();
  }

  private JsonNode addPhoto(String vendor, String id, String kind) {
    return post("/api/v1/vendor/jobs/" + id + "/proof", vendor, Map.of("uri", upload(vendor), "kind", kind)).getBody();
  }

  private static String wrong(String code) {
    return "0000".equals(code) ? "1111" : "0000";
  }

  @Test
  void startCodePhotoUndoAndOneJobAtATime() {
    String admin = adminToken();
    String customer = customerToken(CUSTOMER_PHONE);
    String vendor = vendorToken(VENDOR_PHONE);
    finishOtherJobs(admin, vendor, null);
    String first = assignedJob(admin, customer);
    String second = assignedJob(admin, customer);

    // Accept → on the way → arrived need nothing extra. Their messages wait out the undo window.
    assertThat(advance(vendor, first, null).get("status").asText()).isEqualTo("accepted");
    assertThat(advance(vendor, first, null).get("status").asText()).isEqualTo("on_the_way");
    Integer held = jdbc.queryForObject("""
        select count(*) from outbox o join notifications n on n.id = o.notification_id
        where n.booking_id = ? and n.kind = 'vendor_on_the_way' and o.status = 'pending' and o.next_attempt_at > now() + interval '10 seconds'""", Integer.class, first);
    assertThat(held).isEqualTo(2); // WhatsApp + push
    JsonNode arrived = advance(vendor, first, null);
    assertThat(arrived.get("status").asText()).isEqualTo("arrived");

    // The code goes to the customer (and support), never to the professional.
    assertThat(arrived.has("startCode")).isFalse();
    assertThat(booking(vendor, first).has("startCode")).isFalse();
    String code = booking(customer, first).get("startCode").asText();
    assertThat(code).matches("\\d{4}");
    assertThat(booking(admin, first).get("startCode").asText()).isEqualTo(code);
    assertThat(sync(customer).get("notifications").findValuesAsText("body")).anyMatch(body -> body.contains("Start code " + code));

    // Starting needs that code.
    assertThat(advance(vendor, first, null).get("message").asText()).isEqualTo(VendorJobRules.START_CODE_MISSING);
    assertThat(advance(vendor, first, "12").get("message").asText()).isEqualTo(VendorJobRules.START_CODE_MISSING);
    assertThat(advance(vendor, first, wrong(code)).get("message").asText()).isEqualTo(VendorJobRules.startCodeWrong(4));
    assertThat(booking(vendor, first).get("status").asText()).isEqualTo("arrived");
    assertThat(advance(vendor, first, code).get("status").asText()).isEqualTo("in_progress");

    // Only one job in progress: the second job can get to the door but not start.
    advance(vendor, second, null);
    advance(vendor, second, null);
    advance(vendor, second, null);
    String secondCode = booking(customer, second).get("startCode").asText();
    String firstCode = booking(customer, first).get("code").asText();
    assertThat(advance(vendor, second, secondCode).get("message").asText()).isEqualTo(VendorJobRules.busy(firstCode));

    // Completing needs an "after" photo; a "before" photo doesn't count.
    assertThat(advance(vendor, first, null).get("message").asText()).isEqualTo(VendorJobRules.AFTER_PHOTO);
    assertThat(addPhoto(vendor, first, "before").get("proofPhotos")).hasSize(1);
    assertThat(advance(vendor, first, null).get("message").asText()).isEqualTo(VendorJobRules.AFTER_PHOTO);
    JsonNode withPhoto = addPhoto(vendor, first, "after");
    assertThat(withPhoto.get("afterPhotos")).hasSize(1);
    assertThat(withPhoto.get("proofPhotos")).hasSize(1);
    int jobsBefore = sync(vendor).at("/vendors/0/jobsCompleted").asInt();
    assertThat(advance(vendor, first, null).get("status").asText()).isEqualTo("completed");
    assertThat(sync(vendor).at("/vendors/0/jobsCompleted").asInt()).isEqualTo(jobsBefore + 1);
    assertThat(sync(customer).get("notifications").findValuesAsText("kind")).contains("service_completed");

    // Undo: back to in progress, on the record, and the "completed" message is taken back.
    JsonNode undone = post("/api/v1/vendor/jobs/" + first + "/undo", vendor, null).getBody();
    assertThat(undone.get("status").asText()).isEqualTo("in_progress");
    JsonNode lastEvent = undone.get("timeline").get(undone.get("timeline").size() - 1);
    assertThat(lastEvent.get("kind").asText()).isEqualTo("step_undone");
    assertThat(lastEvent.get("note").asText()).isEqualTo("Undid “Completed”");
    assertThat(sync(vendor).at("/vendors/0/jobsCompleted").asInt()).isEqualTo(jobsBefore);
    Integer left = jdbc.queryForObject("select count(*) from notifications where booking_id = ? and kind = 'service_completed'", Integer.class, first);
    assertThat(left).isZero();
    // An undo can't itself be undone.
    assertThat(post("/api/v1/vendor/jobs/" + first + "/undo", vendor, null).getBody().get("message").asText()).isEqualTo(VendorJobRules.UNDO_EXPIRED);

    // Complete again; once the customer has paid, the job stays completed.
    assertThat(advance(vendor, first, null).get("status").asText()).isEqualTo("completed");
    // Cash is recorded only for exactly the amount due.
    java.math.BigDecimal due = booking(vendor, first).at("/price/total").decimalValue();
    String cash = "/api/v1/vendor/jobs/" + first + "/collect-cash";
    assertThat(post(cash, vendor, null).getBody().get("message").asText()).isEqualTo(VendorJobRules.CASH_AMOUNT_MISSING);
    assertThat(post(cash, vendor, Map.of("amount", due.subtract(java.math.BigDecimal.ONE))).getBody().get("message").asText()).isEqualTo(VendorJobRules.CASH_AMOUNT_MISMATCH);
    assertThat(post(cash, vendor, Map.of("amount", due.add(java.math.BigDecimal.TEN))).getBody().get("message").asText()).isEqualTo(VendorJobRules.CASH_AMOUNT_MISMATCH);
    assertThat(booking(vendor, first).at("/payment/status").asText()).isEqualTo("unpaid");
    assertThat(post(cash, vendor, Map.of("amount", due)).getBody().at("/payment/status").asText()).isEqualTo("paid");
    assertThat(post("/api/v1/vendor/jobs/" + first + "/undo", vendor, null).getBody().get("message").asText()).isEqualTo(VendorJobRules.UNDO_EXPIRED);

    // With the first job done, the second can start.
    assertThat(advance(vendor, second, secondCode).get("status").asText()).isEqualTo("in_progress");
    // Undoing the start goes back to the door; the same code still works.
    assertThat(post("/api/v1/vendor/jobs/" + second + "/undo", vendor, null).getBody().get("status").asText()).isEqualTo("arrived");
    assertThat(booking(customer, second).get("startCode").asText()).isEqualTo(secondCode);
    assertThat(advance(vendor, second, secondCode).get("status").asText()).isEqualTo("in_progress");
    finishOtherJobs(admin, vendor, null);
  }

  @Test
  void tooManyWrongCodesLockTheJobUntilSupportStartsIt() {
    String admin = adminToken();
    String customer = customerToken(CUSTOMER_PHONE);
    String vendor = vendorToken(VENDOR_PHONE);
    finishOtherJobs(admin, vendor, null);
    String id = assignedJob(admin, customer);
    advance(vendor, id, null);
    advance(vendor, id, null);
    advance(vendor, id, null);
    String code = booking(customer, id).get("startCode").asText();

    for (int left = 4; left >= 1; left--) {
      assertThat(advance(vendor, id, wrong(code)).get("message").asText()).isEqualTo(VendorJobRules.startCodeWrong(left));
    }
    assertThat(advance(vendor, id, wrong(code)).get("message").asText()).isEqualTo(VendorJobRules.START_CODE_LOCKED);
    // Even the right code no longer works for the professional…
    assertThat(advance(vendor, id, code).get("message").asText()).isEqualTo(VendorJobRules.START_CODE_LOCKED);

    // …but support can start the job from the booking page, as before.
    JsonNode started = post("/api/v1/admin/bookings/" + id + "/status", admin, Map.of("status", "in_progress", "note", "Customer couldn’t find the code")).getBody();
    assertThat(started.get("status").asText()).isEqualTo("in_progress");
    assertThat(booking(vendor, id).get("status").asText()).isEqualTo("in_progress");
    finishOtherJobs(admin, vendor, null);
  }
}
