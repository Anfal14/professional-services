package com.profecian.vendors;

import com.profecian.auth.CurrentUser;
import com.profecian.common.ApiException;
import com.profecian.common.Ids;
import com.profecian.common.Phones;
import com.profecian.files.FileRefs;
import com.profecian.live.LiveEvents;
import com.profecian.notifications.NotificationService;
import com.profecian.notifications.NotifyFor;
import com.profecian.settings.SettingsService;
import java.time.Clock;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.security.crypto.encrypt.TextEncryptor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Vendor registration, KYC, bank and profile — the `vendor` group of mock.ts, plus admin vendor review. */
@Service
public class VendorService {
  private static final List<String> ALL_DOCS = List.of("aadhaar", "pan", "driving_license", "selfie", "bank_proof");
  private static final List<String> REQUIRED_DOCS = List.of("aadhaar", "pan", "selfie", "bank_proof");
  private static final Pattern ACCOUNT = Pattern.compile("^\\d{9,18}$");
  private static final Pattern IFSC = Pattern.compile("^[A-Z]{4}0[A-Z0-9]{6}$");

  private final VendorRepository vendors;
  private final SettingsService settings;
  private final NotificationService notifications;
  private final NotifyFor notify;
  private final FileRefs files;
  private final TextEncryptor bankEncryptor;
  private final LiveEvents live;
  private final Clock clock;

  public VendorService(VendorRepository vendors, SettingsService settings, NotificationService notifications, NotifyFor notify, FileRefs files,
                       TextEncryptor bankEncryptor, LiveEvents live, Clock clock) {
    this.vendors = vendors;
    this.settings = settings;
    this.notifications = notifications;
    this.notify = notify;
    this.files = files;
    this.bankEncryptor = bankEncryptor;
    this.live = live;
    this.clock = clock;
  }

  public Vendor get(String id) {
    return vendors.findById(id).orElseThrow(() -> ApiException.notFound("Vendor not found"));
  }

  private void changed(Vendor v) {
    live.notify("vendor", v.id, null);
    live.notify("admin", "admin", null);
  }

  @Transactional
  public Vendor register(String rawPhone, String name, String email, String city, List<String> categoryIds, List<String> serviceAreas) {
    String phone = Phones.normalize(rawPhone);
    if (vendors.existsByPhone(phone)) throw ApiException.conflict("A vendor account already exists for this number");
    if (categoryIds == null || categoryIds.isEmpty()) throw ApiException.bad("Select at least one service category");
    if (name == null || name.trim().length() < 2) throw ApiException.bad("Please enter your full name");
    Vendor v = new Vendor();
    v.id = Ids.newId("ven");
    v.name = name.trim();
    v.phone = phone;
    v.email = email == null || email.isBlank() ? null : email.trim();
    v.city = city;
    v.serviceAreas.addAll(serviceAreas == null ? List.of() : serviceAreas);
    v.categoryIds.addAll(categoryIds);
    v.status = "pending";
    ALL_DOCS.forEach(t -> v.kyc.add(new Vendor.KycDocument(t, "missing")));
    v.available = false;
    double[] loc = settings.jitterNear(city, phone);
    v.lat = loc[0];
    v.lng = loc[1];
    v.joinedAt = clock.instant();
    vendors.save(v);
    changed(v);
    return v;
  }

  /** Numbers are stored masked (all but the last 4 characters → X), as in the mock. */
  @Transactional
  public void uploadDocument(CurrentUser user, String vendorId, String type, String number, String imageRef) {
    if (!ALL_DOCS.contains(type)) throw ApiException.bad("Unknown document type");
    Vendor v = get(vendorId);
    String masked = number == null || number.isBlank() ? null : number.replaceAll("\\s", "").replaceAll(".(?=.{4})", "X");
    Vendor.KycDocument doc = v.kyc.stream().filter(k -> k.type.equals(type)).findFirst().orElseGet(() -> {
      Vendor.KycDocument d = new Vendor.KycDocument(type, "missing");
      v.kyc.add(d);
      return d;
    });
    doc.number = masked;
    doc.imageKey = files.attach(imageRef, user);
    doc.status = "pending";
    doc.note = null;
    doc.uploadedAt = clock.instant();
    // A changed document needs a fresh review unless the vendor is already approved.
    if (!"approved".equals(v.status)) v.kycSubmittedAt = null;
    changed(v);
  }

  @Transactional
  public void saveBank(String vendorId, String holderName, String accountNumber, String ifsc, String bankName) {
    String acct = accountNumber == null ? "" : accountNumber.replaceAll("\\s", "");
    if (!ACCOUNT.matcher(acct).matches()) throw ApiException.bad("Enter a valid account number");
    String code = ifsc == null ? "" : ifsc.toUpperCase();
    if (!IFSC.matcher(code).matches()) throw ApiException.bad("Enter a valid IFSC code");
    Vendor v = get(vendorId);
    VendorBankAccount bank = v.bank != null ? v.bank : new VendorBankAccount();
    bank.vendor = v;
    bank.holderName = holderName == null ? "" : holderName.trim();
    bank.accountLast4 = acct.substring(acct.length() - 4);
    bank.accountNumberEncrypted = bankEncryptor.encrypt(acct);
    bank.ifsc = code;
    bank.bankName = bankName == null ? "" : bankName.trim();
    bank.updatedAt = clock.instant();
    v.bank = bank;
    changed(v);
  }

  /** Submit a completed registration for admin review. */
  @Transactional
  public void submitForReview(String vendorId) {
    Vendor v = get(vendorId);
    boolean missing = REQUIRED_DOCS.stream().anyMatch(t -> v.kyc.stream().anyMatch(k -> k.type.equals(t) && "missing".equals(k.status)));
    if (missing) throw ApiException.bad("Upload all required documents first");
    if (v.bank == null) throw ApiException.bad("Add your bank account details first");
    if (v.kyc.stream().anyMatch(k -> "rejected".equals(k.status))) throw ApiException.bad("Re-upload the rejected documents first");
    v.status = "pending";
    v.rejectionReason = null;
    v.kycSubmittedAt = clock.instant();
    notifications.publish(notify.vendorSubmitted(v));
    changed(v);
  }

  public record WorkingHoursInput(String start, String end, List<Integer> days) {}

  public record ProfilePatch(Boolean available, List<String> serviceAreas, List<String> categoryIds, String email, String photo, WorkingHoursInput workingHours) {}

  @Transactional
  public void updateProfile(CurrentUser user, String vendorId, ProfilePatch p) {
    Vendor v = get(vendorId);
    if (p.available() != null) v.available = p.available();
    if (p.serviceAreas() != null) {
      v.serviceAreas.clear();
      v.serviceAreas.addAll(p.serviceAreas());
    }
    if (p.categoryIds() != null) {
      if (p.categoryIds().isEmpty()) throw ApiException.bad("Select at least one service category");
      v.categoryIds.clear();
      v.categoryIds.addAll(p.categoryIds());
    }
    if (p.email() != null) v.email = p.email().isBlank() ? null : p.email().trim();
    if (p.photo() != null) v.photo = files.attach(p.photo(), user);
    if (p.workingHours() != null) {
      v.workingHours.start = p.workingHours().start();
      v.workingHours.end = p.workingHours().end();
      v.workingHours.days = p.workingHours().days().stream().map(String::valueOf).collect(Collectors.joining(","));
    }
    changed(v);
  }

  /* ───── Admin ───── */

  @Transactional
  public void review(String vendorId, String decision, String reason) {
    if (!List.of("approved", "rejected", "suspended").contains(decision)) throw ApiException.bad("Unknown decision");
    Vendor v = get(vendorId);
    v.status = decision;
    v.rejectionReason = "rejected".equals(decision) ? reason : null;
    if (!"approved".equals(decision)) v.available = false;
    if ("approved".equals(decision)) v.kyc.stream().filter(k -> "pending".equals(k.status)).forEach(k -> k.status = "verified");
    changed(v);
  }

  @Transactional
  public void verifyDocument(String vendorId, String type, String status, String note) {
    if (!List.of("verified", "rejected").contains(status)) throw ApiException.bad("Unknown status");
    Vendor v = get(vendorId);
    v.kyc.stream().filter(k -> k.type.equals(type)).forEach(k -> {
      k.status = status;
      k.note = note;
    });
    changed(v);
  }

  @Transactional
  public void setCategories(String vendorId, List<String> categoryIds) {
    Vendor v = get(vendorId);
    v.categoryIds.clear();
    v.categoryIds.addAll(categoryIds);
    changed(v);
  }
}
