package com.profecian.catalog;

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

@Entity
@Table(name = "service_categories")
public class ServiceCategory {
  @Id
  public String id;

  public String name;
  public String tagline = "";
  public String description = "";
  public String icon;
  public String image = "";
  public String tint;
  public boolean enabled = true;
  public boolean popular;

  @Column(name = "commission_rate")
  public BigDecimal commissionRate;

  /** Null → settings.defaultInspectionFee. */
  @Column(name = "inspection_fee")
  public Integer inspectionFee;

  @Column(name = "sort_order")
  public int sortOrder;

  @Column(name = "created_at")
  public Instant createdAt = Instant.now();

  @ElementCollection(fetch = FetchType.EAGER)
  @CollectionTable(name = "category_includes", joinColumns = @JoinColumn(name = "category_id"))
  @OrderColumn(name = "position")
  @Column(name = "text")
  public List<String> includes = new ArrayList<>();

  @Version
  public Long version;
}
