package com.profecian.notifications;

import java.util.List;

/**
 * A notification to create — the same fields as makeNotification() input in notify.ts.
 * `whatsappTo` is the phone that receives the WhatsApp message (customer or vendor).
 */
public record Draft(String audience, String recipientId, String kind, String title, String body, List<String> channels,
                    String bookingId, String whatsappTo, String whatsappText) {

  public static Draft of(String audience, String recipientId, String kind, String bookingId, String title, String body, List<String> channels) {
    return new Draft(audience, recipientId, kind, title, body, channels, bookingId, null, null);
  }

  public Draft whatsapp(String to) {
    return new Draft(audience, recipientId, kind, title, body, channels, bookingId, to, whatsappText);
  }

  public Draft whatsapp(String to, String text) {
    return new Draft(audience, recipientId, kind, title, body, channels, bookingId, to, text);
  }
}
