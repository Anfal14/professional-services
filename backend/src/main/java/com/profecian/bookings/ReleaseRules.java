package com.profecian.bookings;

import com.profecian.common.ApiException;
import com.profecian.common.Schedules;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Giving a job back after accepting it — release.ts on the frontend (same rules and messages).
 *
 * A professional never cancels the customer's booking: they release it, and it returns to the
 * admin's queue without them. On site there is no release — they report a problem and the admin
 * decides. Only late releases (2 hours or less to the slot, or once on the way) count against the
 * completion rate.
 */
public final class ReleaseRules {
  private ReleaseRules() {}

  public static final String RELEASED = "released";
  public static final String ISSUE_REPORTED = "issue_reported";
  public static final String ISSUE_RESOLVED = "issue_resolved";

  public static final Map<String, String> REASON_LABEL = Map.of(
      "unwell", "Unwell",
      "vehicle_problem", "Vehicle problem",
      "previous_job_late", "Previous job running late",
      "wrong_service", "Wrong service for me",
      "other", "Other");

  public static final Map<String, String> CANT_COMPLETE_LABEL = Map.of(
      "needs_part", "Needs a part",
      "bigger_problem", "Bigger problem than booked",
      "safety", "Safety issue",
      "other", "Other");

  public static final Map<String, String> ISSUE_LABEL = Map.of(
      "customer_unavailable", "Customer not available",
      "cant_do", "Can’t do this job",
      "cant_complete", "Can’t complete");

  public static final Duration LATE_WINDOW = Duration.ofHours(2);
  public static final int NOTE_MIN = 5;

  public static final String ERR_REASON = "Choose a reason";
  public static final String ERR_NOTE = "Add a short note to explain";
  public static final String ERR_NOT_RELEASABLE = "This job can’t be released at this stage";
  public static final String ERR_ON_SITE = "You’re at the customer’s address — report the problem instead, and our team will decide with the customer";
  public static final String ERR_ISSUE_STAGE = "You can report a problem once you have arrived";
  public static final String ERR_ISSUE_KIND = "Choose what went wrong";
  public static final String ERR_NO_ISSUE = "There is nothing to resolve on this booking";
  public static final String ERR_RETURN_VISIT = "A return visit needs a professional on the booking";

  public static boolean canRelease(String status) {
    return BookingRules.ACCEPTED.equals(status) || BookingRules.ON_THE_WAY.equals(status);
  }

  /** Late: already on the way, or 2 hours or less to the slot (including a slot that has passed). */
  public static boolean isLate(Booking b, Instant now) {
    return BookingRules.ON_THE_WAY.equals(b.status)
        || Duration.between(now, Schedules.scheduledAt(b.date, b.slot).toInstant()).compareTo(LATE_WINDOW) <= 0;
  }

  public static List<String> issueKindsFor(String status) {
    return BookingRules.ARRIVED.equals(status) ? List.of("customer_unavailable", "cant_do")
        : BookingRules.IN_PROGRESS.equals(status) ? List.of("cant_complete") : List.of();
  }

  /** Trims and collapses whitespace; null when nothing is left. */
  public static String clean(String note) {
    if (note == null) return null;
    String t = note.trim().replaceAll("\\s+", " ");
    return t.isEmpty() ? null : t;
  }

  /** A reason from the list, plus a note when the reason is "Other" — checkRelease in release.ts. */
  public static void checkRelease(String reason, String cleanNote) {
    if (reason == null || !REASON_LABEL.containsKey(reason)) throw ApiException.bad(ERR_REASON);
    if ("other".equals(reason) && (cleanNote == null || cleanNote.length() < NOTE_MIN)) throw ApiException.bad(ERR_NOTE);
  }

  /** checkIssue in release.ts: arrived needs what went wrong plus a note; in progress a reason (plus a note for "Other"). */
  public static void checkIssue(String status, String kind, String reason, String cleanNote) {
    List<String> kinds = issueKindsFor(status);
    if (kinds.isEmpty()) throw ApiException.bad(ERR_ISSUE_STAGE);
    if (kind == null || !kinds.contains(kind)) throw ApiException.bad(ERR_ISSUE_KIND);
    boolean noNote = cleanNote == null || cleanNote.length() < NOTE_MIN;
    if ("cant_complete".equals(kind)) {
      if (reason == null || !CANT_COMPLETE_LABEL.containsKey(reason)) throw ApiException.bad(ERR_REASON);
      if ("other".equals(reason) && noNote) throw ApiException.bad(ERR_NOTE);
    } else if (noNote) {
      throw ApiException.bad(ERR_NOTE);
    }
  }

  /** Timeline text for a release: who, why, and whether it was late — releaseNote in release.ts. */
  public static String releaseNote(Booking.Release r) {
    return r.vendorName + " released the job — " + REASON_LABEL.get(r.reason) + (r.note != null ? ": " + r.note : "") + " (" + (r.late ? "late" : "early") + " release)";
  }

  /** Timeline text for an on-site report — issueNote in release.ts. */
  public static String issueNote(Booking b) {
    return b.issueVendorName + ": " + ISSUE_LABEL.get(b.issueKind)
        + (b.issueReason != null ? " — " + CANT_COMPLETE_LABEL.get(b.issueReason) : "") + (b.issueNote != null ? ": " + b.issueNote : "");
  }

  /* ───── Completion rate ───── */

  public static final int RELIABILITY_MIN_ACCEPTED = 5;

  /** (accepted − late releases) ÷ accepted as a whole percentage; null until 5 jobs are accepted ("New"). */
  public static Integer completionRate(int accepted, int lateReleases) {
    return accepted < RELIABILITY_MIN_ACCEPTED ? null : (int) Math.round((accepted - lateReleases) * 100.0 / accepted);
  }

  /** Added to a professional's ranking score (lower is better): 0.2 per point below 100%, nothing while "New". */
  public static double reliabilityPenalty(Integer rate) {
    return rate == null ? 0 : (100 - rate) * 0.2;
  }
}
