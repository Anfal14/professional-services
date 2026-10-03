package com.profecian.bookings;

import com.profecian.common.ApiException;
import com.profecian.notifications.NotifyFor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** askCustomer and settleQuote from mock.ts — used by vendor and admin (ask) and customer and admin (settle). */
@Component
public class InspectionActions {
  private final BookingCore core;
  private final NotifyFor notify;

  public InspectionActions(BookingCore core, NotifyFor notify) {
    this.core = core;
    this.notify = notify;
  }

  @Transactional(propagation = Propagation.MANDATORY)
  public Booking askCustomer(Booking b, String from, String authorName, String question) {
    Inspection i = core.openInspection(b);
    String text = question == null ? "" : question.trim();
    if (text.length() < 5) throw ApiException.bad("Write a short question for the customer");
    core.addMessage(i, from, authorName, text);
    i.awaitingCustomer = true;
    core.event(b, "clarification_requested", from, text);
    return core.commit(b, notify.clarificationRequested(b, authorName, text));
  }

  @Transactional(propagation = Propagation.MANDATORY)
  public Booking settleQuote(Booking b, boolean approve, String by, String note) {
    Inspection i = core.openInspection(b);
    if (!"quoted".equals(i.status) || !i.hasQuote()) throw ApiException.bad("There is no quote waiting for an answer");
    i.quoteRespondedAt = core.clock().instant();
    i.quoteRespondedBy = by;
    i.status = approve ? "approved" : "declined";
    core.reprice(b);
    core.event(b, approve ? "quote_approved" : "quote_declined", by, note == null || note.isBlank() ? null : note.trim());
    return core.commit(b, notify.quoteResponse(b, approve));
  }
}
