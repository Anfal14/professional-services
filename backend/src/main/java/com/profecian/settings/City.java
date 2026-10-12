package com.profecian.settings;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/** A city the platform knows — `City` in types.ts. The name is the key addresses, vendors and bookings store. */
@Entity
@Table(name = "platform_cities")
public class City {
  @Id
  public String name;

  public int position;
  public Double lat;
  public Double lng;
  public String state = "";

  /** live | coming_soon | paused */
  public String status = "live";

  @Column(name = "radius_km")
  public int radiusKm = 25;

  @ElementCollection(fetch = FetchType.EAGER)
  @CollectionTable(name = "platform_city_areas", joinColumns = @JoinColumn(name = "city_name"))
  @OrderColumn(name = "position")
  @Column(name = "area")
  public List<String> areas = new ArrayList<>();

  @ElementCollection(fetch = FetchType.EAGER)
  @CollectionTable(name = "platform_city_disabled_categories", joinColumns = @JoinColumn(name = "city_name"))
  @Column(name = "category_id")
  public Set<String> disabledCategoryIds = new LinkedHashSet<>();

  /** Prices here as a percentage of the base price (100 = base). */
  @Column(name = "price_level")
  public int priceLevel = 100;

  /** Commission for bookings in this city; null → the category's rate. */
  @Column(name = "commission_rate")
  public BigDecimal commissionRate;

  public boolean isLive() {
    return "live".equals(status);
  }
}
