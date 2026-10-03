package com.profecian.files;

/**
 * Object storage for KYC documents, proof photos and review images. Objects are private; callers
 * get time-limited URLs. Implementations: {@link LocalStorageService} (dev, a local folder served
 * by /files with HMAC-signed links) and {@link S3StorageService} (any S3-compatible store).
 */
public interface StorageService {
  void put(String key, String contentType, byte[] bytes);

  /** A URL valid for the configured TTL. */
  String signedUrl(String key);

  byte[] get(String key);
}
