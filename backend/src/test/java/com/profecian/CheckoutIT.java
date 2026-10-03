package com.profecian;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.profecian.notifications.OutboxMessage;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/** Cart checkout: one booking per service, all in one transaction. */
class CheckoutIT extends IntegrationTestBase {
  @Autowired
  OutboxMessage.Repository outbox;

  private Map<String, Object> checkout(List<Map<String, Object>> groups) {
    return Map.of(
        "groups", groups,
        "date", LocalDate.now().plusDays(3).toString(),
        "slot", "10:00 AM",
        "address", Map.of("id", "adr_cus_1", "label", "Home", "line", "10, Lake View, Hotgi Road", "city", "Solapur"),
        "contactName", "Priya Sharma",
        "contactPhone", "9876500001");
  }

  @Test
  void createsOneBookingPerServiceWithSharedSlotAndAddress() {
    String token = customerToken(CUSTOMER_PHONE);
    long outboxBefore = outbox.count();
    ResponseEntity<JsonNode> res = post("/api/v1/customer/checkout", token, checkout(List.of(
        Map.of("categoryId", "electrician", "problemTypeIds", List.of("el-fan", "el-switch")),
        Map.of("categoryId", "plumber", "problemTypeIds", List.of("pl-tap")))));

    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
    JsonNode bookings = res.getBody();
    assertThat(bookings).hasSize(2);
    JsonNode electric = bookings.get(0);
    assertThat(electric.get("categoryId").asText()).isEqualTo("electrician");
    assertThat(electric.get("items")).hasSize(2);
    assertThat(electric.at("/price/serviceAmount").decimalValue()).isEqualByComparingTo("398");
    assertThat(electric.at("/price/total").decimalValue()).isEqualByComparingTo("470"); // 398 + 72 GST
    assertThat(electric.get("status").asText()).isEqualTo("pending_assignment");
    assertThat(bookings.get(1).at("/price/total").decimalValue()).isEqualByComparingTo("211"); // 179 + 32
    assertThat(bookings.get(1).at("/address/id").asText()).isEqualTo(electric.at("/address/id").asText());
    assertThat(bookings.get(1).get("slot").asText()).isEqualTo("10:00 AM");
    // Customer WhatsApp + push per booking went to the outbox in the same transaction.
    assertThat(outbox.count()).isGreaterThanOrEqualTo(outboxBefore + 4);

    JsonNode snapshot = sync(token);
    List<String> ids = snapshot.get("bookings").findValuesAsText("id");
    assertThat(ids).contains(electric.get("id").asText(), bookings.get(1).get("id").asText());
  }

  @Test
  void isAllOrNothing() {
    String token = customerToken(CUSTOMER_PHONE);
    int before = sync(token).get("bookings").size();
    ResponseEntity<JsonNode> res = post("/api/v1/customer/checkout", token, checkout(List.of(
        Map.of("categoryId", "electrician", "problemTypeIds", List.of("el-fan")),
        Map.of("categoryId", "plumber", "problemTypeIds", List.of("el-fan"))))); // wrong category

    assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    assertThat(res.getBody().get("message").asText()).isEqualTo("This service is currently unavailable");
    assertThat(sync(token).get("bookings").size()).isEqualTo(before);
  }

  @Test
  void notSureNeedsADescriptionAndKeepsTheCategory() {
    String token = customerToken(CUSTOMER_PHONE);
    ResponseEntity<JsonNode> tooShort = post("/api/v1/customer/checkout", token, checkout(List.of(
        Map.of("categoryId", "ac-repair", "problemTypeIds", List.of(), "inspection", Map.of("description", "broken")))));
    assertThat(tooShort.getBody().get("message").asText()).isEqualTo("Describe the problem in a few words (at least 15 characters)");

    ResponseEntity<JsonNode> ok = post("/api/v1/customer/checkout", token, checkout(List.of(
        Map.of("categoryId", "ac-repair", "problemTypeIds", List.of(), "inspection", Map.of("description", "Water dripping from the indoor unit")))));
    JsonNode b = ok.getBody().get(0);
    assertThat(b.get("categoryId").asText()).isEqualTo("ac-repair");
    assertThat(b.has("problemTypeId")).isFalse();
    assertThat(b.at("/inspection/status").asText()).isEqualTo("pending");
    assertThat(b.at("/price/serviceAmount").decimalValue()).isEqualByComparingTo("199");
  }

  @Test
  void rejectsPastSlots() {
    String token = customerToken(CUSTOMER_PHONE);
    Map<String, Object> body = new java.util.HashMap<>(checkout(List.of(Map.of("categoryId", "electrician", "problemTypeIds", List.of("el-fan")))));
    body.put("date", LocalDate.now().minusDays(1).toString());
    assertThat(post("/api/v1/customer/checkout", token, body).getBody().get("message").asText()).isEqualTo("Please choose a future time slot");
  }
}
