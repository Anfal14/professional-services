package com.profecian.common;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;

/** Visit slots ("10:00 AM") interpreted in the business time zone — slotToMinutes / scheduledAt in format.ts. */
public final class Schedules {
  public static final ZoneId ZONE = ZoneId.of("Asia/Kolkata");
  public static final List<String> TIME_SLOTS = List.of(
      "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "01:00 PM",
      "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM", "07:00 PM");

  private Schedules() {}

  public static int slotToMinutes(String slot) {
    try {
      String[] parts = slot.trim().split(" ");
      String[] hm = parts[0].split(":");
      int h = Integer.parseInt(hm[0]);
      int m = Integer.parseInt(hm[1]);
      return ((h % 12) + ("PM".equals(parts[1]) ? 12 : 0)) * 60 + m;
    } catch (RuntimeException e) {
      throw ApiException.bad("Please choose a valid time slot");
    }
  }

  public static ZonedDateTime scheduledAt(LocalDate date, String slot) {
    int mins = slotToMinutes(slot);
    return ZonedDateTime.of(date, LocalTime.of(mins / 60, mins % 60), ZONE);
  }

  public static boolean isPast(LocalDate date, String slot, Clock clock) {
    return scheduledAt(date, slot).toInstant().isBefore(clock.instant());
  }

  public static LocalDate today(Clock clock) {
    return LocalDate.now(clock.withZone(ZONE));
  }
}
