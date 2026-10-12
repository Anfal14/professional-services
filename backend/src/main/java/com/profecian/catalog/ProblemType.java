package com.profecian.catalog;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapKeyColumn;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.util.Map;
import java.util.TreeMap;

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

  /** Exact prices for single cities (by city name), used instead of the city's price level. */
  @ElementCollection(fetch = FetchType.EAGER)
  @CollectionTable(name = "problem_type_city_prices", joinColumns = @JoinColumn(name = "problem_type_id"))
  @MapKeyColumn(name = "city_name")
  @Column(name = "price")
  public Map<String, BigDecimal> cityPrices = new TreeMap<>();

  @Version
  public Long version;
}
