package com.profecian.notifications;

import static com.profecian.common.Formats.date;
import static com.profecian.common.Formats.inr;

import com.profecian.bookings.Booking;
import com.profecian.bookings.BookingLabels;
import com.profecian.vendors.Vendor;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * Which notification goes to whom on each event — a line-by-line port of `notifyFor` in
 * packages/shared/src/notify.ts. Keep the two in sync.
 */
@Component
public class NotifyFor {
  private static final List<String> WA_PUSH = List.of("whatsapp", "push");
  private static final List<String> PUSH = List.of("push");
  private static final List<String> IN_APP = List.of("in_app");

  private final BookingLabels labels;

  public NotifyFor(BookingLabels labels) {
    this.labels = labels;
  }

  /** WhatsApp booking acknowledgement sent to the customer right after booking (bookingAckText). */
  public String bookingAckText(Booking b) {
    String first = b.customerName.split(" ")[0];
    String money = b.inspection != null
        ? "💰 " + inr(b.total) + " inspection visit (incl. GST) — the professional quotes before any repair"
        : "💰 " + inr(b.total) + " (incl. GST)";
    return String.join("\n",
        "Hi " + first + "! 👋",
        "Your Profecian booking is confirmed ✅",
        "",
        "🆔 Booking ID: " + b.code,
        "🛠️ " + labels.service(b) + " – " + labels.problem(b),
        "📅 " + date(b.date) + " at " + b.slot,
        "📍 " + b.addressLine + (b.addressLandmark != null ? " (Near " + b.addressLandmark + ")" : "") + ", " + b.addressCity,
        money,
        "",
        "We'll share your professional's details as soon as one is assigned.");
  }

  public List<Draft> bookingCreated(Booking b) {
    String service = labels.service(b);
    return List.of(
        Draft.of("customer", b.customerId, "booking_confirmed", b.id, "Booking confirmed",
            service + " on " + date(b.date) + ", " + b.slot + ". ID " + b.code + ".", WA_PUSH).whatsapp(b.customerPhone, bookingAckText(b)),
        Draft.of("admin", "admin", "new_booking", b.id, "New booking",
            b.code + " · " + service + " in " + b.addressCity + " — needs a professional.", IN_APP));
  }

  public List<Draft> vendorAssigned(Booking b, Vendor v) {
    String service = labels.service(b);
    return List.of(
        Draft.of("customer", b.customerId, "vendor_assigned", b.id, "Professional assigned",
            v.name + " (★ " + rating(v.rating) + ") will handle your " + service + " booking " + b.code + ".", WA_PUSH).whatsapp(b.customerPhone),
        Draft.of("vendor", v.id, "new_assignment", b.id, "New job assigned",
            service + " – " + labels.problem(b) + " · " + date(b.date) + ", " + b.slot + " · " + b.addressCity + ". Earn " + inr(b.vendorPayout) + ".",
            List.of("push", "whatsapp")).whatsapp(v.phone));
  }

  public List<Draft> vendorOnTheWay(Booking b, Vendor v) {
    return List.of(Draft.of("customer", b.customerId, "vendor_on_the_way", b.id, "Professional on the way",
        v.name + " is heading to your address for booking " + b.code + ".", WA_PUSH).whatsapp(b.customerPhone));
  }

  public List<Draft> serviceCompleted(Booking b) {
    return List.of(Draft.of("customer", b.customerId, "service_completed", b.id, "Service completed",
        "Your " + labels.service(b) + " job " + b.code + " is done. Amount due " + inr(b.total) + ". Please rate your professional.", WA_PUSH)
        .whatsapp(b.customerPhone));
  }

  public List<Draft> paymentReceived(Booking b) {
    List<Draft> out = new ArrayList<>();
    out.add(Draft.of("customer", b.customerId, "payment_received", b.id, "Payment received",
        "We received " + inr(b.total) + " for booking " + b.code + ". Your invoice is ready.", WA_PUSH).whatsapp(b.customerPhone));
    if (b.vendorId != null && !"cash".equals(b.paymentMethod)) {
      out.add(Draft.of("vendor", b.vendorId, "payout_credited", b.id, "Earnings added to wallet",
          inr(b.vendorPayout) + " for " + b.code + " (after " + b.commissionRate.movePointRight(2).setScale(0, java.math.RoundingMode.HALF_UP) + "% commission).", PUSH));
    }
    return out;
  }

  public List<Draft> paymentFailed(Booking b, String reason) {
    return List.of(Draft.of("admin", "admin", "payment_failed", b.id, "Payment failed", b.code + ": " + reason + ".", IN_APP));
  }

  public List<Draft> cancelled(Booking b, String by) {
    List<Draft> out = new ArrayList<>();
    out.add(Draft.of("customer", b.customerId, "booking_cancelled", b.id, "Booking cancelled",
        "Booking " + b.code + " was cancelled" + ("customer".equals(by) ? "" : " by Profecian support") + ".", WA_PUSH).whatsapp(b.customerPhone));
    if (b.vendorId != null) out.add(Draft.of("vendor", b.vendorId, "booking_cancelled", b.id, "Job cancelled", "Booking " + b.code + " was cancelled.", PUSH));
    return out;
  }

  public List<Draft> rescheduled(Booking b) {
    List<Draft> out = new ArrayList<>();
    out.add(Draft.of("customer", b.customerId, "booking_rescheduled", b.id, "Booking rescheduled",
        b.code + " is now on " + date(b.date) + ", " + b.slot + ".", WA_PUSH).whatsapp(b.customerPhone));
    if (b.vendorId != null) out.add(Draft.of("vendor", b.vendorId, "booking_rescheduled", b.id, "Job rescheduled",
        b.code + " moved to " + date(b.date) + ", " + b.slot + ".", PUSH));
    return out;
  }

  public List<Draft> jobReminder(Booking b) {
    if (b.vendorId == null) return List.of();
    return List.of(Draft.of("vendor", b.vendorId, "job_reminder", b.id, "Upcoming job reminder",
        labels.service(b) + " for " + b.customerName + " at " + b.slot + " today.", PUSH));
  }

  public List<Draft> payoutSettled(String vendorId, BigDecimal amount, String utr) {
    return List.of(Draft.of("vendor", vendorId, "payout_credited", null, "Payout credited",
        inr(amount) + " sent to your bank account. UTR " + utr + ".", List.of("push", "sms")));
  }

  public List<Draft> vendorSubmitted(Vendor v) {
    return List.of(Draft.of("admin", "admin", "vendor_pending_approval", null, "Vendor pending approval",
        v.name + " (" + v.city + ") submitted KYC documents for review.", IN_APP));
  }

  public List<Draft> clarificationRequested(Booking b, String askedBy, String question) {
    return List.of(Draft.of("customer", b.customerId, "clarification_requested", b.id, "Question about your booking",
        askedBy + " asks: “" + question + "” — reply in the app (" + b.code + ").", WA_PUSH).whatsapp(b.customerPhone));
  }

  public List<Draft> clarificationAnswered(Booking b, String answer) {
    List<Draft> out = new ArrayList<>();
    out.add(Draft.of("admin", "admin", "clarification_answered", b.id, "Customer replied", b.code + ": “" + answer + "”", IN_APP));
    if (b.vendorId != null) out.add(Draft.of("vendor", b.vendorId, "clarification_answered", b.id, "Customer replied", b.code + ": “" + answer + "”", PUSH));
    return out;
  }

  public List<Draft> quoteShared(Booking b) {
    BigDecimal amount = b.inspection != null && b.inspection.quoteAmount != null ? b.inspection.quoteAmount : BigDecimal.ZERO;
    return List.of(
        Draft.of("customer", b.customerId, "quote_shared", b.id, "Repair quote ready",
            labels.service(b) + " (" + b.code + "): " + inr(amount) + " + GST. Approve or decline in the app before any work starts.", WA_PUSH)
            .whatsapp(b.customerPhone),
        Draft.of("admin", "admin", "quote_shared", b.id, "Quote shared", b.code + ": " + inr(amount) + " + GST, awaiting customer.", IN_APP));
  }

  public List<Draft> quoteResponse(Booking b, boolean approved) {
    String verdict = approved ? "approved" : "declined";
    List<Draft> out = new ArrayList<>();
    out.add(Draft.of("admin", "admin", "quote_response", b.id, "Quote " + verdict, b.code + ": customer " + verdict + " the repair quote.", IN_APP));
    if (b.vendorId != null) {
      out.add(Draft.of("vendor", b.vendorId, "quote_response", b.id, "Quote " + verdict,
          approved ? b.code + ": go ahead with the repair." : b.code + ": complete the visit for the inspection fee, or share a revised quote.", PUSH));
    }
    return out;
  }

  public List<Draft> complaint(Booking b, String subject) {
    return List.of(Draft.of("admin", "admin", "new_complaint", b.id, "New complaint", b.code + ": " + subject, IN_APP));
  }

  /** `v.rating || 'New'` — JS prints 4.5 → "4.5", 5 → "5". */
  static String rating(BigDecimal rating) {
    if (rating == null || rating.signum() == 0) return "New";
    return rating.stripTrailingZeros().toPlainString();
  }
}
