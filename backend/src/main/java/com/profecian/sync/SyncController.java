package com.profecian.sync;

import com.profecian.auth.CurrentUser;
import com.profecian.notifications.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Sync")
public class SyncController {
  private final SnapshotService snapshots;
  private final NotificationService notifications;

  public SyncController(SnapshotService snapshots, NotificationService notifications) {
    this.snapshots = snapshots;
    this.notifications = notifications;
  }

  @Operation(summary = "Role-scoped snapshot of the data the apps render (same shape as `Database` in types.ts)")
  @GetMapping("/api/v1/sync")
  public Api.Database sync() {
    return snapshots.build(CurrentUser.find());
  }

  public record MarkRead(List<String> ids) {}

  @Operation(summary = "Mark the caller's notifications read (all when `ids` is omitted)")
  @PostMapping("/api/v1/notifications/read")
  public ResponseEntity<Void> markRead(@RequestBody(required = false) MarkRead body) {
    CurrentUser u = CurrentUser.get();
    notifications.markRead(u.role(), u.isAdmin() ? "admin" : u.id(), body == null ? null : body.ids());
    return ResponseEntity.noContent().build();
  }
}
