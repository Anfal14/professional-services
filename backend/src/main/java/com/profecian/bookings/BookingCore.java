package com.profecian.bookings;

import com.profecian.catalog.CatalogRepositories.CategoryRepository;
import com.profecian.catalog.ServiceCategory;
import com.profecian.common.ApiException;
import com.profecian.common.Ids;
import com.profecian.live.LiveEvents;
import com.profecian.notifications.Draft;
import com.profecian.notifications.NotificationService;
import com.profecian.pricing.Pricing;
import com.profecian.settings.PlatformSettings;
import com.profecian.settings.SettingsService;
import java.math.BigDecimal;
import java.time.Clock;
import java.util.List;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Shared booking mechanics used by the customer, vendor and admin services.
 *
 * Every change goes through {@link #commit}: the booking row (optimistic lock on `version`),
 * its timeline rows and the notification + outbox rows are written in the caller's single
 * transaction; the live "changed" signal is published only after that transaction commits.
 */
@Component
public class BookingCore {
  public enum Actor { customer, vendor, admin, system }

  private final BookingRepository bookings;
  private final CategoryRepository categories;
  private final SettingsService settings;
  private final NotificationService notifications;
  private final LiveEvents live;
  private final Clock clock;

  public BookingCore(BookingRepository bookings, CategoryRepository categories, SettingsService settings, NotificationService notifications,
                     LiveEvents live, Clock clock) {
    this.bookings = bookings;
    this.categories = categories;
    this.settings = settings;
    this.notifications = notifications;
    this.live = live;
    this.clock = clock;
  }

  public Booking load(String id) {
    return bookings.findById(id).orElseThrow(() -> ApiException.notFound("Booking not found"));
  }

  public void event(Booking b, String kind, String by, String note) {
    b.timeline.add(new Booking.Event(kind, by, note, clock.instant()));
  }

  /**
   * The one place a booking's status changes. Rules (status.ts / mock.ts):
   *  - vendor: only the next step in VENDOR_NEXT;
   *  - customer: only cancel, and only while canCustomerModify;
   *  - admin: may set any status (support override) — callers add the extra checks the mock makes;
   *  - nothing moves a cancelled booking except an admin.
   */
  public void moveTo(Booking b, String target, Actor actor, String note) {
    if (!BookingRules.isValid(target)) throw ApiException.bad("Unknown status");
    switch (actor) {
      case vendor -> {
        String next = BookingRules.vendorNext(b.status).orElseThrow(() -> ApiException.bad("No further action for this job"));
        if (!next.equals(target)) throw ApiException.bad("No further action for this job");
      }
      case customer -> {
        if (!BookingRules.CANCELLED.equals(target)) throw ApiException.forbidden("Customers can only cancel a booking");
        if (!BookingRules.canCustomerModify(b.status)) throw ApiException.bad("This booking can no longer be cancelled");
      }
      case admin -> { }
      case system -> throw new IllegalStateException("System actor cannot change status");
    }
    b.status = target;
    event(b, target, actor.name(), note);
  }

  /** Re-derive the price from items, the inspection fee or approved quote, the category's commission and GST. */
  public void reprice(Booking b) {
    PlatformSettings s = settings.get();
    ServiceCategory c = categories.findById(b.categoryId).orElse(null);
    BigDecimal rate = c != null && c.commissionRate != null ? c.commissionRate : s.defaultCommissionRate;
    Inspection i = b.inspection;
    BigDecimal approved = i != null && "approved".equals(i.status) && i.quoteAmount != null ? i.quoteAmount : null;
    BigDecimal amount = Pricing.serviceAmount(b.items.stream().map(it -> it.price).toList(), i == null ? null : i.fee, approved);
    apply(b, Pricing.compute(amount, rate, s.taxRate));
  }

  public static void apply(Booking b, Pricing.Breakdown p) {
    b.serviceAmount = p.serviceAmount();
    b.tax = p.tax();
    b.total = p.total();
    b.commissionRate = p.commissionRate();
    b.commission = p.commission();
    b.vendorPayout = p.vendorPayout();
  }

  /** Persist + notify in the current transaction; live signal after commit. */
  @Transactional(propagation = Propagation.MANDATORY)
  public Booking commit(Booking b, List<Draft> drafts, String... previousVendorIds) {
    b.updatedAt = clock.instant();
    Booking saved = bookings.saveAndFlush(b);
    if (!drafts.isEmpty()) notifications.publish(drafts);
    live.bookingChanged(saved, previousVendorIds);
    return saved;
  }

  /* ───── "Other / Not sure" helpers shared by every role ───── */

  public Inspection openInspection(Booking b) {
    if (b.inspection == null) throw ApiException.bad("This booking has no “Not sure” request");
    if (BookingRules.isClosed(b.status)) throw ApiException.bad("This booking is closed");
    return b.inspection;
  }

  public void addMessage(Inspection i, String from, String authorName, String text) {
    i.messages.add(new Inspection.Message(Ids.newId("msg"), from, authorName, text, clock.instant()));
  }

  /** True while the final price is still open (no inspection yet, or a quote waiting for an answer). */
  public static boolean isQuoteOpen(Booking b) {
    return b.inspection != null && ("pending".equals(b.inspection.status) || "quoted".equals(b.inspection.status));
  }

  /** The professional can share a quote / close the inspection only on site, before it is settled. */
  public static boolean canQuote(Booking b) {
    return b.inspection != null && (BookingRules.ARRIVED.equals(b.status) || BookingRules.IN_PROGRESS.equals(b.status))
        && ("pending".equals(b.inspection.status) || "declined".equals(b.inspection.status));
  }

  public Clock clock() {
    return clock;
  }
}
