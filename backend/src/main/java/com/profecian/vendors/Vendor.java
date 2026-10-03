package com.profecian.vendors;

import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.PrimaryKeyJoinColumn;
import jakarta.persistence.SecondaryTable;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "vendors")
@SecondaryTable(name = "vendor_working_hours", pkJoinColumns = @PrimaryKeyJoinColumn(name = "vendor_id"))
public class Vendor {
  @Id
  public String id;

  public String name;
  public String phone;
  public String email;
  public String photo;
  public String city;

  /** pending | approved | rejected | suspended */
  public String status;
  public boolean available;
  public BigDecimal rating = BigDecimal.ZERO;

  @Column(name = "rating_count")
  public int ratingCount;

  @Column(name = "jobs_completed")
  public int jobsCompleted;

  /** `location` (PostGIS geography) is generated from these. */
  public double lat;
  public double lng;

  @Column(name = "joined_at")
  public Instant joinedAt = Instant.now();

  @Column(name = "kyc_submitted_at")
  public Instant kycSubmittedAt;

  @Column(name = "rejection_reason")
  public String rejectionReason;

  @ElementCollection(fetch = FetchType.LAZY)
  @CollectionTable(name = "vendor_categories", joinColumns = @JoinColumn(name = "vendor_id"))
  @OrderColumn(name = "position")
  @Column(name = "category_id")
  public List<String> categoryIds = new ArrayList<>();

  @ElementCollection(fetch = FetchType.LAZY)
  @CollectionTable(name = "vendor_service_areas", joinColumns = @JoinColumn(name = "vendor_id"))
  @OrderColumn(name = "position")
  @Column(name = "area")
  public List<String> serviceAreas = new ArrayList<>();

  @ElementCollection(fetch = FetchType.LAZY)
  @CollectionTable(name = "vendor_kyc_documents", joinColumns = @JoinColumn(name = "vendor_id"))
  public List<KycDocument> kyc = new ArrayList<>();

  @Embedded
  public WorkingHours workingHours = new WorkingHours();

  @OneToOne(mappedBy = "vendor", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
  public VendorBankAccount bank;

  @Version
  public Long version;

  @Embeddable
  public static class KycDocument {
    /** aadhaar | pan | driving_license | selfie | bank_proof */
    public String type;
    /** Stored masked, e.g. "XXXX XXXX 4821". */
    public String number;
    /** Storage key or URL of the uploaded image. */
    @Column(name = "image_key")
    public String imageKey;
    /** missing | pending | verified | rejected */
    public String status;
    public String note;
    @Column(name = "uploaded_at")
    public Instant uploadedAt;

    public KycDocument() {}

    public KycDocument(String type, String status) {
      this.type = type;
      this.status = status;
    }
  }

  @Embeddable
  public static class WorkingHours {
    @Column(name = "start_time", table = "vendor_working_hours")
    public String start = "09:00";
    @Column(name = "end_time", table = "vendor_working_hours")
    public String end = "19:00";
    /** Comma-separated, 0 = Sunday … 6 = Saturday. */
    @Column(name = "days", table = "vendor_working_hours")
    public String days = "1,2,3,4,5,6";
  }
}
