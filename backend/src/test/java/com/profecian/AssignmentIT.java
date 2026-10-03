package com.profecian;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.StreamSupport;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;

/** Vendor matching (PostGIS), assignment, reassignment and the vendor workflow. */
class AssignmentIT extends IntegrationTestBase {

  private String newPendingBooking(String categoryId, String problemId) {
    String token = customerToken(CUSTOMER_PHONE);
    JsonNode b = post("/api/v1/customer/bookings", token, Map.of(
        "categoryId", categoryId, "problemTypeIds", List.of(problemId),
        "date", LocalDate.now().plusDays(5).toString(), "slot", "11:00 AM",
        "address", Map.of("id", "adr_cus_1", "label", "Home", "line", "10, Lake View, Hotgi Road", "city", "Solapur"),
        "contactName", "Priya Sharma", "contactPhone", "9876500001")).getBody();
    return b.get("id").asText();
  }

  @Test
  void suggestsNearbyMatchingVendorsFirst() {
    String bookingId = newPendingBooking("electrician", "el-fan");
    String admin = adminToken();
    JsonNode suggestions = exchange(HttpMethod.GET, "/api/v1/admin/bookings/" + bookingId + "/suggestions", admin, null, null).getBody();

    assertThat(suggestions.size()).isGreaterThan(1);
    JsonNode best = suggestions.get(0);
    assertThat(best.get("matchesService").asBoolean()).isTrue();
    assertThat(best.get("available").asBoolean()).isTrue();
    assertThat(best.at("/vendor/city").asText()).isEqualTo("Solapur");
    // Sorted by score; only approved vendors are suggested.
    List<Double> scores = StreamSupport.stream(suggestions.spliterator(), false).map(s -> s.get("score").asDouble()).toList();
    assertThat(scores).isSorted();
    assertThat(StreamSupport.stream(suggestions.spliterator(), false).map(s -> s.at("/vendor/status").asText())).containsOnly("approved");
  }

  @Test
  void assignReassignAndVendorWorkflow() {
    String bookingId = newPendingBooking("electrician", "el-switch");
    String admin = adminToken();

    JsonNode assigned = post("/api/v1/admin/bookings/" + bookingId + "/assign", admin, Map.of("vendorId", "ven_1")).getBody();
    assertThat(assigned.get("status").asText()).isEqualTo("assigned");
    assertThat(assigned.get("vendorId").asText()).isEqualTo("ven_1");

    String vendor = vendorToken(VENDOR_PHONE);
    assertThat(sync(vendor).get("bookings").findValuesAsText("id")).contains(bookingId);
    JsonNode accepted = post("/api/v1/vendor/jobs/" + bookingId + "/advance", vendor, null).getBody();
    assertThat(accepted.get("status").asText()).isEqualTo("accepted");

    // Reassign to another approved electrician: the first vendor no longer sees the job.
    JsonNode re = post("/api/v1/admin/bookings/" + bookingId + "/assign", admin, Map.of("vendorId", "ven_5")).getBody();
    assertThat(re.get("vendorId").asText()).isEqualTo("ven_5");
    assertThat(re.get("timeline").findValuesAsText("kind")).contains("reassigned");
    assertThat(sync(vendor).get("bookings").findValuesAsText("id")).doesNotContain(bookingId);

    // ...and can no longer act on it.
    var forbidden = post("/api/v1/vendor/jobs/" + bookingId + "/advance", vendor, null);
    assertThat(forbidden.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    assertThat(forbidden.getBody().get("message").asText()).isEqualTo("This job is not assigned to you");
  }

  @Test
  void onlyApprovedVendorsAndRolePermissions() {
    String bookingId = newPendingBooking("plumber", "pl-tap");
    String admin = adminToken();
    var pending = post("/api/v1/admin/bookings/" + bookingId + "/assign", admin, Map.of("vendorId", "ven_10"));
    assertThat(pending.getBody().get("message").asText()).isEqualTo("Only approved vendors can be assigned");

    // Finance has no `bookings` permission.
    String finance = post("/api/v1/auth/admin/login", null, Map.of("email", "finance@profecian.app", "password", "Admin@123")).getBody().at("/tokens/accessToken").asText();
    assertThat(post("/api/v1/admin/bookings/" + bookingId + "/assign", finance, Map.of("vendorId", "ven_2")).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

    // Customers can't reach admin endpoints at all.
    assertThat(post("/api/v1/admin/bookings/" + bookingId + "/assign", customerToken(CUSTOMER_PHONE), Map.of("vendorId", "ven_2")).getStatusCode())
        .isEqualTo(HttpStatus.FORBIDDEN);
  }

  @Test
  void customerCancelRules() {
    String bookingId = newPendingBooking("electrician", "el-light");
    String customer = customerToken(CUSTOMER_PHONE);
    String admin = adminToken();
    post("/api/v1/admin/bookings/" + bookingId + "/assign", admin, Map.of("vendorId", "ven_1"));
    String vendor = vendorToken(VENDOR_PHONE);
    post("/api/v1/vendor/jobs/" + bookingId + "/advance", vendor, null); // accepted
    post("/api/v1/vendor/jobs/" + bookingId + "/advance", vendor, null); // on_the_way

    var res = post("/api/v1/customer/bookings/" + bookingId + "/cancel", customer, Map.of("reason", "Plans changed"));
    assertThat(res.getBody().get("message").asText()).isEqualTo("This booking can no longer be cancelled");
  }
}
