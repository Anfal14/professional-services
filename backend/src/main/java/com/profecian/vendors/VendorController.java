package com.profecian.vendors;

import com.profecian.auth.CurrentUser;
import com.profecian.bookings.VendorJobService;
import com.profecian.payouts.PayoutService;
import com.profecian.pricing.Wallet;
import com.profecian.sync.Api;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The `vendor` group of the apps' backend. Every action applies to the signed-in vendor. */
@RestController
@RequestMapping("/api/v1/vendor")
@Tag(name = "Vendor")
@SecurityRequirement(name = "bearer")
public class VendorController {
  private final VendorService vendors;
  private final VendorJobService jobs;
  private final PayoutService payouts;

  public VendorController(VendorService vendors, VendorJobService jobs, PayoutService payouts) {
    this.vendors = vendors;
    this.jobs = jobs;
    this.payouts = payouts;
  }

  public record Document(String number, String imageUri) {}

  public record Bank(String holderName, String accountNumber, String ifsc, String bankName) {}

  public record Reason(String reason) {}

  public record Text(String text) {}

  public record Quote(List<VendorJobService.QuoteLineInput> lines, String note) {}

  /** kind: "before" (default) or "after". */
  public record Photo(String uri, String kind) {}

  public record Advance(String startCode) {}

  public record Cash(java.math.BigDecimal amount) {}

  public record Release(String reason, String note) {}

  public record Issue(String kind, String reason, String note) {}

  @PostMapping("/documents/{type}")
  public ResponseEntity<Void> uploadDocument(@PathVariable String type, @RequestBody Document d) {
    CurrentUser u = CurrentUser.get();
    vendors.uploadDocument(u, u.id(), type, d.number(), d.imageUri());
    return ResponseEntity.noContent().build();
  }

  @PutMapping("/bank")
  public ResponseEntity<Void> saveBank(@RequestBody Bank b) {
    vendors.saveBank(CurrentUser.get().id(), b.holderName(), b.accountNumber(), b.ifsc(), b.bankName());
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/submit")
  public ResponseEntity<Void> submit() {
    vendors.submitForReview(CurrentUser.get().id());
    return ResponseEntity.noContent().build();
  }

  @PatchMapping("/profile")
  public ResponseEntity<Void> updateProfile(@RequestBody VendorService.ProfilePatch p) {
    CurrentUser u = CurrentUser.get();
    vendors.updateProfile(u, u.id(), p);
    return ResponseEntity.noContent().build();
  }

  /** Starting the service (arrived → in progress) needs the customer's start code in the body. */
  @PostMapping("/jobs/{id}/advance")
  public Api.Booking advance(@PathVariable String id, @RequestBody(required = false) Advance a) {
    return jobs.advance(CurrentUser.get(), id, a == null ? null : a.startCode());
  }

  /** Takes back the professional's last step, within the undo window. */
  @PostMapping("/jobs/{id}/undo")
  public Api.Booking undo(@PathVariable String id) {
    return jobs.undo(CurrentUser.get(), id);
  }

  /** The reason is optional. */
  @PostMapping("/jobs/{id}/decline")
  public Api.Booking decline(@PathVariable String id, @RequestBody(required = false) Reason r) {
    return jobs.decline(CurrentUser.get(), id, r == null ? null : r.reason());
  }

  /** "Can't make it" after accepting: back to the admin's queue (never a cancellation). */
  @PostMapping("/jobs/{id}/release")
  public Api.Booking release(@PathVariable String id, @RequestBody Release r) {
    return jobs.release(CurrentUser.get(), id, r.reason(), r.note());
  }

  /** A problem on site ("customer not available", "can't do this job", "can't complete") for the admin to decide. */
  @PostMapping("/jobs/{id}/issue")
  public Api.Booking issue(@PathVariable String id, @RequestBody Issue i) {
    return jobs.reportIssue(CurrentUser.get(), id, i.kind(), i.reason(), i.note());
  }

  @PostMapping("/jobs/{id}/quote")
  public Api.Booking quote(@PathVariable String id, @RequestBody Quote q) {
    return jobs.shareQuote(CurrentUser.get(), id, q.lines(), q.note());
  }

  @PostMapping("/jobs/{id}/no-work")
  public Api.Booking noWork(@PathVariable String id, @RequestBody Text t) {
    return jobs.markNoWorkNeeded(CurrentUser.get(), id, t.text());
  }

  @PostMapping("/jobs/{id}/proof")
  public Api.Booking proof(@PathVariable String id, @RequestBody Photo p) {
    return jobs.addProofPhoto(CurrentUser.get(), id, p.uri(), p.kind());
  }

  @PostMapping("/jobs/{id}/collect-cash")
  public Api.Booking collectCash(@PathVariable String id, @RequestBody(required = false) Cash c) {
    return jobs.collectCash(CurrentUser.get(), id, c == null ? null : c.amount());
  }

  @GetMapping("/wallet")
  public Wallet.Summary wallet() {
    return payouts.wallet(CurrentUser.get().id());
  }

  @PostMapping("/payouts")
  public Api.Payout requestPayout() {
    return payouts.request(CurrentUser.get().id());
  }
}
