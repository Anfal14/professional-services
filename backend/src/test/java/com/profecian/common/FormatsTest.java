package com.profecian.common;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class FormatsTest {
  @Test
  void indianRupeeGroupingLikeToLocaleStringEnIn() {
    assertThat(Formats.inr(BigDecimal.valueOf(471))).isEqualTo("₹471");
    assertThat(Formats.inr(BigDecimal.valueOf(1234))).isEqualTo("₹1,234");
    assertThat(Formats.inr(BigDecimal.valueOf(125000))).isEqualTo("₹1,25,000");
    assertThat(Formats.inr(BigDecimal.valueOf(12345678))).isEqualTo("₹1,23,45,678");
    assertThat(Formats.inr(new BigDecimal("471.5"))).isEqualTo("₹471.50");
  }

  @Test
  void dateLikeFormatDate() {
    assertThat(Formats.date(LocalDate.of(2026, 10, 2))).isEqualTo("Fri, 2 Oct");
  }

  @Test
  void phonesAndSlots() {
    assertThat(Phones.normalize("+91 98765 00001")).isEqualTo("9876500001");
    assertThat(Phones.isValid("09876500001")).isTrue();
    assertThat(Phones.isValid("5876500001")).isFalse();
    assertThat(Schedules.slotToMinutes("12:00 PM")).isEqualTo(720);
    assertThat(Schedules.slotToMinutes("08:00 AM")).isEqualTo(480);
    assertThat(Schedules.slotToMinutes("07:00 PM")).isEqualTo(1140);
    Clock noonIst = Clock.fixed(Instant.parse("2026-10-02T06:30:00Z"), ZoneOffset.UTC); // 12:00 IST
    assertThat(Schedules.isPast(LocalDate.of(2026, 10, 2), "11:00 AM", noonIst)).isTrue();
    assertThat(Schedules.isPast(LocalDate.of(2026, 10, 2), "01:00 PM", noonIst)).isFalse();
  }

  @Test
  void whatsappLink() {
    assertThat(Formats.whatsappLink("9876500001", "Hi there")).isEqualTo("https://wa.me/919876500001?text=Hi%20there");
  }
}
