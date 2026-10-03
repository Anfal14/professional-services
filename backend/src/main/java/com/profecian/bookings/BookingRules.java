package com.profecian.bookings;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/** Booking status rules — VENDOR_NEXT, ACTIVE_STATUSES and canCustomerModify in status.ts. */
public final class BookingRules {
  private BookingRules() {}

  public static final String PENDING_ASSIGNMENT = "pending_assignment";
  public static final String ASSIGNED = "assigned";
  public static final String ACCEPTED = "accepted";
  public static final String ON_THE_WAY = "on_the_way";
  public static final String ARRIVED = "arrived";
  public static final String IN_PROGRESS = "in_progress";
  public static final String COMPLETED = "completed";
  public static final String CANCELLED = "cancelled";

  public static final List<String> ALL = List.of(PENDING_ASSIGNMENT, ASSIGNED, ACCEPTED, ON_THE_WAY, ARRIVED, IN_PROGRESS, COMPLETED, CANCELLED);

  /** The one step a vendor may take from each status. */
  public static final Map<String, String> VENDOR_NEXT = Map.of(
      ASSIGNED, ACCEPTED,
      ACCEPTED, ON_THE_WAY,
      ON_THE_WAY, ARRIVED,
      ARRIVED, IN_PROGRESS,
      IN_PROGRESS, COMPLETED);

  public static Optional<String> vendorNext(String status) {
    return Optional.ofNullable(VENDOR_NEXT.get(status));
  }

  /** Customers may cancel or reschedule until the professional is on the way. */
  public static boolean canCustomerModify(String status) {
    return PENDING_ASSIGNMENT.equals(status) || ASSIGNED.equals(status) || ACCEPTED.equals(status);
  }

  public static boolean isClosed(String status) {
    return COMPLETED.equals(status) || CANCELLED.equals(status);
  }

  public static boolean isValid(String status) {
    return ALL.contains(status);
  }
}
