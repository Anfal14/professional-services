package com.profecian.reviews;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

@Entity
@Table(name = "reviews")
public class Review {
  @Id
  public String id;

  @Column(name = "booking_id")
  public String bookingId;
  @Column(name = "customer_id")
  public String customerId;
  @Column(name = "customer_name")
  public String customerName;
  @Column(name = "vendor_id")
  public String vendorId;
  @Column(name = "category_id")
  public String categoryId;

  public int rating;
  public String text = "";

  /** published | hidden | flagged */
  public String status = "published";

  @Column(name = "created_at")
  public Instant createdAt = Instant.now();

  @ElementCollection(fetch = FetchType.LAZY)
  @CollectionTable(name = "review_images", joinColumns = @JoinColumn(name = "review_id"))
  @OrderColumn(name = "position")
  @Column(name = "file_ref")
  public List<String> images = new ArrayList<>();

  public interface Repository extends JpaRepository<Review, String> {
    List<Review> findByVendorIdAndStatus(String vendorId, String status);

    List<Review> findByStatusOrderByCreatedAtDesc(String status);

    List<Review> findByVendorIdOrderByCreatedAtDesc(String vendorId);

    List<Review> findByCustomerIdOrderByCreatedAtDesc(String customerId);

    List<Review> findAllByOrderByCreatedAtDesc();
  }
}
