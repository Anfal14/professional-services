package com.profecian.notifications;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.profecian.common.Formats;
import com.profecian.common.Ids;
import com.profecian.common.Phones;
import com.profecian.live.LiveEvents;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Stores notifications and their outbox rows inside the caller's transaction, so a business
 * change and the messages it triggers commit (or roll back) together.
 */
@Service
public class NotificationService {
  private final Notification.Repository notifications;
  private final OutboxMessage.Repository outbox;
  private final LiveEvents live;
  private final ObjectMapper json;

  public NotificationService(Notification.Repository notifications, OutboxMessage.Repository outbox, LiveEvents live, ObjectMapper json) {
    this.notifications = notifications;
    this.outbox = outbox;
    this.live = live;
    this.json = json;
  }

  @Transactional(propagation = Propagation.MANDATORY)
  public void publish(List<Draft> drafts) {
    for (Draft d : drafts) {
      Notification n = new Notification();
      n.id = Ids.newId("ntf");
      n.audience = d.audience();
      n.recipientId = d.recipientId();
      n.kind = d.kind();
      n.title = d.title();
      n.body = d.body();
      n.channels = String.join(",", d.channels());
      n.bookingId = d.bookingId();
      String whatsappText = d.whatsappText() != null ? d.whatsappText() : d.title() + "\n\n" + d.body();
      if (d.channels().contains("whatsapp") && d.whatsappTo() != null) {
        n.whatsappUrl = Formats.whatsappLink(Phones.normalize(d.whatsappTo()), whatsappText);
      }
      notifications.save(n);

      for (String channel : d.channels()) {
        switch (channel) {
          case "push" -> enqueue(n, "push", d.audience() + ":" + d.recipientId(), Map.of("title", d.title(), "body", d.body()));
          case "whatsapp" -> {
            if (d.whatsappTo() != null) enqueue(n, "whatsapp", Phones.normalize(d.whatsappTo()), Map.of("text", whatsappText));
          }
          case "sms" -> {
            // Recipients are addressed by id; the worker resolves the phone number at send time.
            enqueue(n, "sms", d.audience() + ":" + d.recipientId(), Map.of("text", d.title() + ": " + d.body()));
          }
          default -> { } // in_app: the row above is the delivery
        }
      }
      live.notify(d.audience(), d.recipientId(), d.bookingId());
    }
  }

  private void enqueue(Notification n, String channel, String destination, Map<String, String> payload) {
    OutboxMessage m = new OutboxMessage();
    m.notificationId = n.id;
    m.channel = channel;
    m.destination = destination;
    try {
      m.payload = json.writeValueAsString(payload);
    } catch (JsonProcessingException e) {
      throw new IllegalStateException(e);
    }
    outbox.save(m);
  }

  @Transactional
  public void markRead(String audience, String recipientId, List<String> ids) {
    boolean all = ids == null;
    notifications.markRead(audience, recipientId, all, all || ids.isEmpty() ? List.of("-") : ids);
    live.notify(audience, recipientId, null);
  }
}
