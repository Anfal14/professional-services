package com.profecian.customers;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "customers")
public class Customer {
  @Id
  public String id;

  public String name;
  public String phone;
  public String email;
  public String city;
  public boolean blocked;

  @Column(name = "created_at")
  public Instant createdAt = Instant.now();

  /** Newest first, like the mock (saved addresses are prepended). */
  @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
  @JoinColumn(name = "customer_id", nullable = false)
  @OrderBy("position ASC")
  public List<CustomerAddress> addresses = new ArrayList<>();

  @Version
  public Long version;
}
