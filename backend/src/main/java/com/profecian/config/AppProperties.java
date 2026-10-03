package com.profecian.config;

import java.time.Duration;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("profecian")
public record AppProperties(
    List<String> corsOrigins,
    String publicBaseUrl,
    Jwt jwt,
    Otp otp,
    Payments payments,
    Outbox outbox,
    Storage storage,
    BankEncryption bankEncryption) {

  public record Jwt(String secret, Duration accessTtl, Duration refreshTtl, Duration signupTtl) {}

  public record Otp(boolean sandbox, Duration ttl, int maxSendsPerWindow, Duration sendWindow, int maxAttempts) {}

  public record Payments(String provider, String webhookSecret) {}

  public record Outbox(long pollIntervalMs, int batchSize, int maxAttempts) {}

  public record Storage(String provider, String localDir, Duration urlTtl, String signingSecret, S3 s3) {
    public record S3(String bucket, String region, String endpoint) {}
  }

  public record BankEncryption(String password, String salt) {}
}
