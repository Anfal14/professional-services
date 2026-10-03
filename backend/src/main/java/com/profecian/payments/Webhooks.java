package com.profecian.payments;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

final class Webhooks {
  private Webhooks() {}

  static String hmac(String secret, String payload) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
      return HexFormat.of().formatHex(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }

  static boolean hmacMatches(String secret, String payload, String signature) {
    if (signature == null) return false;
    return MessageDigest.isEqual(hmac(secret, payload).getBytes(StandardCharsets.UTF_8), signature.trim().getBytes(StandardCharsets.UTF_8));
  }
}
