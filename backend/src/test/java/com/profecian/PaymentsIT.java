package com.profecian;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.profecian.notifications.OutboxMessage;
import com.profecian.notifications.OutboxWorker;
import com.profecian.payments.LedgerEntry;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.transaction.support.TransactionTemplate;

/** Online payments (sandbox gateway), idempotency, webhooks, ledger and outbox delivery. */
class PaymentsIT extends IntegrationTestBase {
  @Autowired
  LedgerEntry.Repository ledger;

  @Autowired
  OutboxMessage.Repository outbox;

  @Autowired
  OutboxWorker worker;

  @Autowired
  TransactionTemplate tx;

  private String newBooking(String token) {
    return post("/api/v1/customer/bookings", token, Map.of(
        "categoryId", "plumber", "problemTypeIds", List.of("pl-block"),
        "date", LocalDate.now().plusDays(2).toString(), "slot", "05:00 PM",
        "address", Map.of("id", "adr_cus_1", "label", "Home", "line", "10, Lake View, Hotgi Road", "city", "Solapur"),
        "contactName", "Priya Sharma", "contactPhone", "9876500001")).getBody().get("id").asText();
  }

  private JsonNode pay(String token, String bookingId, boolean fail, String key) {
    HttpHeaders h = new HttpHeaders();
    if (key != null) h.add("Idempotency-Key", key);
    return exchange(HttpMethod.POST, "/api/v1/customer/bookings/" + bookingId + "/pay", token, Map.of("method", "upi", "simulateFailure", fail), h).getBody();
  }

  @Test
  void failedThenSuccessfulPaymentWithIdempotencyAndLedger() {
    String token = customerToken(CUSTOMER_PHONE);
    String bookingId = newBooking(token);

    JsonNode failed = pay(token, bookingId, true, null);
    assertThat(failed.get("message").asText()).isEqualTo("Payment declined by bank (sandbox)");
    JsonNode afterFail = findBooking(sync(token), bookingId);
    assertThat(afterFail.at("/payment/status").asText()).isEqualTo("failed");
    assertThat(afterFail.get("timeline").findValuesAsText("kind")).contains("payment_failed");

    long ledgerBefore = ledger.count();
    JsonNode paid = pay(token, bookingId, false, "pay-key-1");
    assertThat(paid.at("/payment/status").asText()).isEqualTo("paid");
    String txn = paid.at("/payment/txnId").asText();
    assertThat(txn).startsWith("pay_");

    // Same key, same body → same response, no second charge.
    JsonNode replay = pay(token, bookingId, false, "pay-key-1");
    assertThat(replay.at("/payment/txnId").asText()).isEqualTo(txn);
    // A new attempt is refused.
    assertThat(pay(token, bookingId, false, "pay-key-2").get("message").asText()).isEqualTo("This booking is already paid");
    // customer_payment + platform_commission (+ vendor_earning once a vendor is assigned)
    assertThat(ledger.count()).isGreaterThanOrEqualTo(ledgerBefore + 2);
  }

  @Test
  void webhookRequiresSignatureAndIsIdempotent() {
    String body = "{\"eventId\":\"evt_test_1\",\"type\":\"payment.captured\",\"providerRef\":\"unknown_ref\"}";
    var bad = webhook(body, "deadbeef");
    assertThat(bad.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);

    String sig = hmac("dev-webhook-secret", body);
    assertThat(webhook(body, sig).getBody().get("status").asText()).isEqualTo("ignored");
    assertThat(webhook(body, sig).getBody().get("status").asText()).isEqualTo("duplicate");
  }

  @Test
  void outboxWorkerDeliversPendingMessages() {
    String token = customerToken(CUSTOMER_PHONE);
    newBooking(token);
    assertThat(outbox.countByStatus("pending")).isPositive();
    int handled;
    do {
      handled = tx.execute(s -> worker.deliverBatch());
    } while (handled > 0);
    assertThat(outbox.countByStatus("pending")).isZero();
    assertThat(outbox.countByStatus("sent")).isPositive();
  }

  private org.springframework.http.ResponseEntity<JsonNode> webhook(String body, String signature) {
    HttpHeaders h = new HttpHeaders();
    h.setContentType(MediaType.APPLICATION_JSON);
    h.add("X-Profecian-Signature", signature);
    return http.exchange("/api/v1/payments/webhook/sandbox", HttpMethod.POST, new HttpEntity<>(body, h), JsonNode.class);
  }

  private static JsonNode findBooking(JsonNode snapshot, String id) {
    for (JsonNode b : snapshot.get("bookings")) if (b.get("id").asText().equals(id)) return b;
    throw new AssertionError("booking not in snapshot: " + id);
  }

  private static String hmac(String secret, String payload) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
      return HexFormat.of().formatHex(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }
}
