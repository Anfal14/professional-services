package com.profecian.bookings;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import org.junit.jupiter.api.Test;

/** Same cases as the "job rules" block of packages/shared/test/vendor-job.test.ts. */
class VendorJobRulesTest {
  private static final Instant T0 = Instant.parse("2026-10-10T10:00:00Z");

  /** A booking whose last timeline event is `kind` by `by`, made at T0. */
  private static Booking booking(String status, String kind, String by) {
    Booking b = new Booking();
    b.status = status;
    b.paymentStatus = "unpaid";
    b.timeline.add(new Booking.Event("assigned", "admin", null, T0.minusSeconds(600)));
    b.timeline.add(new Booking.Event(kind, by, null, T0));
    return b;
  }

  @Test
  void startCodesAreFourDigits() {
    assertThat(VendorJobRules.isValidStartCode("0482")).isTrue();
    assertThat(VendorJobRules.isValidStartCode("482")).isFalse();
    assertThat(VendorJobRules.isValidStartCode("12345")).isFalse();
    assertThat(VendorJobRules.isValidStartCode("12a4")).isFalse();
    assertThat(VendorJobRules.isValidStartCode(null)).isFalse();
    for (int i = 0; i < 200; i++) assertThat(VendorJobRules.newStartCode()).matches("\\d{4}");
  }

  @Test
  void aStepCanBeUndoneWithinTheWindowPlusGrace() {
    Booking b = booking("arrived", "arrived", "vendor");
    assertThat(VendorJobRules.undoTarget(b, T0.plusSeconds(3))).contains("on_the_way");
    assertThat(VendorJobRules.undoTarget(b, T0.plusSeconds(15))).contains("on_the_way"); // 10 s window + 5 s grace
    assertThat(VendorJobRules.undoTarget(b, T0.plusSeconds(16))).isEmpty();
  }

  @Test
  void everyVendorStepGoesBackToTheOneBefore() {
    assertThat(VendorJobRules.undoTarget(booking("accepted", "accepted", "vendor"), T0)).contains("assigned");
    assertThat(VendorJobRules.undoTarget(booking("on_the_way", "on_the_way", "vendor"), T0)).contains("accepted");
    assertThat(VendorJobRules.undoTarget(booking("in_progress", "in_progress", "vendor"), T0)).contains("arrived");
    assertThat(VendorJobRules.undoTarget(booking("completed", "completed", "vendor"), T0)).contains("in_progress");
  }

  @Test
  void onlyTheProfessionalsOwnLatestStepCanBeUndone() {
    // Support moved the job, not the professional.
    assertThat(VendorJobRules.undoTarget(booking("arrived", "arrived", "admin"), T0)).isEmpty();
    // Something else happened after the step (a quote was shared).
    assertThat(VendorJobRules.undoTarget(booking("in_progress", "quote_shared", "vendor"), T0)).isEmpty();
    // Being assigned is not a vendor step.
    assertThat(VendorJobRules.undoTarget(booking("assigned", "assigned", "vendor"), T0)).isEmpty();
  }

  @Test
  void aPaidOrReviewedJobStaysCompleted() {
    Booking paid = booking("completed", "completed", "vendor");
    paid.paymentStatus = "paid";
    assertThat(VendorJobRules.undoTarget(paid, T0)).isEmpty();
    Booking paying = booking("completed", "completed", "vendor");
    paying.paymentStatus = "pending";
    assertThat(VendorJobRules.undoTarget(paying, T0)).isEmpty();
    Booking reviewed = booking("completed", "completed", "vendor");
    reviewed.reviewId = "rev_1";
    assertThat(VendorJobRules.undoTarget(reviewed, T0)).isEmpty();
  }

  @Test
  void messagesMatchTheApps() {
    assertThat(VendorJobRules.startCodeWrong(4)).isEqualTo("That code doesn’t match — ask the customer for the start code in their app (4 tries left)");
    assertThat(VendorJobRules.startCodeWrong(1)).endsWith("(1 try left)");
    assertThat(VendorJobRules.busy("PF12AB")).isEqualTo("Finish job PF12AB first — only one job can be in progress at a time");
  }
}
