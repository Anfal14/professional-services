package com.profecian.payments;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.Instant;
import java.util.Map;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Gateway webhooks. The raw body must carry a valid HMAC-SHA256 signature; each event id is
 * processed once (webhook_events primary key), so provider retries are harmless.
 * Body (normalised): { "eventId", "type": "payment.captured" | "payment.failed", "providerRef", "reason"? }.
 */
@RestController
public class WebhookController {
  private final PaymentGateway gateway;
  private final PaymentAttempt.Repository attempts;
  private final PaymentService payments;
  private final EventRepo events;
  private final TransactionTemplate tx;
  private final ObjectMapper json;

  public WebhookController(PaymentGateway gateway, PaymentAttempt.Repository attempts, PaymentService payments, EventRepo events,
                           TransactionTemplate tx, ObjectMapper json) {
    this.gateway = gateway;
    this.attempts = attempts;
    this.payments = payments;
    this.events = events;
    this.tx = tx;
    this.json = json;
  }

  @Operation(summary = "Payment gateway webhook (signed)")
  @PostMapping("/api/v1/payments/webhook/{provider}")
  public ResponseEntity<Map<String, String>> receive(@PathVariable String provider, @RequestBody String body,
                                                     @RequestHeader(value = "X-Profecian-Signature", required = false) String signature,
                                                     @RequestHeader(value = "X-Razorpay-Signature", required = false) String razorpaySignature) {
    if (!gateway.name().equals(provider)) return ResponseEntity.status(404).body(Map.of("message", "Unknown provider"));
    String sig = signature != null ? signature : razorpaySignature;
    if (!gateway.verifyWebhook(body, sig)) return ResponseEntity.status(401).body(Map.of("message", "Invalid signature"));
    JsonNode e;
    try {
      e = json.readTree(body);
    } catch (Exception ex) {
      return ResponseEntity.badRequest().body(Map.of("message", "Invalid payload"));
    }
    String eventId = e.path("eventId").asText(null);
    String ref = e.path("providerRef").asText(null);
    if (eventId == null || ref == null) return ResponseEntity.badRequest().body(Map.of("message", "Invalid payload"));
    return tx.execute(s -> {
        // Atomic claim: a provider retry (or a concurrent delivery) of the same event is a no-op.
        if (events.claim(provider, eventId) == 0) return ResponseEntity.ok(Map.of("status", "duplicate"));
        var attempt = attempts.findByProviderAndProviderRef(provider, ref);
        if (attempt.isEmpty()) return ResponseEntity.ok(Map.of("status", "ignored"));
        String type = e.path("type").asText("");
        PaymentGateway.ChargeResult result = switch (type) {
          case "payment.captured" -> PaymentGateway.ChargeResult.ok(ref);
          case "payment.failed" -> new PaymentGateway.ChargeResult("failed", ref, e.path("reason").asText("Payment failed"));
          default -> null;
        };
        if (result == null) return ResponseEntity.ok(Map.of("status", "ignored"));
        payments.applyOutcome(attempt.get().id, result, attempt.get().method);
        return ResponseEntity.ok(Map.of("status", "processed"));
      });
  }

  public static class EventId implements Serializable {
    public String provider;
    public String eventId;

    @Override
    public boolean equals(Object o) {
      return o instanceof EventId e && java.util.Objects.equals(provider, e.provider) && java.util.Objects.equals(eventId, e.eventId);
    }

    @Override
    public int hashCode() {
      return java.util.Objects.hash(provider, eventId);
    }
  }

  @Entity
  @Table(name = "webhook_events")
  @IdClass(EventId.class)
  public static class Event {
    @Id
    public String provider;
    @Id
    @Column(name = "event_id")
    public String eventId;
    @Column(name = "received_at")
    public Instant receivedAt = Instant.now();
  }

  public interface EventRepo extends JpaRepository<Event, EventId> {
    /** 1 if this call recorded the event, 0 if it was already processed. */
    @Modifying
    @Query(value = "insert into webhook_events (provider, event_id) values (:provider, :eventId) on conflict do nothing", nativeQuery = true)
    int claim(@Param("provider") String provider, @Param("eventId") String eventId);
  }
}
