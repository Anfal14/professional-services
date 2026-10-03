package com.profecian.payments;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Money record for the admin payments page. Written when a booking is paid (customer payment,
 * platform commission, vendor earning or cash commission due) and when a payout settles.
 */
@Entity
@Table(name = "ledger_entries")
public class LedgerEntry {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;

  /** customer_payment | platform_commission | vendor_earning | cash_commission_due | payout_settled */
  public String kind;

  @Column(name = "booking_id")
  public String bookingId;
  @Column(name = "vendor_id")
  public String vendorId;
  @Column(name = "payout_id")
  public String payoutId;

  public BigDecimal amount;

  @Column(name = "created_at")
  public Instant createdAt = Instant.now();

  public static LedgerEntry of(String kind, String bookingId, String vendorId, String payoutId, BigDecimal amount) {
    LedgerEntry e = new LedgerEntry();
    e.kind = kind;
    e.bookingId = bookingId;
    e.vendorId = vendorId;
    e.payoutId = payoutId;
    e.amount = amount;
    return e;
  }

  public interface Repository extends JpaRepository<LedgerEntry, Long> {
    List<LedgerEntry> findTop500ByOrderByCreatedAtDesc();
  }
}
