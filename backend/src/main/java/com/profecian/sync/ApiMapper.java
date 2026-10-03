package com.profecian.sync;

import com.profecian.bookings.Booking;
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

  public ApiMapper(FileRefs files) {
    this.files = files;
  }

  public Api.ServiceCategory category(ServiceCategory c) {
    return new Api.ServiceCategory(c.id, c.name, c.tagline, c.description, c.icon, c.image, c.tint, c.enabled, c.popular,
        c.commissionRate, c.inspectionFee, List.copyOf(c.includes), c.sortOrder);
  }

  public Api.ProblemType problemType(ProblemType p) {
    return new Api.ProblemType(p.id, p.categoryId, p.name, p.description, p.icon, p.price, p.pricingModel, p.durationMins, p.enabled);
  }

  public Api.Address address(CustomerAddress a) {
    return new Api.Address(a.id, a.label, a.line, a.landmark, a.city, a.pincode, a.lat, a.lng);
  }

  public Api.Customer customer(Customer c) {
    return new Api.Customer(c.id, c.name, c.phone, c.email, c.city, c.addresses.stream().map(this::address).toList(), c.blocked, c.createdAt);
  }

  /** `full` includes KYC documents and bank details — for the vendor themself and admins only. */
  public Api.Vendor vendor(Vendor v, boolean full) {
    List<Api.KycDocument> kyc = full
        ? v.kyc.stream().map(k -> new Api.KycDocument(k.type, k.number, files.url(k.imageKey), k.status, k.note, k.uploadedAt)).toList()
        : List.of();
    Api.BankAccount bank = full && v.bank != null ? new Api.BankAccount(v.bank.holderName, v.bank.accountLast4, v.bank.ifsc, v.bank.bankName) : null;
    List<Integer> days = v.workingHours.days == null || v.workingHours.days.isBlank()
        ? List.of() : Arrays.stream(v.workingHours.days.split(",")).map(String::trim).map(Integer::parseInt).toList();
    return new Api.Vendor(v.id, v.name, v.phone, v.email, files.url(v.photo), v.city, List.copyOf(v.serviceAreas), List.copyOf(v.categoryIds),
        v.status, kyc, bank, v.available, new Api.WorkingHours(v.workingHours.start, v.workingHours.end, days), v.rating, v.ratingCount,
        v.jobsCompleted, new Api.Location(v.lat, v.lng), v.joinedAt, full ? v.kycSubmittedAt : null, full ? v.rejectionReason : null);
  }

  public Api.Booking booking(Booking b) {
    Api.Address address = new Api.Address(b.addressId, b.addressLabel, b.addressLine, b.addressLandmark, b.addressCity, b.addressPincode, b.addressLat, b.addressLng);
    Api.PriceBreakdown price = new Api.PriceBreakdown(b.serviceAmount, b.tax, b.total, b.commissionRate, b.commission, b.vendorPayout);
    Api.BookingPayment payment = new Api.BookingPayment(b.paymentMethod, b.paymentStatus, b.paidAt, b.txnId, b.failureReason);
    List<Api.BookingItem> items = b.items.stream().map(i -> new Api.BookingItem(i.problemTypeId, i.name, i.price)).toList();
    List<Api.BookingEvent> timeline = b.timeline.stream().map(e -> new Api.BookingEvent(e.kind, e.at, e.byRole, e.note)).toList();
    return new Api.Booking(b.id, b.code, b.customerId, b.customerName, b.customerPhone, b.categoryId, b.problemTypeId, items,
        b.inspection == null ? null : inspection(b.inspection), b.date, b.slot, address, b.notes, b.status, b.vendorId, price, payment,
        files.urls(b.proofPhotos), timeline, b.createdAt, b.cancelReason, b.reviewId);
  }

  public Api.InspectionRequest inspection(Inspection i) {
    Api.InspectionQuote quote = i.hasQuote()
        ? new Api.InspectionQuote(i.quoteLines.stream().map(l -> new Api.QuoteLine(l.description, l.amount)).toList(), i.quoteAmount,
            i.quoteNote, i.quoteVendorId, i.quoteCreatedAt, i.quoteRespondedAt, i.quoteRespondedBy)
        : null;
    List<Api.ClarificationMessage> messages = i.messages.stream()
        .map(m -> new Api.ClarificationMessage(m.id, m.fromRole, m.authorName, m.text, m.at)).toList();
    return new Api.InspectionRequest(i.description, files.urls(i.photos), i.fee, i.status, quote, messages, i.awaitingCustomer, i.noWorkNote);
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
    return new Api.PlatformSettings(s.taxRate, s.defaultCommissionRate, s.defaultInspectionFee, cities.stream().map(c -> c.name).toList(), s.whatsappNumber, s.supportPhone);
  }
}
