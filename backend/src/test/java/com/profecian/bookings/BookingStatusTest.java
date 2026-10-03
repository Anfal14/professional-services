package com.profecian.bookings;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.profecian.common.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

/** Status steps: VENDOR_NEXT, canCustomerModify and the single transition method. */
class BookingStatusTest {
  private final BookingCore core = new BookingCore(null, null, null, null, null, Clock.fixed(Instant.parse("2026-10-02T06:00:00Z"), ZoneOffset.UTC));

  private static Booking booking(String status) {
    Booking b = new Booking();
    b.id = "bkg_t";
    b.status = status;
    return b;
  }

  @Test
  void vendorWalksTheWorkflowOneStepAtATime() {
    Booking b = booking("assigned");
    for (String next : new String[] {"accepted", "on_the_way", "arrived", "in_progress", "completed"}) {
      core.moveTo(b, next, BookingCore.Actor.vendor, null);
      assertThat(b.status).isEqualTo(next);
    }
    assertThat(b.timeline).extracting(e -> e.kind).containsExactly("accepted", "on_the_way", "arrived", "in_progress", "completed");
    assertThat(b.timeline).allSatisfy(e -> assertThat(e.byRole).isEqualTo("vendor"));
  }

  @Test
  void vendorCannotSkipOrMoveClosedJobs() {
    assertThatThrownBy(() -> core.moveTo(booking("assigned"), "arrived", BookingCore.Actor.vendor, null))
        .isInstanceOf(ApiException.class).hasMessage("No further action for this job");
    assertThatThrownBy(() -> core.moveTo(booking("completed"), "cancelled", BookingCore.Actor.vendor, null))
        .hasMessage("No further action for this job");
    assertThatThrownBy(() -> core.moveTo(booking("pending_assignment"), "assigned", BookingCore.Actor.vendor, null))
        .hasMessage("No further action for this job");
  }

  @Test
  void customerMayCancelOnlyUntilTheProfessionalIsOnTheWay() {
    for (String s : new String[] {"pending_assignment", "assigned", "accepted"}) {
      Booking b = booking(s);
      core.moveTo(b, "cancelled", BookingCore.Actor.customer, "Plans changed");
      assertThat(b.status).isEqualTo("cancelled");
      assertThat(b.timeline.get(0).note).isEqualTo("Plans changed");
    }
    for (String s : new String[] {"on_the_way", "arrived", "in_progress", "completed", "cancelled"}) {
      assertThatThrownBy(() -> core.moveTo(booking(s), "cancelled", BookingCore.Actor.customer, "x"))
          .hasMessage("This booking can no longer be cancelled");
    }
    assertThatThrownBy(() -> core.moveTo(booking("assigned"), "accepted", BookingCore.Actor.customer, null))
        .isInstanceOf(ApiException.class);
  }

  @Test
  void rulesMatchStatusTs() {
    assertThat(BookingRules.VENDOR_NEXT).containsEntry("in_progress", "completed").doesNotContainKey("pending_assignment");
    assertThat(BookingRules.canCustomerModify("accepted")).isTrue();
    assertThat(BookingRules.canCustomerModify("on_the_way")).isFalse();
    assertThatThrownBy(() -> core.moveTo(booking("assigned"), "done", BookingCore.Actor.admin, null)).hasMessage("Unknown status");
  }

  @Test
  void notSureQuoteRules() {
    Booking b = booking("arrived");
    Inspection i = new Inspection();
    i.status = "pending";
    b.inspection = i;
    assertThat(BookingCore.isQuoteOpen(b)).isTrue();
    assertThat(BookingCore.canQuote(b)).isTrue();
    i.status = "quoted";
    assertThat(BookingCore.isQuoteOpen(b)).isTrue();
    assertThat(BookingCore.canQuote(b)).isFalse();
    i.status = "approved";
    assertThat(BookingCore.isQuoteOpen(b)).isFalse();
    b.status = "on_the_way";
    i.status = "pending";
    assertThat(BookingCore.canQuote(b)).isFalse();
  }
}
