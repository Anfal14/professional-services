package com.profecian.complaints;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

@Entity
@Table(name = "complaints")
public class Complaint {
  @Id
  public String id;

  @Column(name = "booking_id")
  public String bookingId;
  @Column(name = "customer_id")
  public String customerId;
  @Column(name = "vendor_id")
  public String vendorId;

  public String subject;
  public String message;

  /** open | in_progress | resolved */
  public String status = "open";
  public String resolution;

  @Column(name = "created_at")
  public Instant createdAt = Instant.now();
  @Column(name = "updated_at")
  public Instant updatedAt = Instant.now();

  public interface Repository extends JpaRepository<Complaint, String> {
    List<Complaint> findAllByOrderByCreatedAtDesc();

    List<Complaint> findByCustomerIdOrderByCreatedAtDesc(String customerId);
  }
}
