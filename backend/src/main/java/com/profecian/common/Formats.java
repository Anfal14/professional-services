package com.profecian.common;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.Locale;

/** Text formatting used in notification bodies — matches formatINR / formatDate in format.ts. */
public final class Formats {
  private Formats() {}

  /** "₹1,25,000" (Indian grouping); paise only when present, e.g. "₹471.50". */
  public static String inr(BigDecimal amount) {
    BigDecimal a = amount.setScale(2, RoundingMode.HALF_UP);
    boolean paise = a.remainder(BigDecimal.ONE).signum() != 0;
    String sign = a.signum() < 0 ? "-" : "";
    BigDecimal abs = a.abs();
    String whole = abs.setScale(0, RoundingMode.DOWN).toPlainString();
    String grouped;
    if (whole.length() <= 3) {
      grouped = whole;
    } else {
      String last3 = whole.substring(whole.length() - 3);
      String rest = whole.substring(0, whole.length() - 3);
      StringBuilder sb = new StringBuilder();
      for (int i = 0; i < rest.length(); i++) {
        if (i > 0 && (rest.length() - i) % 2 == 0) sb.append(',');
        sb.append(rest.charAt(i));
      }
      grouped = sb + "," + last3;
    }
    String fraction = paise ? "." + abs.toPlainString().substring(abs.toPlainString().indexOf('.') + 1) : "";
    return "₹" + sign + grouped + fraction;
  }

  public static String inr(long rupees) {
    return inr(BigDecimal.valueOf(rupees));
  }

  /** "Fri, 2 Oct" */
  public static String date(LocalDate d) {
    String day = d.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.ENGLISH);
    String month = d.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH);
    return day + ", " + d.getDayOfMonth() + " " + month;
  }

  /** 0 = Sunday … 6 = Saturday, like JS Date#getDay. */
  public static int jsDayOfWeek(DayOfWeek d) {
    return d.getValue() % 7;
  }

  public static String whatsappLink(String phoneDigits, String text) {
    String to = phoneDigits.length() == 10 ? "91" + phoneDigits : phoneDigits;
    return "https://wa.me/" + to + "?text=" + URLEncoder.encode(text, StandardCharsets.UTF_8).replace("+", "%20");
  }
}
