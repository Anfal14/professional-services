package com.profecian.payouts;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

@Entity
@Table(name = "payouts")
public class Payout {
  @Id
  public String id;

  @Column(name = "vendor_id")
  public String vendorId;

  public BigDecimal amount;

  /** pending | processing | settled | failed */
  public String status = "pending";
  public String utr;

  @Column(name = "created_at")
  public Instant createdAt = Instant.now();
  @Column(name = "settled_at")
  public Instant settledAt;

  @ElementCollection(fetch = FetchType.LAZY)
  @CollectionTable(name = "payout_bookings", joinColumns = @JoinColumn(name = "payout_id"))
  @OrderColumn(name = "position")
  @Column(name = "booking_id")
  public List<String> bookingIds = new ArrayList<>();

  @Version
  public Long version;

  public interface Repository extends JpaRepository<Payout, String> {
    List<Payout> findByVendorIdOrderByCreatedAtDesc(String vendorId);

    List<Payout> findAllByOrderByCreatedAtDesc();
  }
}
