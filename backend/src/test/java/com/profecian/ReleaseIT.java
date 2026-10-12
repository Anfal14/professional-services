package com.profecian;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.profecian.bookings.ReleaseRules;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

/**
 * Giving a job back after accepting it: decline, early and late release, on-site reports, the
 * completion rate, and what each role sees. The demo vendor (ven_1, Ravi Patil) does the jobs.
 */
class ReleaseIT extends IntegrationTestBase {

  /** A new Solapur electrician booking a few days out, assigned to the demo vendor. */
  private String assignedJob(String admin, String customer) {
    JsonNode b = post("/api/v1/customer/checkout", customer, Map.of(
        "groups", List.of(Map.of("categoryId", "electrician", "problemTypeIds", List.of("el-fan"))),
        "date", LocalDate.now().plusDays(3).toString(),
        "slot", "05:00 PM",
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

  private JsonNode release(String vendor, String id, String reason, String note) {
    Map<String, Object> body = new HashMap<>();
    body.put("reason", reason);
    body.put("note", note);
    return post("/api/v1/vendor/jobs/" + id + "/release", vendor, body).getBody();
  }

  private JsonNode report(String vendor, String id, String kind, String reason, String note) {
    Map<String, Object> body = new HashMap<>();
    body.put("kind", kind);
    body.put("reason", reason);
    body.put("note", note);
    return post("/api/v1/vendor/jobs/" + id + "/issue", vendor, body).getBody();
  }

  private JsonNode booking(String token, String id) {
    for (JsonNode b : sync(token).get("bookings")) if (b.get("id").asText().equals(id)) return b;
    return null;
  }

  private JsonNode demoVendor(String token) {
    for (JsonNode v : sync(token).get("vendors")) if (v.get("id").asText().equals("ven_1")) return v;
    return null;
  }

  private static JsonNode lastEvent(JsonNode booking) {
    return booking.get("timeline").get(booking.get("timeline").size() - 1);
  }

  /** Support clears whatever the demo vendor has in progress, so a job can be started. */
  private void finishOtherJobs(String admin, String vendor) {
    for (JsonNode b : sync(vendor).get("bookings")) {
      if ("in_progress".equals(b.get("status").asText())) {
        post("/api/v1/admin/bookings/" + b.get("id").asText() + "/status", admin, Map.of("status", "cancelled", "note", "Cleared for a test"));
      }
    }
  }

  @Test
  void decliningAnOfferNeedsNoReasonAndLeavesNoRecord() {
    String admin = adminToken();
    String customer = customerToken(CUSTOMER_PHONE);
    String vendor = vendorToken(VENDOR_PHONE);
    JsonNode before = demoVendor(admin);
    String id = assignedJob(admin, customer);

    // A job that was only offered can't be "released"…
    assertThat(release(vendor, id, "unwell", null).get("message").asText()).isEqualTo(ReleaseRules.ERR_NOT_RELEASABLE);
    // …it is declined, with or without a reason.
    JsonNode declined = post("/api/v1/vendor/jobs/" + id + "/decline", vendor, null).getBody();
    assertThat(declined.get("status").asText()).isEqualTo("pending_assignment");
    JsonNode asAdmin = booking(admin, id);
    assertThat(asAdmin.has("vendorId")).isFalse();
    assertThat(lastEvent(asAdmin).get("note").asText()).isEqualTo("Declined");
    assertThat(asAdmin.get("releases")).isEmpty();
    assertThat(asAdmin.has("urgent")).isFalse();

    JsonNode after = demoVendor(admin);
    assertThat(after.get("acceptedJobs").asInt()).isEqualTo(before.get("acceptedJobs").asInt());
    assertThat(after.get("lateReleases").asInt()).isEqualTo(before.get("lateReleases").asInt());
  }

  @Test
  void earlyReleaseReturnsTheBookingToTheQueueAndTellsTheCustomer() {
    String admin = adminToken();
    String customer = customerToken(CUSTOMER_PHONE);
    String vendor = vendorToken(VENDOR_PHONE);
    String id = assignedJob(admin, customer);
    advance(vendor, id, null); // accepted
    JsonNode before = demoVendor(admin);

    // A reason from the list is required; "Other" needs a note.
    assertThat(release(vendor, id, null, null).get("message").asText()).isEqualTo(ReleaseRules.ERR_REASON);
    assertThat(release(vendor, id, "bored", null).get("message").asText()).isEqualTo(ReleaseRules.ERR_REASON);
    assertThat(release(vendor, id, "other", " ").get("message").asText()).isEqualTo(ReleaseRules.ERR_NOTE);
    assertThat(booking(vendor, id).get("status").asText()).isEqualTo("accepted");

    JsonNode released = release(vendor, id, "unwell", null);
    assertThat(released.get("status").asText()).isEqualTo("pending_assignment");

    // Admin: back in the queue without the vendor, never cancelled, with who / why / early on record.
    JsonNode asAdmin = booking(admin, id);
    assertThat(asAdmin.get("status").asText()).isEqualTo("pending_assignment");
    assertThat(asAdmin.has("vendorId")).isFalse();
    assertThat(asAdmin.has("urgent")).isFalse();
    JsonNode r = asAdmin.get("releases").get(0);
    assertThat(r.get("vendorId").asText()).isEqualTo("ven_1");
    assertThat(r.get("vendorName").asText()).isEqualTo("Ravi Patil");
    assertThat(r.get("reason").asText()).isEqualTo("unwell");
    assertThat(r.get("late").asBoolean()).isFalse();
    assertThat(lastEvent(asAdmin).get("kind").asText()).isEqualTo("released");
    assertThat(lastEvent(asAdmin).get("by").asText()).isEqualTo("vendor");
    assertThat(lastEvent(asAdmin).get("note").asText()).isEqualTo("Ravi Patil released the job — Unwell (early release)");
    assertThat(sync(admin).get("notifications").findValuesAsText("title")).contains("Job released");

    // Vendor: the job is gone. Customer: back to "finding a professional", told at once, without the vendor's reason.
    assertThat(booking(vendor, id)).isNull();
    JsonNode asCustomer = booking(customer, id);
    assertThat(asCustomer.get("status").asText()).isEqualTo("pending_assignment");
    assertThat(asCustomer.has("releases")).isFalse();
    assertThat(lastEvent(asCustomer).get("kind").asText()).isEqualTo("released");
    assertThat(lastEvent(asCustomer).has("note")).isFalse();
    assertThat(sync(customer).get("notifications").findValuesAsText("kind")).contains("professional_released");

    // An early release counts as a job accepted, but not against the completion rate.
    JsonNode after = demoVendor(admin);
    assertThat(after.get("acceptedJobs").asInt()).isEqualTo(before.get("acceptedJobs").asInt());
    assertThat(after.get("lateReleases").asInt()).isEqualTo(before.get("lateReleases").asInt());

    // Reassignment is manual: nobody is on it until the admin picks someone.
    assertThat(post("/api/v1/admin/bookings/" + id + "/assign", admin, Map.of("vendorId", "ven_1")).getBody().get("status").asText()).isEqualTo("assigned");
  }

  @Test
  void lateReleaseIsUrgentAndCountsAgainstTheCompletionRate() {
    String admin = adminToken();
    String customer = customerToken(CUSTOMER_PHONE);
    String vendor = vendorToken(VENDOR_PHONE);
    String id = assignedJob(admin, customer);
    advance(vendor, id, null); // accepted
    JsonNode before = demoVendor(vendor); // the vendor's own app gets the totals too
    advance(vendor, id, null); // on the way → any release is now late

    JsonNode released = release(vendor, id, "other", "  Bike   broke down on the highway ");
    assertThat(released.get("status").asText()).isEqualTo("pending_assignment");

    JsonNode asAdmin = booking(admin, id);
    assertThat(asAdmin.get("urgent").asBoolean()).isTrue();
    JsonNode r = asAdmin.get("releases").get(0);
    assertThat(r.get("late").asBoolean()).isTrue();
    assertThat(r.get("note").asText()).isEqualTo("Bike broke down on the highway");
    assertThat(lastEvent(asAdmin).get("note").asText()).isEqualTo("Ravi Patil released the job — Other: Bike broke down on the highway (late release)");
    assertThat(sync(admin).get("notifications").findValuesAsText("title")).contains("Urgent: job released close to the slot");
    assertThat(booking(customer, id).has("urgent")).isFalse();

    JsonNode after = demoVendor(vendor);
    assertThat(after.get("acceptedJobs").asInt()).isEqualTo(before.get("acceptedJobs").asInt());
    assertThat(after.get("lateReleases").asInt()).isEqualTo(before.get("lateReleases").asInt() + 1);
    // The customer never sees these totals.
    assertThat(sync(customer).get("vendors").findValues("acceptedJobs")).isEmpty();

    // Once the admin assigns someone, the booking is no longer urgent; the history stays.
    JsonNode reassigned = post("/api/v1/admin/bookings/" + id + "/assign", admin, Map.of("vendorId", "ven_1")).getBody();
    assertThat(reassigned.has("urgent")).isFalse();
    assertThat(reassigned.get("releases")).hasSize(1);
  }

  @Test
  void onSiteProblemsAreReportedForTheAdminToDecide() {
    String admin = adminToken();
    String customer = customerToken(CUSTOMER_PHONE);
    String vendor = vendorToken(VENDOR_PHONE);
    finishOtherJobs(admin, vendor);
    String id = assignedJob(admin, customer);
    advance(vendor, id, null);
    // Nothing to report before arriving.
    assertThat(report(vendor, id, "cant_do", null, "Too far away").get("message").asText()).isEqualTo(ReleaseRules.ERR_ISSUE_STAGE);
    advance(vendor, id, null);
    advance(vendor, id, null); // arrived

    // At the door there is no release.
    assertThat(release(vendor, id, "unwell", null).get("message").asText()).isEqualTo(ReleaseRules.ERR_ON_SITE);
    assertThat(report(vendor, id, "customer_unavailable", null, null).get("message").asText()).isEqualTo(ReleaseRules.ERR_NOTE);
    assertThat(report(vendor, id, "cant_complete", "needs_part", null).get("message").asText()).isEqualTo(ReleaseRules.ERR_ISSUE_KIND);

    JsonNode reported = report(vendor, id, "customer_unavailable", null, "Nobody answered the door or the phone");
    assertThat(reported.get("status").asText()).isEqualTo("arrived"); // the job stays with the professional
    assertThat(reported.at("/issue/kind").asText()).isEqualTo("customer_unavailable");
    JsonNode asAdmin = booking(admin, id);
    assertThat(asAdmin.at("/issue/vendorName").asText()).isEqualTo("Ravi Patil");
    assertThat(asAdmin.at("/issue/note").asText()).isEqualTo("Nobody answered the door or the phone");
    assertThat(lastEvent(asAdmin).get("note").asText()).isEqualTo("Ravi Patil: Customer not available: Nobody answered the door or the phone");
    assertThat(booking(customer, id).has("issue")).isFalse();
    assertThat(sync(admin).get("notifications").findValuesAsText("kind")).contains("job_issue");

    // The admin settles it without moving the booking (the customer turned up).
    assertThat(post("/api/v1/admin/bookings/" + id + "/issue/resolve", admin, Map.of("note", "ok")).getBody().get("message").asText()).isEqualTo("Say what was decided");
    JsonNode resolved = post("/api/v1/admin/bookings/" + id + "/issue/resolve", admin, Map.of("note", "Customer is back home, go ahead")).getBody();
    assertThat(resolved.has("issue")).isFalse();
    assertThat(lastEvent(resolved).get("kind").asText()).isEqualTo("issue_resolved");
    assertThat(post("/api/v1/admin/bookings/" + id + "/issue/resolve", admin, Map.of("note", "Nothing to do")).getBody().get("message").asText()).isEqualTo(ReleaseRules.ERR_NO_ISSUE);

    // Once started: "can't complete" with a reason.
    String code = booking(customer, id).get("startCode").asText();
    assertThat(advance(vendor, id, code).get("status").asText()).isEqualTo("in_progress");
    assertThat(release(vendor, id, "unwell", null).get("message").asText()).isEqualTo(ReleaseRules.ERR_ON_SITE);
    assertThat(report(vendor, id, "cant_complete", null, null).get("message").asText()).isEqualTo(ReleaseRules.ERR_REASON);
    assertThat(report(vendor, id, "cant_complete", "other", null).get("message").asText()).isEqualTo(ReleaseRules.ERR_NOTE);
    JsonNode stuck = report(vendor, id, "cant_complete", "needs_part", "Capacitor not in stock");
    assertThat(stuck.get("status").asText()).isEqualTo("in_progress");
    assertThat(lastEvent(booking(admin, id)).get("note").asText()).isEqualTo("Ravi Patil: Can’t complete — Needs a part: Capacitor not in stock");

    // The admin arranges a return visit: same professional, new slot, back to "accepted".
    String day = LocalDate.now().plusDays(6).toString();
    JsonNode back = post("/api/v1/admin/bookings/" + id + "/return-visit", admin, Map.of("date", day, "slot", "11:00 AM")).getBody();
    assertThat(back.get("status").asText()).isEqualTo("accepted");
    assertThat(back.get("vendorId").asText()).isEqualTo("ven_1");
    assertThat(back.get("date").asText()).isEqualTo(day);
    assertThat(back.has("issue")).isFalse();
    assertThat(back.get("timeline").findValuesAsText("kind")).contains("issue_resolved", "rescheduled");
    assertThat(post("/api/v1/admin/bookings/" + id + "/return-visit", admin, Map.of("date", LocalDate.now().minusDays(1).toString(), "slot", "11:00 AM"))
        .getBody().get("message").asText()).isEqualTo("Please choose a future time slot");

    // Reports never count against the completion rate, and the job can still be done.
    assertThat(booking(vendor, id).get("status").asText()).isEqualTo("accepted");
  }

  @Test
  void cancellingOrContinuingClosesAnOpenReport() {
    String admin = adminToken();
    String customer = customerToken(CUSTOMER_PHONE);
    String vendor = vendorToken(VENDOR_PHONE);
    finishOtherJobs(admin, vendor);
    String id = assignedJob(admin, customer);
    advance(vendor, id, null);
    advance(vendor, id, null);
    advance(vendor, id, null);
    report(vendor, id, "cant_do", null, "Needs a licensed gas fitter");
    assertThat(booking(admin, id).has("issue")).isTrue();

    // The customer turns up after all: starting the job closes the report.
    String code = booking(customer, id).get("startCode").asText();
    JsonNode started = advance(vendor, id, code);
    assertThat(started.get("status").asText()).isEqualTo("in_progress");
    assertThat(started.has("issue")).isFalse();
    assertThat(booking(admin, id).get("timeline").findValuesAsText("kind")).contains("issue_resolved");

    // A new report, then support cancels the booking outright — only the customer or an admin can.
    report(vendor, id, "cant_complete", "safety", null);
    JsonNode cancelled = post("/api/v1/admin/bookings/" + id + "/status", admin, Map.of("status", "cancelled", "note", "Unsafe wiring, refunding")).getBody();
    assertThat(cancelled.get("status").asText()).isEqualTo("cancelled");
    assertThat(cancelled.has("issue")).isFalse();
  }
}
