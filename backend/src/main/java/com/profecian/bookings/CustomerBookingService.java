package com.profecian.bookings;

import com.profecian.auth.CurrentUser;
import com.profecian.catalog.CatalogRepositories.CategoryRepository;
import com.profecian.catalog.CatalogRepositories.ProblemTypeRepository;
import com.profecian.catalog.ProblemType;
import com.profecian.catalog.ServiceCategory;
import com.profecian.common.ApiException;
import com.profecian.common.Ids;
import com.profecian.common.Phones;
import com.profecian.common.Schedules;
import com.profecian.complaints.Complaint;
import com.profecian.customers.Customer;
import com.profecian.customers.CustomerAddress;
import com.profecian.customers.CustomerService;
import com.profecian.files.FileRefs;
import com.profecian.live.LiveEvents;
import com.profecian.notifications.NotificationService;
import com.profecian.notifications.NotifyFor;
import com.profecian.pricing.Pricing;
import com.profecian.reviews.Review;
import com.profecian.settings.PlatformSettings;
import com.profecian.settings.SettingsService;
import com.profecian.sync.Api;
import com.profecian.sync.ApiMapper;
import com.profecian.vendors.Vendor;
import com.profecian.vendors.VendorRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Customer booking actions — the `customer` group of mock.ts, plus all-or-nothing cart checkout. */
@Service
public class CustomerBookingService {
  public static final int INSPECTION_MIN_DETAILS = 15;
  public static final int INSPECTION_MAX_PHOTOS = 3;

  private final BookingCore core;
  private final BookingRepository bookings;
  private final InspectionActions inspections;
  private final CategoryRepository categories;
  private final ProblemTypeRepository problemTypes;
  private final CustomerService customers;
  private final SettingsService settings;
  private final VendorRepository vendors;
  private final Review.Repository reviews;
  private final Complaint.Repository complaints;
  private final NotifyFor notify;
  private final NotificationService notifications;
  private final FileRefs files;
  private final ApiMapper mapper;
  private final LiveEvents live;

  public CustomerBookingService(BookingCore core, BookingRepository bookings, InspectionActions inspections, CategoryRepository categories,
                                ProblemTypeRepository problemTypes, CustomerService customers, SettingsService settings, VendorRepository vendors,
                                Review.Repository reviews, Complaint.Repository complaints, NotifyFor notify, NotificationService notifications,
                                FileRefs files, ApiMapper mapper, LiveEvents live) {
    this.core = core;
    this.bookings = bookings;
    this.inspections = inspections;
    this.categories = categories;
    this.problemTypes = problemTypes;
    this.customers = customers;
    this.settings = settings;
    this.vendors = vendors;
    this.reviews = reviews;
    this.complaints = complaints;
    this.notify = notify;
    this.notifications = notifications;
    this.files = files;
    this.mapper = mapper;
    this.live = live;
  }

  public record InspectionInput(String description, List<String> photos) {}

  public record CreateBooking(String categoryId, List<String> problemTypeIds, LocalDate date, String slot, CustomerService.AddressInput address,
                              String contactName, String contactPhone, String notes, InspectionInput inspection) {}

  /** One visit per service; every visit shares the slot, address and contact. */
  public record CheckoutGroup(String categoryId, List<String> problemTypeIds, String notes, InspectionInput inspection) {}

  public record Checkout(List<CheckoutGroup> groups, LocalDate date, String slot, CustomerService.AddressInput address, String contactName, String contactPhone) {}

  @Transactional
  public Api.Booking create(CurrentUser user, CreateBooking in) {
    return mapper.booking(createInternal(user, in));
  }

  /** Creates one booking per service in a single transaction: either all are placed or none. */
  @Transactional
  public List<Api.Booking> checkout(CurrentUser user, Checkout in) {
    if (in.groups() == null || in.groups().isEmpty()) throw ApiException.bad("Your cart is empty");
    List<Booking> created = new ArrayList<>();
    CustomerService.AddressInput address = in.address();
    for (CheckoutGroup g : in.groups()) {
      Booking b = createInternal(user, new CreateBooking(g.categoryId(), g.problemTypeIds(), in.date(), in.slot(), address,
          in.contactName(), in.contactPhone(), g.notes(), g.inspection()));
      created.add(b);
      // Later visits reuse the address saved by the first one.
      address = new CustomerService.AddressInput(b.addressId, b.addressLabel, b.addressLine, b.addressLandmark, b.addressCity, b.addressPincode, b.addressLat, b.addressLng);
    }
    return created.stream().map(mapper::booking).toList();
  }

  private Booking createInternal(CurrentUser user, CreateBooking in) {
    Customer customer = customers.get(user.id());
    if (customer.blocked) throw ApiException.forbidden("This account has been blocked. Please contact support.");
    PlatformSettings s = settings.get();
    ServiceCategory category = categories.findById(in.categoryId()).filter(c -> c.enabled).orElse(null);
    List<String> ids = new ArrayList<>(new LinkedHashSet<>(in.problemTypeIds() == null ? List.of() : in.problemTypeIds()));
    List<ProblemType> problems = new ArrayList<>();
    boolean missing = false;
    for (String id : ids) {
      ProblemType p = problemTypes.findById(id).filter(x -> category != null && x.categoryId.equals(category.id) && x.enabled).orElse(null);
      if (p == null) missing = true;
      else problems.add(p);
    }
    if (category == null || missing) throw ApiException.bad("This service is currently unavailable");
    if (problems.isEmpty() && in.inspection() == null) throw ApiException.bad("Choose a problem, or “Other / Not sure”");
    String description = in.inspection() == null || in.inspection().description() == null ? "" : in.inspection().description().trim();
    if (in.inspection() != null && description.length() < INSPECTION_MIN_DETAILS) {
      throw ApiException.bad("Describe the problem in a few words (at least " + INSPECTION_MIN_DETAILS + " characters)");
    }
    if (!Phones.isValid(in.contactPhone())) throw ApiException.bad("Enter a valid contact number");
    if (in.date() == null || in.slot() == null || Schedules.isPast(in.date(), in.slot(), core.clock())) throw ApiException.bad("Please choose a future time slot");
    if (in.address() == null) throw ApiException.bad("Add or choose the address for the visit");

    CustomerAddress address = customers.saveAddress(customer.id, in.address());

    Booking b = new Booking();
    b.id = Ids.newId("bkg");
    b.code = Ids.bookingCode();
    b.customerId = customer.id;
    b.customerName = in.contactName() == null ? customer.name : in.contactName().trim();
    b.customerPhone = Phones.normalize(in.contactPhone());
    b.categoryId = category.id;
    for (ProblemType p : problems) b.items.add(new Booking.Item(p.id, p.name, p.price));
    b.problemTypeId = problems.isEmpty() ? null : problems.get(0).id;
    b.date = in.date();
    b.slot = in.slot();
    b.addressId = address.id;
    b.addressLabel = address.label;
    b.addressLine = address.line;
    b.addressLandmark = address.landmark;
    b.addressCity = address.city;
    b.addressPincode = address.pincode;
    b.addressLat = address.lat;
    b.addressLng = address.lng;
    b.notes = in.notes() == null || in.notes().isBlank() ? null : in.notes().trim();
    b.status = BookingRules.PENDING_ASSIGNMENT;
    b.paymentStatus = "unpaid";
    b.createdAt = core.clock().instant();
    if (in.inspection() != null) {
      Inspection i = new Inspection();
      i.booking = b;
      i.description = description;
      List<String> photos = files.attachAll(in.inspection().photos(), user);
      i.photos.addAll(photos.subList(0, Math.min(photos.size(), INSPECTION_MAX_PHOTOS)));
      i.fee = category.inspectionFee != null ? category.inspectionFee : s.defaultInspectionFee;
      i.status = "pending";
      b.inspection = i;
    }
    BigDecimal rate = category.commissionRate != null ? category.commissionRate : s.defaultCommissionRate;
    BookingCore.apply(b, Pricing.compute(Pricing.serviceAmount(b.items.stream().map(x -> x.price).toList(), b.inspection == null ? null : b.inspection.fee, null), rate, s.taxRate));
    core.event(b, BookingRules.PENDING_ASSIGNMENT, "customer", "Booking placed");
    return core.commit(b, notify.bookingCreated(b));
  }

  private Booking own(CurrentUser user, String bookingId) {
    Booking b = core.load(bookingId);
    if (!b.customerId.equals(user.id())) throw ApiException.notFound("Booking not found");
    return b;
  }

  @Transactional
  public Api.Booking answerClarification(CurrentUser user, String bookingId, String answer) {
    Booking b = own(user, bookingId);
    Inspection i = core.openInspection(b);
    String text = answer == null ? "" : answer.trim();
    if (text.length() < 2) throw ApiException.bad("Type your answer");
    String name = customers.get(user.id()).name;
    core.addMessage(i, "customer", name, text);
    i.awaitingCustomer = false;
    core.event(b, "clarification_answered", "customer", text);
    return mapper.booking(core.commit(b, notify.clarificationAnswered(b, text)));
  }

  @Transactional
  public Api.Booking respondToQuote(CurrentUser user, String bookingId, boolean approve) {
    return mapper.booking(inspections.settleQuote(own(user, bookingId), approve, "customer", null));
  }

  @Transactional
  public Api.Booking cancel(CurrentUser user, String bookingId, String reason) {
    Booking b = own(user, bookingId);
    if (!BookingRules.canCustomerModify(b.status)) throw ApiException.bad("This booking can no longer be cancelled");
    String why = reason == null || reason.isBlank() ? "Cancelled by customer" : reason.trim();
    core.moveTo(b, BookingRules.CANCELLED, BookingCore.Actor.customer, why);
    b.cancelReason = why;
    return mapper.booking(core.commit(b, notify.cancelled(b, "customer")));
  }

  @Transactional
  public Api.Booking reschedule(CurrentUser user, String bookingId, LocalDate date, String slot) {
    Booking b = own(user, bookingId);
    if (!BookingRules.canCustomerModify(b.status)) throw ApiException.bad("This booking can no longer be rescheduled");
    if (date == null || slot == null || Schedules.isPast(date, slot, core.clock())) throw ApiException.bad("Please choose a future time slot");
    b.date = date;
    b.slot = slot;
    core.event(b, "rescheduled", "customer", "Moved to " + date + " " + slot);
    return mapper.booking(core.commit(b, notify.rescheduled(b)));
  }

  /** "Cash after service" — collected by the professional on completion. */
  @Transactional
  public Api.Booking chooseCash(CurrentUser user, String bookingId) {
    Booking b = own(user, bookingId);
    b.paymentMethod = "cash";
    return mapper.booking(core.commit(b, List.of()));
  }

  public record ReviewInput(String bookingId, int rating, String text, List<String> images) {}

  @Transactional
  public Api.Review submitReview(CurrentUser user, ReviewInput in) {
    Booking b = own(user, in.bookingId());
    if (!BookingRules.COMPLETED.equals(b.status) || b.vendorId == null) throw ApiException.bad("You can review a booking once it is completed");
    if (b.reviewId != null) throw ApiException.conflict("You have already reviewed this booking");
    Review r = new Review();
    r.id = Ids.newId("rev");
    r.bookingId = b.id;
    r.customerId = b.customerId;
    r.customerName = b.customerName;
    r.vendorId = b.vendorId;
    r.categoryId = b.categoryId;
    r.rating = Math.min(5, Math.max(1, in.rating()));
    r.text = in.text() == null ? "" : in.text().trim();
    r.images.addAll(files.attachAll(in.images(), user));
    r.status = "published";
    r.createdAt = core.clock().instant();
    reviews.save(r);
    b.reviewId = r.id;
    core.event(b, "reviewed", "customer", null);
    core.commit(b, List.of());
    refreshVendorRating(r.vendorId);
    return mapper.review(r);
  }

  /** rating = average of published reviews to one decimal; ratingCount = their number. */
  void refreshVendorRating(String vendorId) {
    List<Review> published = reviews.findByVendorIdAndStatus(vendorId, "published");
    Vendor v = vendors.findById(vendorId).orElseThrow();
    v.ratingCount = published.size();
    v.rating = published.isEmpty() ? BigDecimal.ZERO
        : BigDecimal.valueOf(published.stream().mapToInt(x -> x.rating).sum()).divide(BigDecimal.valueOf(published.size()), 1, RoundingMode.HALF_UP);
    live.notify("vendor", vendorId, null);
    live.notify("public", "all", null);
  }

  public record ComplaintInput(String bookingId, String subject, String message) {}

  @Transactional
  public Api.Complaint raiseComplaint(CurrentUser user, ComplaintInput in) {
    Booking b = own(user, in.bookingId());
    if (in.subject() == null || in.subject().isBlank() || in.message() == null || in.message().isBlank()) throw ApiException.bad("Add a subject and a short description");
    Complaint c = new Complaint();
    c.id = Ids.newId("cmp");
    c.bookingId = b.id;
    c.customerId = b.customerId;
    c.vendorId = b.vendorId;
    c.subject = in.subject().trim();
    c.message = in.message().trim();
    c.status = "open";
    c.createdAt = core.clock().instant();
    complaints.save(c);
    notifications.publish(notify.complaint(b, c.subject));
    live.notify("customer", b.customerId, b.id);
    return mapper.complaint(c);
  }

  public List<Booking> forCustomer(String customerId) {
    return bookings.findByCustomerIdOrderByCreatedAtDesc(customerId);
  }
}
