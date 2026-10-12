package com.profecian.bookings;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Safeguards on a professional's job workflow — job.ts on the frontend (same rules and messages).
 *
 * 1. Start code: created on arrival, shown to the customer, entered by the professional to start.
 * 2. After photo: at least one before the service can be completed.
 * 3. Undo: each step can be taken back for a few seconds.
 * 4. One at a time: a professional can have only one job in progress.
 */
public final class VendorJobRules {
  private VendorJobRules() {}

  public static final int START_CODE_LENGTH = 4;
  public static final int START_CODE_MAX_ATTEMPTS = 5;
  public static final Duration UNDO_WINDOW = Duration.ofSeconds(10);
  /** Allowance on top of the window for a slow network. */
  public static final Duration UNDO_GRACE = Duration.ofSeconds(5);
  /** Messages about a step are sent only once it can no longer be undone. */
  public static final Duration NOTIFY_AFTER = UNDO_WINDOW.plus(UNDO_GRACE).plusSeconds(5);
  public static final int MIN_AFTER_PHOTOS = 1;
  public static final int MAX_PROOF_PHOTOS = 6;

  public static final String STEP_UNDONE = "step_undone";
  /** Notifications a vendor step sends — taken back if the step is undone. */
  public static final List<String> STEP_NOTIFICATIONS = List.of("vendor_on_the_way", "vendor_arrived", "service_completed");

  public static final String START_CODE_MISSING = "Enter the " + START_CODE_LENGTH + "-digit start code from the customer’s app";
  public static final String START_CODE_LOCKED = "Too many wrong codes. Ask support to start this job.";
  public static final String AFTER_PHOTO = "Add at least one “after” photo before completing the service";
  public static final String TOO_MANY_PHOTOS = "You can add up to " + MAX_PROOF_PHOTOS + " photos of each kind";
  public static final String UNDO_EXPIRED = "This step can no longer be undone";
  public static final String CASH_AMOUNT_MISSING = "Enter the amount you received";
  public static final String CASH_AMOUNT_MISMATCH = "The amount received must match the amount due";

  public static String startCodeWrong(int triesLeft) {
    return "That code doesn’t match — ask the customer for the start code in their app (" + triesLeft + (triesLeft == 1 ? " try" : " tries") + " left)";
  }

  public static String busy(String code) {
    return "Finish job " + code + " first — only one job can be in progress at a time";
  }

  private static final SecureRandom RANDOM = new SecureRandom();

  public static boolean isValidStartCode(String code) {
    return code != null && code.matches("\\d{" + START_CODE_LENGTH + "}");
  }

  /** A new random start code, e.g. "0482". */
  public static String newStartCode() {
    return String.format("%0" + START_CODE_LENGTH + "d", RANDOM.nextInt((int) Math.pow(10, START_CODE_LENGTH)));
  }

  /** The status each vendor step came from — the inverse of VENDOR_NEXT. */
  public static final Map<String, String> VENDOR_PREVIOUS =
      BookingRules.VENDOR_NEXT.entrySet().stream().collect(Collectors.toUnmodifiableMap(Map.Entry::getValue, Map.Entry::getKey));

  /** BOOKING_STATUS labels in status.ts, for the "Undid …" timeline note. */
  public static final Map<String, String> STEP_LABEL = Map.of(
      BookingRules.ACCEPTED, "Accepted",
      BookingRules.ON_THE_WAY, "On the way",
      BookingRules.ARRIVED, "Arrived",
      BookingRules.IN_PROGRESS, "In progress",
      BookingRules.COMPLETED, "Completed");

  /**
   * The status to go back to if the professional's last step can still be undone — undoableStep in
   * job.ts. The step must be the very last thing that happened to the booking, done by the
   * professional, within the window, and a completed job must not have been paid or reviewed.
   */
  public static Optional<String> undoTarget(Booking b, Instant now) {
    if (b.timeline.isEmpty()) return Optional.empty();
    Booking.Event last = b.timeline.get(b.timeline.size() - 1);
    String previous = VENDOR_PREVIOUS.get(b.status);
    if (previous == null || !"vendor".equals(last.byRole) || !b.status.equals(last.kind)) return Optional.empty();
    if (Duration.between(last.at, now).compareTo(UNDO_WINDOW.plus(UNDO_GRACE)) > 0) return Optional.empty();
    if (BookingRules.COMPLETED.equals(b.status) && ("paid".equals(b.paymentStatus) || "pending".equals(b.paymentStatus) || b.reviewId != null)) return Optional.empty();
    return Optional.of(previous);
  }
}
