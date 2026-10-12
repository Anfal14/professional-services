package com.profecian.bookings;

import com.profecian.auth.CurrentUser;
import com.profecian.common.ApiException;
import com.profecian.files.FileRefs;
import com.profecian.notifications.Draft;
import com.profecian.notifications.NotificationService;
import com.profecian.notifications.NotifyFor;
import com.profecian.payments.LedgerService;
import com.profecian.sync.Api;
import com.profecian.sync.ApiMapper;
import com.profecian.vendors.Vendor;
import com.profecian.vendors.VendorService;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** A professional's job workflow — the job actions of the `vendor` group in mock.ts. */
@Service
public class VendorJobService {
  private final BookingCore core;
  private final BookingRepository bookings;
  private final NotificationService notifications;
  private final InspectionActions inspections;
  private final VendorService vendors;
  private final NotifyFor notify;
  private final LedgerService ledger;
  private final FileRefs files;
  private final ApiMapper mapper;

  public VendorJobService(BookingCore core, BookingRepository bookings, NotificationService notifications, InspectionActions inspections,
                          VendorService vendors, NotifyFor notify, LedgerService ledger, FileRefs files, ApiMapper mapper) {
    this.core = core;
    this.bookings = bookings;
    this.notifications = notifications;
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

  /** What the professional gets back: the booking without the customer's start code. */
  private Api.Booking view(Booking b) {
    return mapper.bookingForVendor(b);
  }

  /**
   * Accept → on the way → arrived → in progress → completed. Starting needs the customer's start
   * code and no other job in progress; completing needs an "after" photo (VendorJobRules).
   */
  @Transactional
  public Api.Booking advance(CurrentUser user, String bookingId, String startCode) {
    Booking b = mine(user, bookingId);
    String next = BookingRules.vendorNext(b.status).orElseThrow(() -> ApiException.bad("No further action for this job"));
    if (BookingRules.IN_PROGRESS.equals(next)) {
      Booking busy = bookings.findFirstByVendorIdAndStatusAndIdNot(user.id(), BookingRules.IN_PROGRESS, b.id).orElse(null);
      if (busy != null) throw ApiException.bad(VendorJobRules.busy(busy.code));
      if (b.startCodeAttempts >= VendorJobRules.START_CODE_MAX_ATTEMPTS) throw ApiException.bad(VendorJobRules.START_CODE_LOCKED);
      if (!VendorJobRules.isValidStartCode(startCode)) throw ApiException.bad(VendorJobRules.START_CODE_MISSING);
      if (!startCode.equals(b.startCode)) {
        // Counted in its own transaction: this request fails, the attempt must still be remembered.
        bookings.recordWrongStartCode(b.id);
        int left = VendorJobRules.START_CODE_MAX_ATTEMPTS - b.startCodeAttempts - 1;
        throw ApiException.bad(left > 0 ? VendorJobRules.startCodeWrong(left) : VendorJobRules.START_CODE_LOCKED);
      }
    }
    if (BookingRules.COMPLETED.equals(next) && BookingCore.isQuoteOpen(b)) {
      throw ApiException.bad("quoted".equals(b.inspection.status)
          ? "Wait for the customer to approve or decline your quote before completing"
          : "Share a quote, or mark that no repair is needed, before completing");
    }
    if (BookingRules.COMPLETED.equals(next) && b.afterPhotos.size() < VendorJobRules.MIN_AFTER_PHOTOS) throw ApiException.bad(VendorJobRules.AFTER_PHOTO);
    Vendor v = vendors.get(user.id());
    // Carrying on with the job closes an open on-site report.
    if (b.hasIssue()) {
      b.clearIssue();
      core.event(b, ReleaseRules.ISSUE_RESOLVED, "vendor", "The professional continued the job");
    }
    core.moveTo(b, next, BookingCore.Actor.vendor, null);
    List<Draft> drafts = BookingRules.ON_THE_WAY.equals(next) ? notify.vendorOnTheWay(b, v)
        : BookingRules.ARRIVED.equals(next) ? notify.vendorArrived(b, v)
        : BookingRules.COMPLETED.equals(next) ? notify.serviceCompleted(b) : List.of();
    if (BookingRules.COMPLETED.equals(next)) v.jobsCompleted += 1;
    // Messages wait until the step can no longer be undone.
    return view(core.commit(b, drafts, VendorJobRules.NOTIFY_AFTER));
  }

  /** Takes back the professional's last step, within the undo window — undoStep in mock.ts. */
  @Transactional
  public Api.Booking undo(CurrentUser user, String bookingId) {
    Booking b = mine(user, bookingId);
    String previous = VendorJobRules.undoTarget(b, core.clock().instant()).orElseThrow(() -> ApiException.bad(VendorJobRules.UNDO_EXPIRED));
    String step = b.status;
    Instant since = b.timeline.get(b.timeline.size() - 1).at;
    b.status = previous;
    core.event(b, VendorJobRules.STEP_UNDONE, "vendor", "Undid “" + VendorJobRules.STEP_LABEL.get(step) + "”");
    if (BookingRules.COMPLETED.equals(step)) {
      Vendor v = vendors.get(user.id());
      v.jobsCompleted = Math.max(0, v.jobsCompleted - 1);
    }
    // The customer shouldn't keep (or be sent) a message about a step that didn't happen.
    notifications.retract(b.id, since.minusSeconds(1), VendorJobRules.STEP_NOTIFICATIONS, "customer", b.customerId);
    return view(core.commit(b, List.of()));
  }

  public record QuoteLineInput(String description, BigDecimal amount) {}

  /**
   * An itemised quote the customer must approve before the work starts. On a "Not sure" visit it is
   * the repair quote after inspecting; on a normal booking it is a quote for extra work found on
   * site, added to the booked work if approved.
   */
  @Transactional
  public Api.Booking shareQuote(CurrentUser user, String bookingId, List<QuoteLineInput> lines, String note) {
    Booking b = mine(user, bookingId);
    if (BookingRules.isClosed(b.status)) throw ApiException.bad("This booking is closed");
    if (b.inspection == null ? !BookingCore.canQuoteExtraWork(b) : !BookingCore.canQuote(b)) throw ApiException.bad("Share a quote after you start the service");
    boolean extra = b.inspection == null || b.inspection.isExtraWork();
    if (b.inspection == null) {
      Inspection started = new Inspection();
      started.booking = b;
      started.kind = "extra_work";
      started.description = "";
      started.fee = 0;
      started.status = "pending";
      b.inspection = started;
    }
    Inspection i = b.inspection;
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
    core.event(b, "quote_shared", "vendor", (extra ? "Extra work: " : "") + clean.size() + " item" + (clean.size() > 1 ? "s" : "") + ", ₹" + amount.toPlainString() + " + GST");
    return view(core.commit(b, notify.quoteShared(b)));
  }

  @Transactional
  public Api.Booking markNoWorkNeeded(CurrentUser user, String bookingId, String note) {
    Booking b = mine(user, bookingId);
    Inspection i = core.openInspection(b);
    if (i.isExtraWork()) throw ApiException.bad("This applies to “Not sure” visits only");
    if (!BookingCore.canQuote(b)) throw ApiException.bad("Start the service and inspect first");
    String text = note == null ? "" : note.trim();
    if (text.length() < 5) throw ApiException.bad("Tell the customer what you found");
    i.status = "no_work_needed";
    i.noWorkNote = text;
    i.clearQuote();
    core.reprice(b);
    core.event(b, "no_work_needed", "vendor", text);
    return view(core.commit(b, List.of()));
  }

  /** Turning down a job that was only offered — it goes back to the admin queue. The reason is optional and nothing goes on the professional's record. */
  @Transactional
  public Api.Booking decline(CurrentUser user, String bookingId, String reason) {
    Booking b = core.load(bookingId);
    if (!user.id().equals(b.vendorId) || !BookingRules.ASSIGNED.equals(b.status)) throw ApiException.bad("Only newly assigned jobs can be declined");
    String previous = b.vendorId;
    String why = ReleaseRules.clean(reason);
    b.status = BookingRules.PENDING_ASSIGNMENT;
    b.vendorId = null;
    core.event(b, BookingRules.PENDING_ASSIGNMENT, "vendor", why == null ? "Declined" : "Declined: " + why);
    List<Draft> adminOnly = notify.bookingCreated(b).stream().filter(d -> "admin".equals(d.audience())).toList();
    return view(core.commit(b, adminOnly, previous));
  }

  /**
   * "Can't make it" after accepting — releaseJob in mock.ts. The booking returns to the admin's
   * queue without this professional; it is never cancelled here. Late (2 hours or less to the slot,
   * or on the way) marks it urgent and counts against the completion rate. The customer is told at once.
   */
  @Transactional
  public Api.Booking release(CurrentUser user, String bookingId, String reason, String note) {
    Booking b = mine(user, bookingId);
    if (!ReleaseRules.canRelease(b.status)) {
      throw ApiException.bad(BookingRules.ARRIVED.equals(b.status) || BookingRules.IN_PROGRESS.equals(b.status) ? ReleaseRules.ERR_ON_SITE : ReleaseRules.ERR_NOT_RELEASABLE);
    }
    String text = ReleaseRules.clean(note);
    ReleaseRules.checkRelease(reason, text);
    Vendor v = vendors.get(user.id());
    Booking.Release r = new Booking.Release(v.id, v.name, reason, text, ReleaseRules.isLate(b, core.clock().instant()), core.clock().instant());
    b.releases.add(r);
    b.urgent = r.late;
    b.status = BookingRules.PENDING_ASSIGNMENT;
    b.vendorId = null;
    // A quote belongs to the professional who made it.
    if (b.inspection != null && "quoted".equals(b.inspection.status)) {
      b.inspection.status = "pending";
      b.inspection.clearQuote();
    }
    core.event(b, ReleaseRules.RELEASED, "vendor", ReleaseRules.releaseNote(r));
    return view(core.commit(b, notify.jobReleased(b, r), v.id));
  }

  /**
   * On site there is no release: the professional reports the problem and keeps the job until the
   * admin decides — reportIssue in mock.ts.
   */
  @Transactional
  public Api.Booking reportIssue(CurrentUser user, String bookingId, String kind, String reason, String note) {
    Booking b = mine(user, bookingId);
    String text = ReleaseRules.clean(note);
    ReleaseRules.checkIssue(b.status, kind, reason, text);
    b.issueKind = kind;
    b.issueReason = "cant_complete".equals(kind) ? reason : null;
    b.issueNote = text;
    b.issueVendorId = user.id();
    b.issueVendorName = vendors.get(user.id()).name;
    b.issueAt = core.clock().instant();
    core.event(b, ReleaseRules.ISSUE_REPORTED, "vendor", ReleaseRules.issueNote(b));
    return view(core.commit(b, notify.issueReported(b)));
  }

  /** kind "after" adds an after-photo (needed to complete); anything else a before-photo. */
  @Transactional
  public Api.Booking addProofPhoto(CurrentUser user, String bookingId, String ref, String kind) {
    Booking b = mine(user, bookingId);
    List<String> photos = "after".equals(kind) ? b.afterPhotos : b.proofPhotos;
    if (photos.size() >= VendorJobRules.MAX_PROOF_PHOTOS) throw ApiException.bad(VendorJobRules.TOO_MANY_PHOTOS);
    photos.add(files.attach(ref, user));
    return view(core.commit(b, List.of()));
  }

  /** The professional types the cash they were handed; it must be exactly the amount due. */
  @Transactional
  public Api.Booking collectCash(CurrentUser user, String bookingId, BigDecimal amountReceived) {
    Booking b = core.load(bookingId);
    if (!user.id().equals(b.vendorId) || !BookingRules.COMPLETED.equals(b.status)) throw ApiException.bad("Collect payment after completing the service");
    if ("paid".equals(b.paymentStatus)) throw ApiException.conflict("Payment already received");
    if (amountReceived == null || amountReceived.signum() < 0) throw ApiException.bad(VendorJobRules.CASH_AMOUNT_MISSING);
    if (amountReceived.compareTo(b.total) != 0) throw ApiException.bad(VendorJobRules.CASH_AMOUNT_MISMATCH);
    b.paymentMethod = "cash";
    b.paymentStatus = "paid";
    b.paidAt = core.clock().instant();
    b.txnId = null;
    b.failureReason = null;
    core.event(b, "payment_received", "vendor", "Cash collected");
    ledger.recordPayment(b);
    return view(core.commit(b, notify.paymentReceived(b)));
  }
}
