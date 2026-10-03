package com.profecian.auth;

import com.profecian.common.ApiException;
import com.profecian.common.Ids;
import com.profecian.common.Phones;
import com.profecian.config.AppProperties;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Map;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

/**
 * OTP requests live in Redis: `otp:req:<id>` → phone, code hash and attempts (expires with the
 * code), and `otp:rate:<phone>` counts sends per window to rate-limit SMS.
 */
@Service
public class OtpService {
  private final StringRedisTemplate redis;
  private final OtpProvider provider;
  private final AppProperties props;

  public OtpService(StringRedisTemplate redis, OtpProvider provider, AppProperties props) {
    this.redis = redis;
    this.provider = provider;
    this.props = props;
  }

  public record Sent(String requestId, int resendInSec) {}

  public Sent request(String rawPhone) {
    if (!Phones.isValid(rawPhone)) throw ApiException.bad("Enter a valid 10-digit mobile number");
    String phone = Phones.normalize(rawPhone);
    String rateKey = "otp:rate:" + phone;
    Long sends = redis.opsForValue().increment(rateKey);
    if (sends != null && sends == 1) redis.expire(rateKey, props.otp().sendWindow());
    if (sends != null && sends > props.otp().maxSendsPerWindow()) throw ApiException.tooMany("Too many OTP requests. Please try again in a few minutes");
    String requestId = "otp_" + phone + "_" + Ids.random(10);
    String code = provider.issue(phone);
    String key = "otp:req:" + requestId;
    redis.opsForHash().putAll(key, Map.of("phone", phone, "code", hash(code), "attempts", "0"));
    redis.expire(key, props.otp().ttl());
    return new Sent(requestId, 30);
  }

  /** Returns the verified phone number. Messages match checkOtp in mock.ts. */
  public String verify(String requestId, String code) {
    String key = "otp:req:" + requestId;
    Map<Object, Object> entry = redis.opsForHash().entries(key);
    if (entry.isEmpty()) throw ApiException.bad("OTP expired, please request a new one");
    int attempts = Integer.parseInt((String) entry.getOrDefault("attempts", "0"));
    if (attempts >= props.otp().maxAttempts()) {
      redis.delete(key);
      throw ApiException.bad("OTP expired, please request a new one");
    }
    if (code == null || !MessageDigest.isEqual(hash(code.trim()).getBytes(StandardCharsets.UTF_8), ((String) entry.get("code")).getBytes(StandardCharsets.UTF_8))) {
      redis.opsForHash().increment(key, "attempts", 1);
      throw ApiException.bad("Incorrect OTP");
    }
    redis.delete(key);
    return (String) entry.get("phone");
  }

  static String hash(String value) {
    try {
      return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }
}
