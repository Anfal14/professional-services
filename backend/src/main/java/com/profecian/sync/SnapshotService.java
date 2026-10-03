package com.profecian.sync;

import com.profecian.admin.AdminUser;
import com.profecian.auth.CurrentUser;
import com.profecian.bookings.Booking;
import com.profecian.bookings.BookingRepository;
import com.profecian.catalog.CatalogRepositories.CategoryRepository;
import com.profecian.catalog.CatalogRepositories.ProblemTypeRepository;
import com.profecian.complaints.Complaint;
import com.profecian.customers.CustomerRepository;
import com.profecian.notifications.Notification;
import com.profecian.payouts.Payout;
import com.profecian.reviews.Review;
import com.profecian.settings.SettingsService;
import com.profecian.vendors.VendorRepository;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The `Database` snapshot each app renders from, scoped to the caller:
 *  - anonymous: catalogue, settings and published reviews;
 *  - customer: + their profile, bookings, complaints and notifications, and the vendors on their bookings (no KYC/bank);
 *  - vendor: + their own profile (full), jobs, reviews, payouts and notifications;
 *  - admin: everything, with the admin inbox.
 */
@Service
public class SnapshotService {
  /** Matches DB_VERSION in packages/shared/src/seed.ts. */
  public static final int VERSION = 7;

  private final CategoryRepository categories;
  private final ProblemTypeRepository problemTypes;
  private final SettingsService settings;
  private final CustomerRepository customers;
  private final VendorRepository vendors;
  private final AdminUser.Repository admins;
  private final BookingRepository bookings;
  private final Review.Repository reviews;
  private final Complaint.Repository complaints;
  private final Payout.Repository payouts;
  private final Notification.Repository notifications;
  private final ApiMapper mapper;

  public SnapshotService(CategoryRepository categories, ProblemTypeRepository problemTypes, SettingsService settings, CustomerRepository customers,
                         VendorRepository vendors, AdminUser.Repository admins, BookingRepository bookings, Review.Repository reviews,
                         Complaint.Repository complaints, Payout.Repository payouts, Notification.Repository notifications, ApiMapper mapper) {
    this.categories = categories;
    this.problemTypes = problemTypes;
    this.settings = settings;
    this.customers = customers;
    this.vendors = vendors;
    this.admins = admins;
    this.bookings = bookings;
    this.reviews = reviews;
    this.complaints = complaints;
    this.payouts = payouts;
    this.notifications = notifications;
    this.mapper = mapper;
  }

  @Transactional(readOnly = true)
  public Api.Database build(Optional<CurrentUser> who) {
    var cats = categories.findAllByOrderBySortOrderAsc().stream().map(mapper::category).toList();
    var problems = problemTypes.findAllByOrderByCategoryIdAscIdAsc().stream().map(mapper::problemType).toList();
    var s = mapper.settings(settings.get(), settings.cities());
    List<Api.Review> published = reviews.findByStatusOrderByCreatedAtDesc("published").stream().map(mapper::review).toList();

    if (who.isEmpty()) {
      return new Api.Database(VERSION, cats, problems, List.of(), List.of(), List.of(), List.of(), published, List.of(), List.of(), List.of(), s);
    }
    CurrentUser u = who.get();
    return switch (u.role()) {
      case "customer" -> {
        List<Booking> mine = bookings.findByCustomerIdOrderByCreatedAtDesc(u.id());
        Set<String> vendorIds = mine.stream().map(b -> b.vendorId).filter(java.util.Objects::nonNull).collect(Collectors.toSet());
        var vendorList = vendors.findAllById(vendorIds).stream().map(v -> mapper.vendor(v, false)).toList();
        Map<String, Api.Review> rv = new LinkedHashMap<>();
        published.forEach(r -> rv.put(r.id(), r));
        reviews.findByCustomerIdOrderByCreatedAtDesc(u.id()).forEach(r -> rv.putIfAbsent(r.id, mapper.review(r)));
        yield new Api.Database(VERSION, cats, problems,
            customers.findById(u.id()).map(mapper::customer).stream().toList(),
            vendorList, List.of(),
            mine.stream().map(mapper::booking).toList(),
            List.copyOf(rv.values()),
            complaints.findByCustomerIdOrderByCreatedAtDesc(u.id()).stream().map(mapper::complaint).toList(),
            List.of(),
            notifications.findByAudienceAndRecipientIdOrderByCreatedAtDesc("customer", u.id()).stream().map(mapper::notification).toList(),
            s);
      }
      case "vendor" -> new Api.Database(VERSION, cats, problems, List.of(),
          vendors.findById(u.id()).map(v -> mapper.vendor(v, true)).stream().toList(), List.of(),
          bookings.findByVendorIdOrderByCreatedAtDesc(u.id()).stream().map(mapper::booking).toList(),
          reviews.findByVendorIdOrderByCreatedAtDesc(u.id()).stream().map(mapper::review).toList(),
          List.of(),
          payouts.findByVendorIdOrderByCreatedAtDesc(u.id()).stream().map(mapper::payout).toList(),
          notifications.findByAudienceAndRecipientIdOrderByCreatedAtDesc("vendor", u.id()).stream().map(mapper::notification).toList(),
          s);
      case "admin" -> new Api.Database(VERSION, cats, problems,
          customers.findAll().stream().map(mapper::customer).toList(),
          vendors.findAllByOrderByJoinedAtDesc().stream().map(v -> mapper.vendor(v, true)).toList(),
          admins.findAll().stream().map(a -> new Api.AdminUser(a.id, a.name, a.email, a.role)).toList(),
          bookings.findAllByOrderByCreatedAtDesc().stream().map(mapper::booking).toList(),
          reviews.findAllByOrderByCreatedAtDesc().stream().map(mapper::review).toList(),
          complaints.findAllByOrderByCreatedAtDesc().stream().map(mapper::complaint).toList(),
          payouts.findAllByOrderByCreatedAtDesc().stream().map(mapper::payout).toList(),
          notifications.findByAudienceOrderByCreatedAtDesc("admin").stream().map(mapper::notification).toList(),
          s);
      default -> throw new IllegalStateException("Unknown role " + u.role());
    };
  }
}
