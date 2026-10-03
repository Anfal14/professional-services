package com.profecian.payments;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/** One charge attempt with the gateway; webhooks are matched to it by `providerRef`. */
@Entity
@Table(name = "payment_attempts")
public class PaymentAttempt {
  @Id
  public String id;

  @Column(name = "booking_id")
  public String bookingId;

  public String provider;
  public String method;
  public BigDecimal amount;

  /** created | succeeded | failed */
  public String status = "created";

  @Column(name = "provider_ref")
  public String providerRef;

  @Column(name = "failure_reason")
  public String failureReason;

  @Column(name = "created_at")
  public Instant createdAt = Instant.now();
  @Column(name = "updated_at")
  public Instant updatedAt = Instant.now();

  public interface Repository extends JpaRepository<PaymentAttempt, String> {
    Optional<PaymentAttempt> findByProviderAndProviderRef(String provider, String providerRef);
  }
}
