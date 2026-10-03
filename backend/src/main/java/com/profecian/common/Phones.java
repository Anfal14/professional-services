package com.profecian.common;

import java.util.regex.Pattern;

/** Indian mobile numbers, same rules as normalizePhone / isValidPhone in format.ts. */
public final class Phones {
  private static final Pattern VALID = Pattern.compile("^[6-9]\\d{9}$");

  private Phones() {}

  public static String normalize(String raw) {
    if (raw == null) return "";
    String digits = raw.replaceAll("\\D", "");
    if (digits.length() == 12 && digits.startsWith("91")) digits = digits.substring(2);
    if (digits.length() == 11 && digits.startsWith("0")) digits = digits.substring(1);
    return digits;
  }

  public static boolean isValid(String raw) {
    return VALID.matcher(normalize(raw)).matches();
  }
}
