package com.profecian.sync;

import com.profecian.bookings.Booking;
import com.profecian.bookings.ReleaseRules;
import com.profecian.bookings.ReliabilityService;
import com.profecian.bookings.Inspection;
import com.profecian.catalog.ProblemType;
import com.profecian.catalog.ServiceCategory;
import com.profecian.complaints.Complaint;
import com.profecian.customers.Customer;
import com.profecian.customers.CustomerAddress;
import com.profecian.files.FileRefs;
import com.profecian.notifications.Notification;
import com.profecian.payouts.Payout;
import com.profecian.reviews.Review;
import com.profecian.settings.City;
import com.profecian.settings.PlatformSettings;
import com.profecian.vendors.Vendor;
import java.util.Arrays;
import java.util.List;
import org.springframework.stereotype.Component;

/** Entity → wire shape. File keys become time-limited URLs here. */
@Component
public class ApiMapper {
  private final FileRefs files;
  private final ReliabilityService reliability;

  public ApiMapper(FileRefs files, ReliabilityService reliability) {
    this.files = files;
    this.reliability = reliability;
  }

  /** Who a booking is being shown to: each sees a different slice of it. */
  private enum Viewer { ADMIN, CUSTOMER, VENDOR }

  public Api.ServiceCategory category(ServiceCategory c) {
    return new Api.ServiceCategory(c.id, c.name, c.tagline, c.description, c.icon, c.image, c.tint, c.enabled, c.popular,
        c.commissionRate, c.inspectionFee, List.copyOf(c.includes), c.sortOrder);
  }

  public Api.ProblemType problemType(ProblemType p) {
    return new Api.ProblemType(p.id, p.categoryId, p.name, p.description, p.icon, p.price, p.pricingModel, p.durationMins, p.enabled, new java.util.TreeMap<>(p.cityPrices));
  }

  public Api.Address address(CustomerAddress a) {
    return new Api.Address(a.id, a.label, a.line, a.landmark, a.city, a.pincode, a.lat, a.lng);
  }

  public Api.Customer customer(Customer c) {
    return new Api.Customer(c.id, c.name, c.phone, c.email, c.city, c.addresses.stream().map(this::address).toList(), c.blocked, c.createdAt);
  }

  /** `full` includes KYC documents and bank details — for the vendor themself and admins only. */
  public Api.Vendor vendor(Vendor v, boolean full) {
    return vendor(v, full, full ? reliability.of(v.id) : ReliabilityService.Stats.NONE);
  }

  /** As {@link #vendor(Vendor, boolean)} with the completion-rate totals already counted (for lists). */
  public Api.Vendor vendor(Vendor v, boolean full, ReliabilityService.Stats stats) {
    List<Api.KycDocument> kyc = full
        ? v.kyc.stream().map(k -> new Api.KycDocument(k.type, k.number, files.url(k.imageKey), k.status, k.note, k.uploadedAt)).toList()
        : List.of();
    Api.BankAccount bank = full && v.bank != null ? new Api.BankAccount(v.bank.holderName, v.bank.accountLast4, v.bank.ifsc, v.bank.bankName) : null;
    List<Integer> days = v.workingHours.days == null || v.workingHours.days.isBlank()
        ? List.of() : Arrays.stream(v.workingHours.days.split(",")).map(String::trim).map(Integer::parseInt).toList();
    return new Api.Vendor(v.id, v.name, v.phone, v.email, files.url(v.photo), v.city, List.copyOf(v.serviceAreas), List.copyOf(v.categoryIds),
        v.status, kyc, bank, v.available, new Api.WorkingHours(v.workingHours.start, v.workingHours.end, days), v.rating, v.ratingCount,
        v.jobsCompleted, new Api.Location(v.lat, v.lng), v.joinedAt, full ? v.kycSubmittedAt : null, full ? v.rejectionReason : null,
        // The totals behind the completion rate are for the professional and admins, not customers.
        full ? stats.accepted() : null, full ? stats.lateReleases() : null);
  }

  /**
   * A booking as its customer sees it: with the start code they read out, without the release
   * history, the on-site report or the reasons professionals gave.
   */
  public Api.Booking booking(Booking b) {
    return booking(b, Viewer.CUSTOMER);
  }

  /** A booking as admins see it: everything. */
  public Api.Booking bookingForAdmin(Booking b) {
    return booking(b, Viewer.ADMIN);
  }

  /** A booking as its professional sees it: their own on-site report, but not the customer's start code or earlier professionals' releases. */
  public Api.Booking bookingForVendor(Booking b) {
    return booking(b, Viewer.VENDOR);
  }

  /** Timeline notes that name a professional's reasons are for admins only. */
  private static final java.util.Set<String> PRIVATE_NOTES = java.util.Set.of(ReleaseRules.RELEASED, ReleaseRules.ISSUE_REPORTED, ReleaseRules.ISSUE_RESOLVED);

  private Api.Booking booking(Booking b, Viewer viewer) {
    boolean admin = viewer == Viewer.ADMIN;
    Api.Address address = new Api.Address(b.addressId, b.addressLabel, b.addressLine, b.addressLandmark, b.addressCity, b.addressPincode, b.addressLat, b.addressLng);
    Api.PriceBreakdown price = new Api.PriceBreakdown(b.serviceAmount, b.tax, b.total, b.commissionRate, b.commission, b.vendorPayout);
    Api.BookingPayment payment = new Api.BookingPayment(b.paymentMethod, b.paymentStatus, b.paidAt, b.txnId, b.failureReason);
    List<Api.BookingItem> items = b.items.stream().map(i -> new Api.BookingItem(i.problemTypeId, i.name, i.price)).toList();
    List<Api.BookingEvent> timeline = b.timeline.stream()
        .map(e -> new Api.BookingEvent(e.kind, e.at, e.byRole, admin || !PRIVATE_NOTES.contains(e.kind) ? e.note : null)).toList();
    List<Api.JobRelease> releases = admin
        ? b.releases.stream().map(r -> new Api.JobRelease(r.vendorId, r.vendorName, r.reason, r.note, r.late, r.at)).toList() : null;
    Api.JobIssue issue = b.hasIssue() && viewer != Viewer.CUSTOMER
        ? new Api.JobIssue(b.issueKind, b.issueReason, b.issueNote, b.issueVendorId, b.issueVendorName, b.issueAt) : null;
    return new Api.Booking(b.id, b.code, b.customerId, b.customerName, b.customerPhone, b.categoryId, b.problemTypeId, items,
        b.inspection == null ? null : inspection(b.inspection), b.date, b.slot, address, b.notes, b.status, b.vendorId, price, payment,
        files.urls(b.proofPhotos), timeline, b.createdAt, b.cancelReason, b.reviewId, files.urls(b.afterPhotos), viewer != Viewer.VENDOR ? b.startCode : null,
        releases, admin && b.urgent ? Boolean.TRUE : null, issue);
  }

  public Api.InspectionRequest inspection(Inspection i) {
    Api.InspectionQuote quote = i.hasQuote()
        ? new Api.InspectionQuote(i.quoteLines.stream().map(l -> new Api.QuoteLine(l.description, l.amount)).toList(), i.quoteAmount,
            i.quoteNote, i.quoteVendorId, i.quoteCreatedAt, i.quoteRespondedAt, i.quoteRespondedBy)
        : null;
    return new Api.InspectionRequest(i.description, files.urls(i.photos), i.fee, i.status, quote, i.noWorkNote, i.kind);
  }

  public Api.Review review(Review r) {
    return new Api.Review(r.id, r.bookingId, r.customerId, r.customerName, r.vendorId, r.categoryId, r.rating, r.text, files.urls(r.images), r.status, r.createdAt);
  }

  public Api.Complaint complaint(Complaint c) {
    return new Api.Complaint(c.id, c.bookingId, c.customerId, c.vendorId, c.subject, c.message, c.status, c.resolution, c.createdAt);
  }

  public Api.Payout payout(Payout p) {
    return new Api.Payout(p.id, p.vendorId, p.amount, List.copyOf(p.bookingIds), p.status, p.createdAt, p.settledAt, p.utr);
  }

  public Api.AppNotification notification(Notification n) {
    return new Api.AppNotification(n.id, n.audience, n.recipientId, n.kind, n.title, n.body, n.channelList(), n.bookingId, n.whatsappUrl, n.read, n.createdAt);
  }

  public Api.PlatformSettings settings(PlatformSettings s, List<City> cities) {
    return new Api.PlatformSettings(s.taxRate, s.defaultCommissionRate, s.defaultInspectionFee, cities.stream().map(this::city).toList(), s.whatsappNumber, s.supportPhone);
  }

  public Api.City city(City c) {
    return new Api.City(c.name, c.state, c.status, c.lat == null ? 0 : c.lat, c.lng == null ? 0 : c.lng, c.radiusKm,
        List.copyOf(c.areas), c.disabledCategoryIds.stream().sorted().toList(), c.priceLevel, c.commissionRate);
  }
}
