package com.profecian.customers;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/** Saved address. `location` (PostGIS geography) is a generated column computed from lat/lng. */
@Entity
@Table(name = "customer_addresses")
public class CustomerAddress {
  @Id
  public String id;

  /** Home | Work | Other */
  public String label;
  public String line;
  public String landmark;
  public String city;
  public String pincode;
  public Double lat;
  public Double lng;

  /** Display order; 0 is the newest. */
  public int position;

  @Column(name = "created_at")
  public Instant createdAt = Instant.now();
}
