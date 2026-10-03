package com.profecian.notifications;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.profecian.config.AppProperties;
import com.profecian.customers.CustomerRepository;
import com.profecian.notifications.Providers.PushProvider;
import com.profecian.notifications.Providers.SmsProvider;
import com.profecian.notifications.Providers.WhatsAppProvider;
import com.profecian.vendors.VendorRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Delivers outbox rows. Each batch is claimed with SELECT … FOR UPDATE SKIP LOCKED inside one
 * transaction, so several servers can run this concurrently. Failures retry with exponential
 * backoff (30s, 1m, 2m, …) and become "dead" after `max-attempts`.
 */
@Component
public class OutboxWorker {
  private static final Logger log = LoggerFactory.getLogger(OutboxWorker.class);

  private final OutboxMessage.Repository outbox;
  private final PushProvider push;
  private final WhatsAppProvider whatsapp;
  private final SmsProvider sms;
  private final CustomerRepository customers;
  private final VendorRepository vendors;
  private final TransactionTemplate tx;
  private final AppProperties props;
  private final ObjectMapper json;
  private final Clock clock;

  public OutboxWorker(OutboxMessage.Repository outbox, PushProvider push, WhatsAppProvider whatsapp, SmsProvider sms, CustomerRepository customers,
                      VendorRepository vendors, TransactionTemplate tx, AppProperties props, ObjectMapper json, Clock clock) {
    this.outbox = outbox;
    this.push = push;
    this.whatsapp = whatsapp;
    this.sms = sms;
    this.customers = customers;
    this.vendors = vendors;
    this.tx = tx;
    this.props = props;
    this.json = json;
    this.clock = clock;
  }

  @Scheduled(fixedDelayString = "${profecian.outbox.poll-interval-ms:2000}")
  public void poll() {
    try {
      Integer handled;
      do {
        handled = tx.execute(status -> deliverBatch());
      } while (handled != null && handled == props.outbox().batchSize());
    } catch (RuntimeException e) {
      log.warn("Outbox poll failed: {}", e.getMessage());
    }
  }

  /** Delivers one claimed batch; returns how many rows were handled. Public for tests. */
  public int deliverBatch() {
    List<OutboxMessage> due = outbox.claimDue(props.outbox().batchSize());
    for (OutboxMessage m : due) {
      try {
        deliver(m);
        m.status = "sent";
        m.sentAt = clock.instant();
        m.lastError = null;
      } catch (RuntimeException e) {
        m.attempts += 1;
        m.lastError = e.getMessage();
        if (m.attempts >= props.outbox().maxAttempts()) {
          m.status = "dead";
          log.error("Outbox message {} ({}) dead-lettered after {} attempts: {}", m.id, m.channel, m.attempts, e.getMessage());
        } else {
          m.nextAttemptAt = clock.instant().plus(backoff(m.attempts));
        }
      }
    }
    return due.size();
  }

  static Duration backoff(int attempts) {
    return Duration.ofSeconds(30L << Math.min(attempts - 1, 10));
  }

  private void deliver(OutboxMessage m) {
    JsonNode p;
    try {
      p = json.readTree(m.payload);
    } catch (Exception e) {
      throw new IllegalStateException("Unreadable payload");
    }
    switch (m.channel) {
      case "push" -> push.send(m.destination, p.path("title").asText(), p.path("body").asText());
      case "whatsapp" -> whatsapp.send(m.destination, p.path("text").asText());
      case "sms" -> sms.send(phoneFor(m.destination), p.path("text").asText());
      default -> throw new IllegalStateException("Unknown channel " + m.channel);
    }
  }

  private String phoneFor(String destination) {
    String[] parts = destination.split(":", 2);
    if (parts.length < 2) return destination;
    return switch (parts[0]) {
      case "vendor" -> vendors.findById(parts[1]).map(v -> v.phone).orElseThrow(() -> new IllegalStateException("Vendor not found"));
      case "customer" -> customers.findById(parts[1]).map(c -> c.phone).orElseThrow(() -> new IllegalStateException("Customer not found"));
      default -> throw new IllegalStateException("No phone for " + destination);
    };
  }

  /** Visible for monitoring/tests. */
  public Instant now() {
    return clock.instant();
  }
}
