package com.profecian.pricing;

import com.profecian.catalog.ProblemType;
import com.profecian.catalog.ServiceCategory;
import com.profecian.settings.City;
import com.profecian.settings.PlatformSettings;
import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * City-based pricing — the "City pricing" section of cities.ts. What a booking costs and what the
 * platform keeps both follow the city of the visit address.
 */
public final class CityPricing {
  private CityPricing() {}

  public static final int PRICE_LEVEL_MIN = 50;
  public static final int PRICE_LEVEL_MAX = 300;
  public static final int BASE_PRICE_LEVEL = 100;

  /**
   * A base amount at a city's price level: base × level%, rounded to the nearest amount ending in 9
   * (₹311 → ₹309, ₹315 → ₹319; a tie goes up). Level 100 returns the base untouched, and a free
   * service stays free. Whole-number arithmetic, identical to cityPrice() in cities.ts.
   */
  public static BigDecimal cityPrice(BigDecimal base, int priceLevel) {
    if (priceLevel == BASE_PRICE_LEVEL || base.signum() <= 0) return base;
    // In 1/10000 ₹: (x − 9 + 5) / 10, floored, × 10 + 9 is the nearest number ending in 9 to x.
    long scaled = base.movePointRight(2).setScale(0, RoundingMode.HALF_UP).longValueExact() * priceLevel;
    return BigDecimal.valueOf(Math.max(9, Math.floorDiv(scaled - 40_000, 100_000) * 10 + 9));
  }

  /** What a problem costs in a city: the exact price set for that city, otherwise the base price at the city's level. */
  public static BigDecimal problemPrice(ProblemType problem, City city) {
    if (city == null) return problem.price;
    BigDecimal exact = problem.cityPrices.get(city.name);
    return exact != null ? exact : cityPrice(problem.price, city.priceLevel);
  }

  /** The "Other / Not sure" visit fee in a city: the category's (or default) fee at the city's price level. */
  public static int inspectionFee(ServiceCategory category, PlatformSettings settings, City city) {
    int fee = category != null && category.inspectionFee != null ? category.inspectionFee : settings.defaultInspectionFee;
    return city == null ? fee : cityPrice(BigDecimal.valueOf(fee), city.priceLevel).intValueExact();
  }

  /** Commission for a booking in a city: the city's rate if it has one, otherwise the category's (or the default). */
  public static BigDecimal commissionRate(ServiceCategory category, PlatformSettings settings, City city) {
    if (city != null && city.commissionRate != null) return city.commissionRate;
    return category != null && category.commissionRate != null ? category.commissionRate : settings.defaultCommissionRate;
  }
}
