package com.profecian.files;

import com.profecian.config.AppProperties;
import java.net.URI;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

/** Any S3-compatible store (AWS S3, MinIO, Cloudflare R2). Credentials come from the default AWS chain. */
@Service
@ConditionalOnProperty(name = "profecian.storage.provider", havingValue = "s3")
public class S3StorageService implements StorageService {
  private final S3Client s3;
  private final S3Presigner presigner;
  private final AppProperties props;

  public S3StorageService(AppProperties props) {
    this.props = props;
    var cfg = props.storage().s3();
    var s3b = S3Client.builder().region(Region.of(cfg.region()));
    var pb = S3Presigner.builder().region(Region.of(cfg.region()));
    if (cfg.endpoint() != null && !cfg.endpoint().isBlank()) {
      s3b.endpointOverride(URI.create(cfg.endpoint())).serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build());
      pb.endpointOverride(URI.create(cfg.endpoint())).serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build());
    }
    this.s3 = s3b.build();
    this.presigner = pb.build();
  }

  @Override
  public void put(String key, String contentType, byte[] bytes) {
    s3.putObject(PutObjectRequest.builder().bucket(props.storage().s3().bucket()).key(key).contentType(contentType).build(), RequestBody.fromBytes(bytes));
  }

  @Override
  public byte[] get(String key) {
    return s3.getObjectAsBytes(GetObjectRequest.builder().bucket(props.storage().s3().bucket()).key(key).build()).asByteArray();
  }

  @Override
  public String signedUrl(String key) {
    return presigner.presignGetObject(GetObjectPresignRequest.builder()
        .signatureDuration(props.storage().urlTtl())
        .getObjectRequest(GetObjectRequest.builder().bucket(props.storage().s3().bucket()).key(key).build())
        .build()).url().toString();
  }
}
