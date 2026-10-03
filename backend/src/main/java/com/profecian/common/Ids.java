package com.profecian.common;

import java.security.SecureRandom;

/** Text ids in the same style as the mock backend (`bkg_…`, `cus_…`) and booking codes (`PF…`). */
public final class Ids {
  private static final SecureRandom RANDOM = new SecureRandom();
  private static final char[] BASE36 = "0123456789abcdefghijklmnopqrstuvwxyz".toCharArray();

  private Ids() {}

  public static String newId(String prefix) {
    return prefix + "_" + Long.toString(System.currentTimeMillis(), 36) + random(6);
  }

  /** "PF" + 4 time-derived + 2 random characters, upper case — same shape as the mock's codes. */
  public static String bookingCode() {
    String time = Long.toString(System.currentTimeMillis(), 36);
    return ("PF" + time.substring(time.length() - 4) + random(2)).toUpperCase();
  }

  public static String random(int length) {
    char[] out = new char[length];
    for (int i = 0; i < length; i++) out[i] = BASE36[RANDOM.nextInt(BASE36.length)];
    return new String(out);
  }
}
