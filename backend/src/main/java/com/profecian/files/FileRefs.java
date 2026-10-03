package com.profecian.files;

import com.profecian.auth.CurrentUser;
import com.profecian.common.ApiException;
import com.profecian.config.AppProperties;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;

/**
 * Files are referenced in the database by storage key. Clients send back either a key from
 * POST /api/v1/files or a signed URL they received earlier; both resolve to the key here, and
 * only files the caller uploaded can be attached. Keys are turned into signed URLs on read.
 */
@Component
public class FileRefs {
  private final StorageService storage;
  private final StoredFile.Repository files;
  private final AppProperties props;

  public FileRefs(StorageService storage, StoredFile.Repository files, AppProperties props) {
    this.storage = storage;
    this.files = files;
    this.props = props;
  }

  /** Signed URL for a key; plain http(s) values (e.g. seeded catalogue images) pass through. */
  public String url(String ref) {
    if (ref == null) return null;
    if (ref.startsWith("http://") || ref.startsWith("https://")) return ref;
    return storage.signedUrl(ref);
  }

  public List<String> urls(List<String> refs) {
    return refs.stream().map(this::url).toList();
  }

  /** Validates a client-supplied file reference and returns the storage key to save. */
  public String attach(String ref, CurrentUser user) {
    if (ref == null || ref.isBlank()) return null;
    String key = keyOf(ref);
    StoredFile f = files.findById(key).orElseThrow(() -> ApiException.bad("Please upload the photo again"));
    if (!user.isAdmin() && !(f.ownerRole.equals(user.role()) && f.ownerId.equals(user.id()))) throw ApiException.forbidden("Please upload the photo again");
    return key;
  }

  public List<String> attachAll(List<String> refs, CurrentUser user) {
    return refs == null ? List.of() : refs.stream().map(r -> attach(r, user)).toList();
  }

  String keyOf(String ref) {
    String prefix = props.publicBaseUrl() + "/files/";
    if (ref.startsWith(prefix)) {
      String rest = ref.substring(prefix.length());
      int q = rest.indexOf('?');
      return q >= 0 ? rest.substring(0, q) : rest;
    }
    if (ref.startsWith("http://") || ref.startsWith("https://")) {
      // S3 presigned URL: the path after the bucket is the key.
      String path = java.net.URI.create(ref).getPath();
      int i = path.indexOf("/u/");
      if (i >= 0) return path.substring(i + 1);
      throw ApiException.bad("Please upload the photo again");
    }
    return ref;
  }

  @Entity
  @Table(name = "stored_files")
  public static class StoredFile {
    @Id
    public String key;

    @Column(name = "owner_role")
    public String ownerRole;

    @Column(name = "owner_id")
    public String ownerId;

    @Column(name = "content_type")
    public String contentType;

    @Column(name = "size_bytes")
    public long sizeBytes;

    @Column(name = "created_at")
    public Instant createdAt = Instant.now();

    public interface Repository extends JpaRepository<StoredFile, String> {}
  }
}
