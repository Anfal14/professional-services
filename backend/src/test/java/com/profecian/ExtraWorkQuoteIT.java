package com.profecian;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

/**
 * A quote for extra work on a normal (fixed-price) booking: the professional sends it on site, the
 * customer approves or declines, and the booked work is charged either way. Seed price: el-fan ₹249.
 */
class ExtraWorkQuoteIT extends IntegrationTestBase {

  /** A Solapur fan-repair booking assigned to the demo vendor, with the service started. */
  private String startedJob(String admin, String customer, String vendor) {
    // Only one job can be in progress at a time: clear the demo vendor's seeded ones, or another test's.
    for (JsonNode other : sync(vendor).get("bookings")) {
      if ("in_progress".equals(other.get("status").asText())) {
        post("/api/v1/admin/bookings/" + other.get("id").asText() + "/status", admin, Map.of("status", "cancelled", "note", "Cleared for a test"));
      }
    }
    JsonNode b = post("/api/v1/customer/checkout", customer, Map.of(
        "groups", List.of(Map.of("categoryId", "electrician", "problemTypeIds", List.of("el-fan"))),
        "date", LocalDate.now().plusDays(2).toString(),
        "slot", "01:00 PM",
        "address", Map.of("id", "adr_cus_1", "label", "Home", "line", "10, Lake View, Hotgi Road", "city", "Solapur"),
        "contactName", "Priya Sharma",
        "contactPhone", "9876500001")).getBody().get(0);
    String id = b.get("id").asText();
    post("/api/v1/admin/bookings/" + id + "/assign", admin, Map.of("vendorId", "ven_1"));
    advance(vendor, id); // accepted
    advance(vendor, id); // on the way
    advance(vendor, id); // arrived
    // At the door is still too early: the service has to be started first.
    assertThat(quote(vendor, id, "Replace regulator", 350).get("message").asText()).isEqualTo("Share a quote after you start the service");
    post("/api/v1/vendor/jobs/" + id + "/advance", vendor, Map.of("startCode", booking(customer, id).get("startCode").asText())); // in progress
    return id;
  }

  private JsonNode advance(String vendor, String id) {
    return post("/api/v1/vendor/jobs/" + id + "/advance", vendor, null).getBody();
  }

  private JsonNode quote(String vendor, String id, String item, int amount) {
    return post("/api/v1/vendor/jobs/" + id + "/quote", vendor,
        Map.of("lines", List.of(Map.of("description", item, "amount", amount)), "note", "Found while checking the fan")).getBody();
  }

  private JsonNode booking(String token, String id) {
    for (JsonNode b : sync(token).get("bookings")) if (b.get("id").asText().equals(id)) return b;
    return null;
  }

  @Test
  void anApprovedQuoteIsAddedToTheBookedWork() {
    String admin = adminToken();
    String customer = customerToken(CUSTOMER_PHONE);
    String vendor = vendorToken(VENDOR_PHONE);
    String id = startedJob(admin, customer, vendor);

    JsonNode quoted = quote(vendor, id, "Replace regulator", 350);
    assertThat(quoted.at("/inspection/kind").asText()).isEqualTo("extra_work");
    assertThat(quoted.at("/inspection/status").asText()).isEqualTo("quoted");
    assertThat(quoted.at("/inspection/fee").asInt()).isZero();
    assertThat(quoted.at("/inspection/quote/amount").decimalValue()).isEqualByComparingTo("350");
    // Nothing changes on the bill until the customer answers.
    assertThat(quoted.at("/price/serviceAmount").decimalValue()).isEqualByComparingTo("249");
    JsonNode last = quoted.get("timeline").get(quoted.get("timeline").size() - 1);
    assertThat(last.get("kind").asText()).isEqualTo("quote_shared");
    assertThat(last.get("note").asText()).isEqualTo("Extra work: 1 item, ₹350 + GST");
    assertThat(sync(customer).get("notifications").findValuesAsText("title")).contains("Quote for extra work");
    assertThat(sync(admin).get("notifications").findValuesAsText("title")).contains("Extra-work quote shared");

    // "No repair needed" belongs to "Not sure" visits, and a second quote has to wait for the answer.
    assertThat(post("/api/v1/vendor/jobs/" + id + "/no-work", vendor, Map.of("text", "Nothing else to do")).getBody().get("message").asText())
        .isEqualTo("This applies to “Not sure” visits only");
    assertThat(quote(vendor, id, "Another item", 100).get("message").asText()).isEqualTo("Share a quote after you start the service");

    JsonNode approved = post("/api/v1/customer/bookings/" + id + "/quote", customer, Map.of("approve", true)).getBody();
    assertThat(approved.at("/inspection/status").asText()).isEqualTo("approved");
    assertThat(approved.at("/price/serviceAmount").decimalValue()).isEqualByComparingTo("599"); // 249 booked + 350 extra
    assertThat(approved.at("/price/tax").decimalValue()).isEqualByComparingTo("108"); // 107.82
    assertThat(approved.at("/price/total").decimalValue()).isEqualByComparingTo("707");
    // The booking keeps the commission rate it was placed with.
    assertThat(approved.at("/price/commissionRate").decimalValue()).isEqualByComparingTo(quoted.at("/price/commissionRate").decimalValue());
    assertThat(booking(vendor, id).at("/price/vendorPayout").decimalValue()).isGreaterThan(quoted.at("/price/vendorPayout").decimalValue());
  }

  @Test
  void aDeclinedQuoteLeavesTheBookedPriceAndCanBeRevised() {
    String admin = adminToken();
    String customer = customerToken(CUSTOMER_PHONE);
    String vendor = vendorToken(VENDOR_PHONE);
    String id = startedJob(admin, customer, vendor);
    quote(vendor, id, "Rewire the switchboard", 1200);

    // Support can't mark it completed while the customer hasn't answered.
    assertThat(post("/api/v1/admin/bookings/" + id + "/status", admin, Map.of("status", "completed")).getBody().get("message").asText())
        .isEqualTo("The extra-work quote has no answer yet — record the customer’s answer first");

    JsonNode declined = post("/api/v1/customer/bookings/" + id + "/quote", customer, Map.of("approve", false)).getBody();
    assertThat(declined.at("/inspection/status").asText()).isEqualTo("declined");
    assertThat(declined.at("/price/serviceAmount").decimalValue()).isEqualByComparingTo("249");
    assertThat(declined.at("/price/total").decimalValue()).isEqualByComparingTo("294");

    // A revised (smaller) quote is allowed after a decline; support records the approval by phone.
    JsonNode revised = quote(vendor, id, "Replace the faulty switch only", 200);
    assertThat(revised.at("/inspection/status").asText()).isEqualTo("quoted");
    JsonNode ok = post("/api/v1/admin/bookings/" + id + "/quote", admin, Map.of("approve", true, "note", "Confirmed by phone")).getBody();
    assertThat(ok.getClass()).isNotNull();
    assertThat(booking(customer, id).at("/price/serviceAmount").decimalValue()).isEqualByComparingTo("449");
  }

  @Test
  void notSureBookingsAreUnchanged() {
    String customer = customerToken(CUSTOMER_PHONE);
    JsonNode b = post("/api/v1/customer/checkout", customer, Map.of(
        "groups", List.of(Map.of("categoryId", "ac-repair", "problemTypeIds", List.of(), "inspection", Map.of("description", "Water dripping from the indoor unit"))),
        "date", LocalDate.now().plusDays(2).toString(),
        "slot", "01:00 PM",
        "address", Map.of("id", "adr_cus_1", "label", "Home", "line", "10, Lake View, Hotgi Road", "city", "Solapur"),
        "contactName", "Priya Sharma",
        "contactPhone", "9876500001")).getBody().get(0);
    assertThat(b.at("/inspection/kind").asText()).isEqualTo("not_sure");
    assertThat(b.at("/inspection/fee").asInt()).isPositive();
    assertThat(post("/api/v1/customer/bookings/" + b.get("id").asText() + "/quote", customer, Map.of("approve", true)).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
  }
}
