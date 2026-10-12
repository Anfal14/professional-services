package com.profecian.bookings;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.profecian.common.Schedules;
import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

/** Same cases as the "release rules" block of packages/shared/test/release.test.ts. */
class ReleaseRulesTest {
  private static final LocalDate DAY = LocalDate.of(2026, 10, 12);

  private static Booking booking(String status, String slot) {
    Booking b = new Booking();
    b.status = status;
    b.date = DAY;
    b.slot = slot;
    return b;
  }

  /** `minutes` before the 02:00 PM slot. */
  private static Instant before(int minutes) {
    return Schedules.scheduledAt(DAY, "02:00 PM").toInstant().minusSeconds(minutes * 60L);
  }

  @Test
  void onlyAcceptedAndOnTheWayJobsCanBeReleased() {
    assertThat(ReleaseRules.canRelease("accepted")).isTrue();
    assertThat(ReleaseRules.canRelease("on_the_way")).isTrue();
    for (String s : new String[] {"assigned", "arrived", "in_progress", "completed", "cancelled", "pending_assignment"}) {
      assertThat(ReleaseRules.canRelease(s)).isFalse();
    }
  }

  @Test
  void lateMeansTwoHoursOrLessToTheSlotOrAlreadyOnTheWay() {
    Booking accepted = booking("accepted", "02:00 PM");
    assertThat(ReleaseRules.isLate(accepted, before(121))).isFalse();
    assertThat(ReleaseRules.isLate(accepted, before(120))).isTrue(); // exactly 2 hours is late
    assertThat(ReleaseRules.isLate(accepted, before(30))).isTrue();
    assertThat(ReleaseRules.isLate(accepted, before(-45))).isTrue(); // the slot has passed
    assertThat(ReleaseRules.isLate(accepted, before(60 * 26))).isFalse();
    // On the way is late however far off the slot is.
    assertThat(ReleaseRules.isLate(booking("on_the_way", "02:00 PM"), before(60 * 26))).isTrue();
  }

  @Test
  void aReleaseNeedsAReasonAndOtherNeedsANote() {
    assertThatCode(() -> ReleaseRules.checkRelease("unwell", null)).doesNotThrowAnyException();
    assertThatCode(() -> ReleaseRules.checkRelease("other", "Family emergency")).doesNotThrowAnyException();
    assertThatThrownBy(() -> ReleaseRules.checkRelease(null, null)).hasMessage(ReleaseRules.ERR_REASON);
    assertThatThrownBy(() -> ReleaseRules.checkRelease("bored", null)).hasMessage(ReleaseRules.ERR_REASON);
    assertThatThrownBy(() -> ReleaseRules.checkRelease("other", null)).hasMessage(ReleaseRules.ERR_NOTE);
    assertThatThrownBy(() -> ReleaseRules.checkRelease("other", "no")).hasMessage(ReleaseRules.ERR_NOTE);
  }

  @Test
  void onSiteReportsDependOnTheStage() {
    assertThat(ReleaseRules.issueKindsFor("arrived")).containsExactly("customer_unavailable", "cant_do");
    assertThat(ReleaseRules.issueKindsFor("in_progress")).containsExactly("cant_complete");
    assertThat(ReleaseRules.issueKindsFor("accepted")).isEmpty();

    assertThatCode(() -> ReleaseRules.checkIssue("arrived", "customer_unavailable", null, "Nobody answered the door")).doesNotThrowAnyException();
    assertThatThrownBy(() -> ReleaseRules.checkIssue("arrived", "cant_do", null, null)).hasMessage(ReleaseRules.ERR_NOTE);
    assertThatThrownBy(() -> ReleaseRules.checkIssue("arrived", "cant_complete", "needs_part", null)).hasMessage(ReleaseRules.ERR_ISSUE_KIND);
    assertThatThrownBy(() -> ReleaseRules.checkIssue("accepted", "cant_do", null, "Too far away")).hasMessage(ReleaseRules.ERR_ISSUE_STAGE);

    assertThatCode(() -> ReleaseRules.checkIssue("in_progress", "cant_complete", "needs_part", null)).doesNotThrowAnyException();
    assertThatThrownBy(() -> ReleaseRules.checkIssue("in_progress", "cant_complete", null, null)).hasMessage(ReleaseRules.ERR_REASON);
    assertThatThrownBy(() -> ReleaseRules.checkIssue("in_progress", "cant_complete", "other", null)).hasMessage(ReleaseRules.ERR_NOTE);
    assertThatThrownBy(() -> ReleaseRules.checkIssue("in_progress", "customer_unavailable", null, "Gone out")).hasMessage(ReleaseRules.ERR_ISSUE_KIND);
  }

  @Test
  void timelineNotesSayWhoWhyAndWhetherItWasLate() {
    assertThat(ReleaseRules.releaseNote(new Booking.Release("ven_1", "Ravi Patil", "vehicle_problem", null, true, Instant.EPOCH)))
        .isEqualTo("Ravi Patil released the job — Vehicle problem (late release)");
    assertThat(ReleaseRules.releaseNote(new Booking.Release("ven_1", "Ravi Patil", "other", "Family emergency", false, Instant.EPOCH)))
        .isEqualTo("Ravi Patil released the job — Other: Family emergency (early release)");
    Booking b = new Booking();
    b.issueVendorName = "Ravi Patil";
    b.issueKind = "cant_complete";
    b.issueReason = "needs_part";
    b.issueNote = "Capacitor not in stock";
    assertThat(ReleaseRules.issueNote(b)).isEqualTo("Ravi Patil: Can’t complete — Needs a part: Capacitor not in stock");
  }

  @Test
  void completionRateCountsOnlyLateReleasesAndIsNewUntilFiveJobs() {
    assertThat(ReleaseRules.completionRate(0, 0)).isNull();
    assertThat(ReleaseRules.completionRate(4, 1)).isNull();
    assertThat(ReleaseRules.completionRate(5, 0)).isEqualTo(100);
    assertThat(ReleaseRules.completionRate(5, 1)).isEqualTo(80);
    assertThat(ReleaseRules.completionRate(20, 3)).isEqualTo(85);
    assertThat(ReleaseRules.completionRate(7, 1)).isEqualTo(86); // 85.71
    assertThat(ReleaseRules.completionRate(8, 1)).isEqualTo(88); // 87.5 rounds up
  }

  @Test
  void aLowerCompletionRateRanksLower() {
    assertThat(ReleaseRules.reliabilityPenalty(null)).isZero(); // "New" is not penalised
    assertThat(ReleaseRules.reliabilityPenalty(100)).isZero();
    assertThat(ReleaseRules.reliabilityPenalty(80)).isEqualTo(4.0);
    assertThat(ReleaseRules.reliabilityPenalty(50)).isEqualTo(10.0);
  }
}
