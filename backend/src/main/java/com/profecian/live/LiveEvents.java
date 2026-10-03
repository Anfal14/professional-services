package com.profecian.live;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.profecian.bookings.Booking;
import java.util.LinkedHashSet;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * "Something changed for you" signals. Targets are collected during the transaction and
 * published to Redis only after commit (never for rolled-back work); every server relays them
 * to its own WebSocket clients ({@link LiveRelay}). Clients then re-sync their snapshot.
 */
@Component
public class LiveEvents {
  public static final String CHANNEL = "profecian:live";
  private static final Logger log = LoggerFactory.getLogger(LiveEvents.class);

  public record Event(String audience, String recipientId, String bookingId) {}

  private final StringRedisTemplate redis;
  private final ObjectMapper json;

  public LiveEvents(StringRedisTemplate redis, ObjectMapper json) {
    this.redis = redis;
    this.json = json;
  }

  /** `audience` customer | vendor | admin | public (everyone, e.g. catalogue changes). */
  public void notify(String audience, String recipientId, String bookingId) {
    Event e = new Event(audience, recipientId, bookingId);
    if (!TransactionSynchronizationManager.isSynchronizationActive()) {
      send(e);
      return;
    }
    @SuppressWarnings("unchecked")
    Set<Event> pending = (Set<Event>) TransactionSynchronizationManager.getResource(this);
    if (pending == null) {
      Set<Event> created = new LinkedHashSet<>();
      TransactionSynchronizationManager.bindResource(this, created);
      TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
        @Override
        public void afterCommit() {
          created.forEach(LiveEvents.this::send);
        }

        @Override
        public void afterCompletion(int status) {
          TransactionSynchronizationManager.unbindResourceIfPossible(LiveEvents.this);
        }
      });
      pending = created;
    }
    pending.add(e);
  }

  /** Everyone who can see this booking: its customer, its vendor (and a previous one), and admins. */
  public void bookingChanged(Booking b, String... previousVendorIds) {
    notify("customer", b.customerId, b.id);
    if (b.vendorId != null) notify("vendor", b.vendorId, b.id);
    for (String v : previousVendorIds) if (v != null) notify("vendor", v, b.id);
    notify("admin", "admin", b.id);
  }

  private void send(Event e) {
    try {
      redis.convertAndSend(CHANNEL, json.writeValueAsString(e));
    } catch (JsonProcessingException ex) {
      throw new IllegalStateException(ex);
    } catch (RuntimeException ex) {
      // Live updates are best-effort; clients also re-sync after their own actions.
      log.warn("Could not publish live event: {}", ex.getMessage());
    }
  }
}
