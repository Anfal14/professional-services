package com.profecian.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;

@Entity
@Table(name = "problem_types")
public class ProblemType {
  @Id
  public String id;

  @Column(name = "category_id")
  public String categoryId;

  public String name;
  public String description = "";
  public String icon;
  public BigDecimal price;

  /** fixed | starting_at | inspection */
  @Column(name = "pricing_model")
  public String pricingModel;

  @Column(name = "duration_mins")
  public int durationMins;

  public boolean enabled = true;

  @Version
  public Long version;
}
