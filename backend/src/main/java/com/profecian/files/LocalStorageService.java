package com.profecian.files;

import com.profecian.config.AppProperties;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.time.Clock;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

/** Dev storage: files in a local folder, served by {@link FileController} behind HMAC-signed URLs. */
@Service
@ConditionalOnProperty(name = "profecian.storage.provider", havingValue = "local", matchIfMissing = true)
public class LocalStorageService implements StorageService {
  private final Path root;
  private final AppProperties props;
  private final Clock clock;

  public LocalStorageService(AppProperties props, Clock clock) {
    this.root = Path.of(props.storage().localDir()).toAbsolutePath().normalize();
    this.props = props;
    this.clock = clock;
  }

  @Override
  public void put(String key, String contentType, byte[] bytes) {
    try {
      Path target = resolve(key);
      Files.createDirectories(target.getParent());
      Files.write(target, bytes);
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

  @Override
  public byte[] get(String key) {
    try {
      return Files.readAllBytes(resolve(key));
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

  @Override
  public String signedUrl(String key) {
    long exp = clock.instant().plus(props.storage().urlTtl()).getEpochSecond();
    return props.publicBaseUrl() + "/files/" + key + "?exp=" + exp + "&sig=" + sign(key, exp);
  }

  public boolean verify(String key, long exp, String sig) {
    return exp >= clock.instant().getEpochSecond() && MessageDigest.isEqual(sign(key, exp).getBytes(StandardCharsets.UTF_8), sig.getBytes(StandardCharsets.UTF_8));
  }

  private String sign(String key, long exp) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(props.storage().signingSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
      return HexFormat.of().formatHex(mac.doFinal((key + ":" + exp).getBytes(StandardCharsets.UTF_8)));
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }

  private Path resolve(String key) {
    Path p = root.resolve(key).normalize();
    if (!p.startsWith(root)) throw new IllegalArgumentException("Bad key");
    return p;
  }
}
