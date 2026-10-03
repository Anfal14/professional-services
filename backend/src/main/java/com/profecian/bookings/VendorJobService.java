package com.profecian.bookings;

import com.profecian.auth.CurrentUser;
import com.profecian.common.ApiException;
import com.profecian.files.FileRefs;
import com.profecian.notifications.Draft;
import com.profecian.notifications.NotifyFor;
import com.profecian.payments.LedgerService;
import com.profecian.sync.Api;
import com.profecian.sync.ApiMapper;
import com.profecian.vendors.Vendor;
import com.profecian.vendors.VendorService;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** A professional's job workflow — the job actions of the `vendor` group in mock.ts. */
@Service
public class VendorJobService {
  private final BookingCore core;
  private final InspectionActions inspections;
  private final VendorService vendors;
  private final NotifyFor notify;
  private final LedgerService ledger;
  private final FileRefs files;
  private final ApiMapper mapper;

  public VendorJobService(BookingCore core, InspectionActions inspections, VendorService vendors, NotifyFor notify, LedgerService ledger,
                          FileRefs files, ApiMapper mapper) {
    this.core = core;
    this.inspections = inspections;
    this.vendors = vendors;
    this.notify = notify;
    this.ledger = ledger;
    this.files = files;
    this.mapper = mapper;
  }

  private Booking mine(CurrentUser user, String bookingId) {
    Booking b = core.load(bookingId);
    if (!user.id().equals(b.vendorId)) throw ApiException.forbidden("This job is not assigned to you");
    return b;
  }

  /** Accept → on the way → arrived → in progress → completed. */
  @Transactional
  public Api.Booking advance(CurrentUser user, String bookingId) {
    Booking b = mine(user, bookingId);
    String next = BookingRules.vendorNext(b.status).orElseThrow(() -> ApiException.bad("No further action for this job"));
    if (BookingRules.COMPLETED.equals(next) && BookingCore.isQuoteOpen(b)) {
      throw ApiException.bad("quoted".equals(b.inspection.status)
          ? "Wait for the customer to approve or decline your quote before completing"
          : "Share a quote, or mark that no repair is needed, before completing");
    }
    Vendor v = vendors.get(user.id());
    core.moveTo(b, next, BookingCore.Actor.vendor, null);
    List<Draft> drafts = BookingRules.ON_THE_WAY.equals(next) ? notify.vendorOnTheWay(b, v)
        : BookingRules.COMPLETED.equals(next) ? notify.serviceCompleted(b) : List.of();
    if (BookingRules.COMPLETED.equals(next)) v.jobsCompleted += 1;
    return mapper.booking(core.commit(b, drafts));
  }

  @Transactional
  public Api.Booking askClarification(CurrentUser user, String bookingId, String question) {
    Booking b = mine(user, bookingId);
    return mapper.booking(inspections.askCustomer(b, "vendor", vendors.get(user.id()).name, question));
  }

  public record QuoteLineInput(String description, BigDecimal amount) {}

  /** After inspecting: an itemised quote the customer must approve before the repair starts. */
  @Transactional
  public Api.Booking shareQuote(CurrentUser user, String bookingId, List<QuoteLineInput> lines, String note) {
    Booking b = mine(user, bookingId);
    Inspection i = core.openInspection(b);
    if (!BookingCore.canQuote(b)) throw ApiException.bad("Share a quote after you arrive and inspect");
    List<Inspection.QuoteLine> clean = new ArrayList<>();
    for (QuoteLineInput l : lines == null ? List.<QuoteLineInput>of() : lines) {
      String d = l.description() == null ? "" : l.description().trim();
      BigDecimal a = l.amount() == null ? BigDecimal.ZERO : l.amount().setScale(0, java.math.RoundingMode.HALF_UP);
      if (d.isEmpty() && a.signum() == 0) continue;
      clean.add(new Inspection.QuoteLine(d, a));
    }
    if (clean.isEmpty()) throw ApiException.bad("Add at least one item to the quote");
    if (clean.size() > 10) throw ApiException.bad("Keep the quote to 10 items or fewer");
    if (clean.stream().anyMatch(l -> l.description.length() < 3)) throw ApiException.bad("Describe each item of the quote");
    if (clean.stream().anyMatch(l -> l.amount.signum() <= 0 || l.amount.compareTo(BigDecimal.valueOf(500_000)) > 0)) throw ApiException.bad("Enter a valid amount for each item");
    BigDecimal amount = clean.stream().map(l -> l.amount).reduce(BigDecimal.ZERO, BigDecimal::add);
    i.quoteLines.clear();
    i.quoteLines.addAll(clean);
    i.quoteAmount = amount;
    i.quoteNote = note == null || note.isBlank() ? null : note.trim();
    i.quoteVendorId = user.id();
    i.quoteCreatedAt = core.clock().instant();
    i.quoteRespondedAt = null;
    i.quoteRespondedBy = null;
    i.status = "quoted";
    core.event(b, "quote_shared", "vendor", clean.size() + " item" + (clean.size() > 1 ? "s" : "") + ", ₹" + amount.toPlainString() + " + GST");
    return mapper.booking(core.commit(b, notify.quoteShared(b)));
  }

  @Transactional
  public Api.Booking markNoWorkNeeded(CurrentUser user, String bookingId, String note) {
    Booking b = mine(user, bookingId);
    Inspection i = core.openInspection(b);
    if (!BookingCore.canQuote(b)) throw ApiException.bad("Inspect on site first");
    String text = note == null ? "" : note.trim();
    if (text.length() < 5) throw ApiException.bad("Tell the customer what you found");
    i.status = "no_work_needed";
    i.noWorkNote = text;
    i.clearQuote();
    core.reprice(b);
    core.event(b, "no_work_needed", "vendor", text);
    return mapper.booking(core.commit(b, List.of()));
  }

  /** Decline an assigned job — it goes back to the admin queue. */
  @Transactional
  public Api.Booking decline(CurrentUser user, String bookingId, String reason) {
    Booking b = core.load(bookingId);
    if (!user.id().equals(b.vendorId) || !BookingRules.ASSIGNED.equals(b.status)) throw ApiException.bad("Only newly assigned jobs can be declined");
    String previous = b.vendorId;
    b.status = BookingRules.PENDING_ASSIGNMENT;
    b.vendorId = null;
    core.event(b, BookingRules.PENDING_ASSIGNMENT, "vendor", "Declined: " + reason);
    List<Draft> adminOnly = notify.bookingCreated(b).stream().filter(d -> "admin".equals(d.audience())).toList();
    return mapper.booking(core.commit(b, adminOnly, previous));
  }

  @Transactional
  public Api.Booking addProofPhoto(CurrentUser user, String bookingId, String ref) {
    Booking b = mine(user, bookingId);
    b.proofPhotos.add(files.attach(ref, user));
    return mapper.booking(core.commit(b, List.of()));
  }

  @Transactional
  public Api.Booking collectCash(CurrentUser user, String bookingId) {
    Booking b = core.load(bookingId);
    if (!user.id().equals(b.vendorId) || !BookingRules.COMPLETED.equals(b.status)) throw ApiException.bad("Collect payment after completing the service");
    if ("paid".equals(b.paymentStatus)) throw ApiException.conflict("Payment already received");
    b.paymentMethod = "cash";
    b.paymentStatus = "paid";
    b.paidAt = core.clock().instant();
    b.txnId = null;
    b.failureReason = null;
    core.event(b, "payment_received", "vendor", "Cash collected");
    ledger.recordPayment(b);
    return mapper.booking(core.commit(b, notify.paymentReceived(b)));
  }
}
