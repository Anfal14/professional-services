package com.profecian.bookings;

import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** One visit by one professional. Mirrors `Booking` in types.ts; optimistic locking via `version`. */
@Entity
@Table(name = "bookings")
public class Booking {
  @Id
  public String id;

  public String code;

  @Column(name = "customer_id")
  public String customerId;

  @Column(name = "customer_name")
  public String customerName;

  @Column(name = "customer_phone")
  public String customerPhone;

  @Column(name = "category_id")
  public String categoryId;

  @Column(name = "problem_type_id")
  public String problemTypeId;

  public LocalDate date;
  public String slot;

  @Column(name = "address_id")
  public String addressId;
  @Column(name = "address_label")
  public String addressLabel;
  @Column(name = "address_line")
  public String addressLine;
  @Column(name = "address_landmark")
  public String addressLandmark;
  @Column(name = "address_city")
  public String addressCity;
  @Column(name = "address_pincode")
  public String addressPincode;
  @Column(name = "address_lat")
  public Double addressLat;
  @Column(name = "address_lng")
  public Double addressLng;

  public String notes;
  public String status;

  @Column(name = "vendor_id")
  public String vendorId;

  @Column(name = "service_amount")
  public BigDecimal serviceAmount;
  public BigDecimal tax;
  public BigDecimal total;
  @Column(name = "commission_rate")
  public BigDecimal commissionRate;
  public BigDecimal commission;
  @Column(name = "vendor_payout")
  public BigDecimal vendorPayout;

  @Column(name = "payment_method")
  public String paymentMethod;
  @Column(name = "payment_status")
  public String paymentStatus = "unpaid";
  @Column(name = "paid_at")
  public Instant paidAt;
  @Column(name = "txn_id")
  public String txnId;
  @Column(name = "failure_reason")
  public String failureReason;

  @Column(name = "cancel_reason")
  public String cancelReason;

  @Column(name = "review_id")
  public String reviewId;

  @Column(name = "created_at")
  public Instant createdAt = Instant.now();

  @Column(name = "updated_at")
  public Instant updatedAt = Instant.now();

  @ElementCollection(fetch = FetchType.LAZY)
  @CollectionTable(name = "booking_items", joinColumns = @JoinColumn(name = "booking_id"))
  @OrderColumn(name = "position")
  public List<Item> items = new ArrayList<>();

  @ElementCollection(fetch = FetchType.LAZY)
  @CollectionTable(name = "booking_events", joinColumns = @JoinColumn(name = "booking_id"))
  @OrderColumn(name = "position")
  public List<Event> timeline = new ArrayList<>();

  @ElementCollection(fetch = FetchType.LAZY)
  @CollectionTable(name = "booking_proof_photos", joinColumns = @JoinColumn(name = "booking_id"))
  @OrderColumn(name = "position")
  @Column(name = "file_ref")
  public List<String> proofPhotos = new ArrayList<>();

  /** "After" photos — at least one is needed to complete the service. */
  @ElementCollection(fetch = FetchType.LAZY)
  @CollectionTable(name = "booking_after_photos", joinColumns = @JoinColumn(name = "booking_id"))
  @OrderColumn(name = "position")
  @Column(name = "file_ref")
  public List<String> afterPhotos = new ArrayList<>();

  /** 4-digit code created on arrival; the customer reads it out and the professional enters it to start. */
  @Column(name = "start_code")
  public String startCode;

  /** Wrong codes entered so far; after VendorJobRules.START_CODE_MAX_ATTEMPTS only support can start the job. */
  @Column(name = "start_code_attempts")
  public int startCodeAttempts;

  /** Every release by a professional who had accepted this booking, oldest first. */
  @ElementCollection(fetch = FetchType.LAZY)
  @CollectionTable(name = "booking_releases", joinColumns = @JoinColumn(name = "booking_id"))
  @OrderColumn(name = "position")
  public List<Release> releases = new ArrayList<>();

  /** Released late and still waiting for a professional: top of the admin's assignment queue. */
  public boolean urgent;

  /** An open on-site report waiting for the admin's decision; all null when there is none. */
  @Column(name = "issue_kind")
  public String issueKind;
  @Column(name = "issue_reason")
  public String issueReason;
  @Column(name = "issue_note")
  public String issueNote;
  @Column(name = "issue_vendor_id")
  public String issueVendorId;
  @Column(name = "issue_vendor_name")
  public String issueVendorName;
  @Column(name = "issue_at")
  public Instant issueAt;

  public boolean hasIssue() {
    return issueKind != null;
  }

  public void clearIssue() {
    issueKind = null;
    issueReason = null;
    issueNote = null;
    issueVendorId = null;
    issueVendorName = null;
    issueAt = null;
  }

  @OneToOne(mappedBy = "booking", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
  public Inspection inspection;

  @Version
  public Long version;

  /** One release — `JobRelease` in types.ts. */
  @Embeddable
  public static class Release {
    @Column(name = "vendor_id")
    public String vendorId;
    @Column(name = "vendor_name")
    public String vendorName;
    public String reason;
    public String note;
    public boolean late;
    public Instant at;

    public Release() {}

    public Release(String vendorId, String vendorName, String reason, String note, boolean late, Instant at) {
      this.vendorId = vendorId;
      this.vendorName = vendorName;
      this.reason = reason;
      this.note = note;
      this.late = late;
      this.at = at;
    }
  }

  @Embeddable
  public static class Item {
    @Column(name = "problem_type_id")
    public String problemTypeId;
    public String name;
    public BigDecimal price;

    public Item() {}

    public Item(String problemTypeId, String name, BigDecimal price) {
      this.problemTypeId = problemTypeId;
      this.name = name;
      this.price = price;
    }
  }

  /** Timeline row. `kind` is a BookingEventKind; `byRole` is customer | vendor | admin | system. */
  @Embeddable
  public static class Event {
    public String kind;
    public Instant at;
    @Column(name = "by_role")
    public String byRole;
    public String note;

    public Event() {}

    public Event(String kind, String byRole, String note, Instant at) {
      this.kind = kind;
      this.byRole = byRole;
      this.note = note;
      this.at = at;
    }
  }
}
