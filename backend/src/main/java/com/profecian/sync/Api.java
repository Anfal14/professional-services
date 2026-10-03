package com.profecian.sync;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * Wire shapes — field-for-field the TypeScript types in packages/shared/src/types.ts, so the
 * HTTP backend in the apps can hand them to screens unchanged. Null fields are omitted.
 */
public final class Api {
  private Api() {}

  public record ServiceCategory(String id, String name, String tagline, String description, String icon, String image, String tint,
                                boolean enabled, boolean popular, BigDecimal commissionRate, Integer inspectionFee, List<String> includes, int sortOrder) {}

  public record ProblemType(String id, String categoryId, String name, String description, String icon, BigDecimal price,
                            String pricingModel, int durationMins, boolean enabled) {}

  public record Address(String id, String label, String line, String landmark, String city, String pincode, Double lat, Double lng) {}

  public record Customer(String id, String name, String phone, String email, String city, List<Address> addresses, boolean blocked, Instant createdAt) {}

  public record KycDocument(String type, String number, String imageUri, String status, String note, Instant uploadedAt) {}

  public record BankAccount(String holderName, String accountLast4, String ifsc, String bankName) {}

  public record WorkingHours(String start, String end, List<Integer> days) {}

  public record Location(double lat, double lng) {}

  public record Vendor(String id, String name, String phone, String email, String photo, String city, List<String> serviceAreas,
                       List<String> categoryIds, String status, List<KycDocument> kyc, BankAccount bank, boolean available,
                       WorkingHours workingHours, BigDecimal rating, int ratingCount, int jobsCompleted, Location location,
                       Instant joinedAt, Instant kycSubmittedAt, String rejectionReason) {}

  public record AdminUser(String id, String name, String email, String role) {}

  public record PriceBreakdown(BigDecimal serviceAmount, BigDecimal tax, BigDecimal total, BigDecimal commissionRate, BigDecimal commission, BigDecimal vendorPayout) {}

  public record BookingPayment(String method, String status, Instant paidAt, String txnId, String failureReason) {}

  public record BookingEvent(String kind, Instant at, String by, String note) {}

  public record BookingItem(String problemTypeId, String name, BigDecimal price) {}

  public record QuoteLine(String description, BigDecimal amount) {}

  public record InspectionQuote(List<QuoteLine> lines, BigDecimal amount, String note, String vendorId, Instant createdAt, Instant respondedAt, String respondedBy) {}

  public record ClarificationMessage(String id, String from, String authorName, String text, Instant at) {}

  public record InspectionRequest(String description, List<String> photos, int fee, String status, InspectionQuote quote,
                                  List<ClarificationMessage> messages, boolean awaitingCustomer, String noWorkNote) {}

  public record Booking(String id, String code, String customerId, String customerName, String customerPhone, String categoryId,
                        String problemTypeId, List<BookingItem> items, InspectionRequest inspection, LocalDate date, String slot,
                        Address address, String notes, String status, String vendorId, PriceBreakdown price, BookingPayment payment,
                        List<String> proofPhotos, List<BookingEvent> timeline, Instant createdAt, String cancelReason, String reviewId) {}

  public record Review(String id, String bookingId, String customerId, String customerName, String vendorId, String categoryId,
                       int rating, String text, List<String> images, String status, Instant createdAt) {}

  public record Complaint(String id, String bookingId, String customerId, String vendorId, String subject, String message,
                          String status, String resolution, Instant createdAt) {}

  public record Payout(String id, String vendorId, BigDecimal amount, List<String> bookingIds, String status, Instant createdAt, Instant settledAt, String utr) {}

  public record AppNotification(String id, String audience, String recipientId, String kind, String title, String body,
                                List<String> channels, String bookingId, String whatsappUrl, boolean read, Instant createdAt) {}

  public record PlatformSettings(BigDecimal taxRate, BigDecimal defaultCommissionRate, int defaultInspectionFee, List<String> cities,
                                 String whatsappNumber, String supportPhone) {}

  /** The whole snapshot a client renders from — `Database` in types.ts, scoped to the caller. */
  public record Database(int version, List<ServiceCategory> categories, List<ProblemType> problemTypes, List<Customer> customers,
                         List<Vendor> vendors, List<AdminUser> admins, List<Booking> bookings, List<Review> reviews,
                         List<Complaint> complaints, List<Payout> payouts, List<AppNotification> notifications, PlatformSettings settings) {}

  public record Session(String role, String userId) {}

  public record Tokens(String accessToken, String refreshToken, long expiresIn) {}

  /** Response of the OTP verify endpoints: the user (or null) plus tokens, or a signup token for a new number. */
  public record VerifyResult(String phone, Customer customer, Vendor vendor, Session session, Tokens tokens, String signupToken) {}

  public record LoginResult(AdminUser admin, Session session, Tokens tokens) {}

  public record OtpSent(String requestId, int resendInSec) {}

  public record VendorSuggestion(Vendor vendor, double distanceKm, int workload, boolean matchesService, boolean available, double score) {}

  public record Count(@JsonProperty("count") int count) {}
}
