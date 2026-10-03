package com.profecian.files;

import com.profecian.auth.CurrentUser;
import com.profecian.common.ApiException;
import com.profecian.common.Ids;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.io.IOException;
import java.time.LocalDate;
import java.util.Set;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class FileController {
  private static final Set<String> ALLOWED = Set.of("image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf");

  private final StorageService storage;
  private final ObjectProvider<LocalStorageService> local;
  private final FileRefs.StoredFile.Repository files;

  public FileController(StorageService storage, ObjectProvider<LocalStorageService> local, FileRefs.StoredFile.Repository files) {
    this.storage = storage;
    this.local = local;
    this.files = files;
  }

  public record Uploaded(String key, String url) {}

  @Operation(summary = "Upload a photo or document; returns its key and a time-limited URL")
  @SecurityRequirement(name = "bearer")
  @PostMapping(value = "/api/v1/files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public Uploaded upload(@RequestPart("file") MultipartFile file) throws IOException {
    CurrentUser user = CurrentUser.get();
    String type = file.getContentType() == null ? "application/octet-stream" : file.getContentType();
    if (!ALLOWED.contains(type)) throw ApiException.bad("Upload a JPG, PNG, WebP or PDF file");
    if (file.isEmpty()) throw ApiException.bad("The file is empty");
    String ext = switch (type) {
      case "image/png" -> ".png";
      case "image/webp" -> ".webp";
      case "image/heic" -> ".heic";
      case "application/pdf" -> ".pdf";
      default -> ".jpg";
    };
    LocalDate today = LocalDate.now();
    String key = "u/" + user.role() + "/" + today.getYear() + "/" + today.getMonthValue() + "/" + Ids.newId("f") + ext;
    storage.put(key, type, file.getBytes());
    FileRefs.StoredFile f = new FileRefs.StoredFile();
    f.key = key;
    f.ownerRole = user.role();
    f.ownerId = user.id();
    f.contentType = type;
    f.sizeBytes = file.getSize();
    files.save(f);
    return new Uploaded(key, storage.signedUrl(key));
  }

  /** Serves local-storage files behind signed, expiring links (dev). */
  @GetMapping("/files/**")
  public ResponseEntity<byte[]> serve(jakarta.servlet.http.HttpServletRequest request, @RequestParam long exp, @RequestParam String sig) {
    LocalStorageService store = local.getIfAvailable();
    if (store == null) return ResponseEntity.notFound().build();
    String key = request.getRequestURI().substring("/files/".length());
    if (!store.verify(key, exp, sig)) return ResponseEntity.status(403).build();
    var meta = files.findById(key);
    if (meta.isEmpty()) return ResponseEntity.notFound().build();
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType(meta.get().contentType))
        .cacheControl(CacheControl.noStore())
        .body(store.get(key));
  }
}
