package com.profecian.admin;

import com.profecian.analytics.AnalyticsService;
import com.profecian.assignment.VendorMatcher;
import com.profecian.bookings.AdminBookingService;
import com.profecian.bookings.BookingCore;
import com.profecian.bookings.BookingRepository;
import com.profecian.catalog.CatalogService;
import com.profecian.customers.CustomerRepository;
import com.profecian.customers.CustomerService;
import com.profecian.payments.LedgerEntry;
import com.profecian.payouts.PayoutService;
import com.profecian.reviews.ModerationService;
import com.profecian.settings.SettingsService;
import com.profecian.sync.Api;
import com.profecian.sync.ApiMapper;
import com.profecian.vendors.VendorRepository;
import com.profecian.vendors.VendorService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin panel API. Each endpoint requires the permission its screen needs in ROLE_PERMISSIONS
 * (dashboard, users, vendors, services, bookings, payments, reviews, analytics, settings).
 */
@RestController
@RequestMapping("/api/v1/admin")
@Tag(name = "Admin")
@SecurityRequirement(name = "bearer")
public class AdminController {
  private final CustomerService customers;
  private final CustomerRepository customerRepo;
  private final VendorService vendors;
  private final VendorRepository vendorRepo;
  private final CatalogService catalog;
  private final AdminBookingService bookings;
  private final BookingRepository bookingRepo;
  private final BookingCore core;
  private final VendorMatcher matcher;
  private final PayoutService payouts;
  private final LedgerEntry.Repository ledger;
  private final ModerationService moderation;
  private final SettingsService settings;
  private final AnalyticsService analytics;
  private final ApiMapper mapper;

  public AdminController(CustomerService customers, CustomerRepository customerRepo, VendorService vendors, VendorRepository vendorRepo, CatalogService catalog,
                         AdminBookingService bookings, BookingRepository bookingRepo, BookingCore core, VendorMatcher matcher, PayoutService payouts,
                         LedgerEntry.Repository ledger, ModerationService moderation, SettingsService settings, AnalyticsService analytics, ApiMapper mapper) {
    this.customers = customers;
    this.customerRepo = customerRepo;
    this.vendors = vendors;
    this.vendorRepo = vendorRepo;
    this.catalog = catalog;
    this.bookings = bookings;
    this.bookingRepo = bookingRepo;
    this.core = core;
    this.matcher = matcher;
    this.payouts = payouts;
    this.ledger = ledger;
    this.moderation = moderation;
    this.settings = settings;
    this.analytics = analytics;
    this.mapper = mapper;
  }

  /* ───── Dashboard & analytics ───── */

  @GetMapping("/dashboard")
  @PreAuthorize("hasAuthority('PERM_dashboard')")
  public Map<String, Object> dashboard() {
    return Map.of("kpis", analytics.kpis(), "daily", analytics.daily(30));
  }

  @GetMapping("/analytics")
  @PreAuthorize("hasAuthority('PERM_analytics')")
  public Map<String, Object> analytics(@RequestParam(defaultValue = "30") int days) {
    return Map.of("kpis", analytics.kpis(), "daily", analytics.daily(Math.min(Math.max(days, 1), 365)), "topServices", analytics.topServices(),
        "topVendors", analytics.topVendors(), "cities", analytics.cities(), "paymentMix", analytics.paymentMix());
  }

  /* ───── Users ───── */

  @GetMapping("/customers")
  @PreAuthorize("hasAuthority('PERM_users')")
  @Transactional(readOnly = true)
  public List<Api.Customer> listCustomers() {
    return customerRepo.findAll().stream().map(mapper::customer).toList();
  }

  public record Blocked(boolean blocked) {}

  @PostMapping("/customers/{id}/blocked")
  @PreAuthorize("hasAuthority('PERM_users')")
  public ResponseEntity<Void> setBlocked(@PathVariable String id, @RequestBody Blocked b) {
    customers.setBlocked(id, b.blocked());
    return ResponseEntity.noContent().build();
  }

  /* ───── Vendors ───── */

  @GetMapping("/vendors")
  @PreAuthorize("hasAuthority('PERM_vendors')")
  @Transactional(readOnly = true)
  public List<Api.Vendor> listVendors() {
    return vendorRepo.findAllByOrderByJoinedAtDesc().stream().map(v -> mapper.vendor(v, true)).toList();
  }

  public record Decision(String decision, String reason) {}

  public record DocStatus(String status, String note) {}

  public record Categories(List<String> categoryIds) {}

  @PostMapping("/vendors/{id}/review")
  @PreAuthorize("hasAuthority('PERM_vendors')")
  public ResponseEntity<Void> reviewVendor(@PathVariable String id, @RequestBody Decision d) {
    vendors.review(id, d.decision(), d.reason());
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/vendors/{id}/documents/{type}")
  @PreAuthorize("hasAuthority('PERM_vendors')")
  public ResponseEntity<Void> verifyDocument(@PathVariable String id, @PathVariable String type, @RequestBody DocStatus s) {
    vendors.verifyDocument(id, type, s.status(), s.note());
    return ResponseEntity.noContent().build();
  }

  @PutMapping("/vendors/{id}/categories")
  @PreAuthorize("hasAuthority('PERM_vendors')")
  public ResponseEntity<Void> setCategories(@PathVariable String id, @RequestBody Categories c) {
    vendors.setCategories(id, c.categoryIds());
    return ResponseEntity.noContent().build();
  }

  /* ───── Catalogue ───── */

  @PutMapping("/categories")
  @PreAuthorize("hasAuthority('PERM_services')")
  public Api.ServiceCategory saveCategory(@RequestBody CatalogService.CategoryInput c) {
    return catalog.saveCategory(c);
  }

  @PutMapping("/problem-types")
  @PreAuthorize("hasAuthority('PERM_services')")
  public Api.ProblemType saveProblemType(@RequestBody CatalogService.ProblemTypeInput p) {
    return catalog.saveProblemType(p);
  }

  @DeleteMapping("/problem-types/{id}")
  @PreAuthorize("hasAuthority('PERM_services')")
  public ResponseEntity<Void> deleteProblemType(@PathVariable String id) {
    catalog.deleteProblemType(id);
    return ResponseEntity.noContent().build();
  }

  /* ───── Bookings & assignment ───── */

  @GetMapping("/bookings")
  @PreAuthorize("hasAuthority('PERM_bookings')")
  @Transactional(readOnly = true)
  public Page<Api.Booking> listBookings(@RequestParam(required = false) String status, @RequestParam(required = false) String q,
                                        @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "50") int size) {
    String like = q == null || q.isBlank() ? null : "%" + q.trim().toLowerCase() + "%";
    return bookingRepo.search(status, like, PageRequest.of(page, Math.min(size, 200))).map(mapper::booking);
  }

  @GetMapping("/bookings/{id}/suggestions")
  @PreAuthorize("hasAuthority('PERM_bookings')")
  public List<Api.VendorSuggestion> suggestions(@PathVariable String id) {
    return matcher.suggest(core.load(id));
  }

  public record Assign(String vendorId) {}

  public record Status(String status, String note) {}

  public record Question(String question) {}

  public record QuoteAnswer(boolean approve, String note) {}

  @PostMapping("/bookings/{id}/assign")
  @PreAuthorize("hasAuthority('PERM_bookings')")
  public Api.Booking assign(@PathVariable String id, @RequestBody Assign a) {
    return bookings.assign(id, a.vendorId());
  }

  @PostMapping("/bookings/{id}/status")
  @PreAuthorize("hasAuthority('PERM_bookings')")
  public Api.Booking setStatus(@PathVariable String id, @RequestBody Status s) {
    return bookings.setStatus(id, s.status(), s.note());
  }

  @PostMapping("/bookings/{id}/ask")
  @PreAuthorize("hasAuthority('PERM_bookings')")
  public Api.Booking ask(@PathVariable String id, @RequestBody Question q) {
    return bookings.askCustomer(id, q.question());
  }

  @PostMapping("/bookings/{id}/quote")
  @PreAuthorize("hasAuthority('PERM_bookings')")
  public Api.Booking respondToQuote(@PathVariable String id, @RequestBody QuoteAnswer a) {
    return bookings.respondToQuote(id, a.approve(), a.note());
  }

  @PostMapping("/reminders/today")
  @PreAuthorize("hasAuthority('PERM_bookings')")
  public Api.Count reminders() {
    return new Api.Count(bookings.sendTodayReminders());
  }

  /* ───── Payments & payouts ───── */

  @GetMapping("/ledger")
  @PreAuthorize("hasAuthority('PERM_payments')")
  public List<LedgerEntry> ledger() {
    return ledger.findTop500ByOrderByCreatedAtDesc();
  }

  public record VendorRef(String vendorId) {}

  public record PayoutStatus(String status) {}

  @PostMapping("/payouts")
  @PreAuthorize("hasAuthority('PERM_payments')")
  public Api.Payout createPayout(@RequestBody VendorRef v) {
    return payouts.request(v.vendorId());
  }

  @PatchMapping("/payouts/{id}")
  @PreAuthorize("hasAuthority('PERM_payments')")
  public Api.Payout updatePayout(@PathVariable String id, @RequestBody PayoutStatus s) {
    return payouts.update(id, s.status());
  }

  /* ───── Reviews & complaints ───── */

  public record ReviewStatus(String status) {}

  public record ComplaintUpdate(String status, String resolution) {}

  @PatchMapping("/reviews/{id}")
  @PreAuthorize("hasAuthority('PERM_reviews')")
  public Api.Review setReviewStatus(@PathVariable String id, @RequestBody ReviewStatus s) {
    return moderation.setReviewStatus(id, s.status());
  }

  @PatchMapping("/complaints/{id}")
  @PreAuthorize("hasAuthority('PERM_reviews')")
  public Api.Complaint updateComplaint(@PathVariable String id, @RequestBody ComplaintUpdate c) {
    return moderation.updateComplaint(id, c.status(), c.resolution());
  }

  /* ───── Settings ───── */

  @PatchMapping("/settings")
  @PreAuthorize("hasAuthority('PERM_settings')")
  @Transactional
  public Api.PlatformSettings updateSettings(@RequestBody SettingsService.Patch patch) {
    return mapper.settings(settings.update(patch), settings.cities());
  }
}
