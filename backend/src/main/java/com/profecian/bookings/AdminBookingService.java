package com.profecian.bookings;

import com.profecian.common.ApiException;
import com.profecian.common.Schedules;
import com.profecian.notifications.Draft;
import com.profecian.notifications.NotificationService;
import com.profecian.notifications.NotifyFor;
import com.profecian.sync.Api;
import com.profecian.sync.ApiMapper;
import com.profecian.vendors.Vendor;
import com.profecian.vendors.VendorService;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Admin booking actions: assign/reassign, status override, "Not sure" follow-up, reminders. */
@Service
public class AdminBookingService {
  private final BookingCore core;
  private final BookingRepository bookings;
  private final InspectionActions inspections;
  private final VendorService vendors;
  private final NotifyFor notify;
  private final NotificationService notifications;
  private final ApiMapper mapper;

  public AdminBookingService(BookingCore core, BookingRepository bookings, InspectionActions inspections, VendorService vendors, NotifyFor notify,
                             NotificationService notifications, ApiMapper mapper) {
    this.core = core;
    this.bookings = bookings;
    this.inspections = inspections;
    this.vendors = vendors;
    this.notify = notify;
    this.notifications = notifications;
    this.mapper = mapper;
  }

  @Transactional
  public Api.Booking assign(String bookingId, String vendorId) {
    Booking b = core.load(bookingId);
    Vendor v = vendors.get(vendorId);
    if (!"approved".equals(v.status)) throw ApiException.bad("Only approved vendors can be assigned");
    if (BookingRules.isClosed(b.status)) throw ApiException.bad("This booking is closed");
    String previous = b.vendorId;
    boolean reassign = previous != null && !previous.equals(vendorId);
    // A quote belongs to the professional who made it: a newly assigned professional inspects again.
    if (reassign && b.inspection != null && "quoted".equals(b.inspection.status)) {
      b.inspection.status = "pending";
      b.inspection.clearQuote();
    }
    b.vendorId = vendorId;
    b.status = BookingRules.ASSIGNED;
    // A professional is on it again: no longer urgent, and any on-site report is settled.
    b.urgent = false;
    b.clearIssue();
    core.event(b, reassign ? "reassigned" : "assigned", "admin", (reassign ? "Reassigned" : "Assigned") + " to " + v.name);
    return mapper.bookingForAdmin(core.commit(b, notify.vendorAssigned(b, v), reassign ? previous : null));
  }

  /** Closes an on-site report without moving the booking — resolveIssue in mock.ts. */
  @Transactional
  public Api.Booking resolveIssue(String bookingId, String note) {
    Booking b = core.load(bookingId);
    if (!b.hasIssue()) throw ApiException.bad(ReleaseRules.ERR_NO_ISSUE);
    String text = ReleaseRules.clean(note);
    if (text == null || text.length() < ReleaseRules.NOTE_MIN) throw ApiException.bad("Say what was decided");
    b.clearIssue();
    core.event(b, ReleaseRules.ISSUE_RESOLVED, "admin", text);
    return mapper.bookingForAdmin(core.commit(b, List.of()));
  }

  /**
   * A return visit after an on-site report: the same professional comes back at a new time. The
   * booking goes back to "accepted" for that slot — scheduleReturnVisit in mock.ts.
   */
  @Transactional
  public Api.Booking scheduleReturnVisit(String bookingId, java.time.LocalDate date, String slot) {
    Booking b = core.load(bookingId);
    if (BookingRules.isClosed(b.status)) throw ApiException.bad("This booking is closed");
    if (b.vendorId == null) throw ApiException.bad(ReleaseRules.ERR_RETURN_VISIT);
    if (date == null || slot == null || com.profecian.common.Schedules.isPast(date, slot, core.clock())) throw ApiException.bad("Please choose a future time slot");
    if (b.hasIssue()) {
      b.clearIssue();
      core.event(b, ReleaseRules.ISSUE_RESOLVED, "admin", "Return visit arranged");
    }
    b.date = date;
    b.slot = slot;
    b.status = BookingRules.ACCEPTED;
    core.event(b, "rescheduled", "admin", "Return visit on " + date + " " + slot);
    return mapper.bookingForAdmin(core.commit(b, notify.rescheduled(b)));
  }

  /** Support override. Same extra checks as admin.setBookingStatus in mock.ts. */
  @Transactional
  public Api.Booking setStatus(String bookingId, String status, String note) {
    Booking b = core.load(bookingId);
    if (!BookingRules.isValid(status)) throw ApiException.bad("Unknown status");
    if (!BookingRules.PENDING_ASSIGNMENT.equals(status) && !BookingRules.CANCELLED.equals(status) && b.vendorId == null) throw ApiException.bad("Assign a vendor first");
    if (BookingRules.COMPLETED.equals(status) && BookingCore.isQuoteOpen(b)) {
      throw ApiException.bad(b.inspection.isExtraWork()
          ? "The extra-work quote has no answer yet — record the customer’s answer first"
          : "This “Not sure” booking has no settled quote — record the customer’s answer, or have the professional mark no repair needed, first");
    }
    String previous = b.vendorId;
    // Unassigning drops a quote made by the previous professional.
    if (BookingRules.PENDING_ASSIGNMENT.equals(status) && b.inspection != null && "quoted".equals(b.inspection.status)) {
      b.inspection.status = "pending";
      b.inspection.clearQuote();
    }
    core.moveTo(b, status, BookingCore.Actor.admin, note);
    // Any decision by support closes an open on-site report; a closed booking is no longer urgent.
    b.clearIssue();
    if (BookingRules.isClosed(status)) b.urgent = false;
    if (BookingRules.PENDING_ASSIGNMENT.equals(status)) b.vendorId = null;
    if (BookingRules.CANCELLED.equals(status)) b.cancelReason = note != null ? note : "Cancelled by support";
    List<Draft> drafts = BookingRules.CANCELLED.equals(status) ? notify.cancelled(b, "admin")
        : BookingRules.COMPLETED.equals(status) ? notify.serviceCompleted(b) : List.of();
    return mapper.bookingForAdmin(core.commit(b, drafts, previous));
  }

  /** Record the customer's answer to a quote, e.g. after confirming by phone. */
  @Transactional
  public Api.Booking respondToQuote(String bookingId, boolean approve, String note) {
    return mapper.bookingForAdmin(inspections.settleQuote(core.load(bookingId), approve, "admin",
        note == null || note.isBlank() ? "Confirmed with the customer by support" : note));
  }

  /** "Your job is today" reminders for assigned/accepted jobs. Also runs every morning. */
  @Transactional
  public int sendTodayReminders() {
    List<Booking> due = bookings.findByDateAndStatusIn(Schedules.today(core.clock()), List.of(BookingRules.ASSIGNED, BookingRules.ACCEPTED));
    notifications.publish(due.stream().flatMap(b -> notify.jobReminder(b).stream()).toList());
    return due.size();
  }

  /** Sends the reminders every morning (through the proxy, so the transaction applies). */
  @org.springframework.stereotype.Component
  static class ReminderJob {
    private final AdminBookingService service;

    ReminderJob(AdminBookingService service) {
      this.service = service;
    }

    @org.springframework.scheduling.annotation.Scheduled(cron = "0 0 7 * * *", zone = "Asia/Kolkata")
    void morning() {
      service.sendTodayReminders();
    }
  }
}
