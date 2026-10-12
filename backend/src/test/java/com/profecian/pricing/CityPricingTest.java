package com.profecian.pricing;

import static org.assertj.core.api.Assertions.assertThat;

import com.profecian.catalog.ProblemType;
import com.profecian.catalog.ServiceCategory;
import com.profecian.settings.City;
import com.profecian.settings.PlatformSettings;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

/** Same cases as packages/shared/test/city-pricing.test.ts. */
class CityPricingTest {
  private static BigDecimal bd(String v) {
    return new BigDecimal(v);
  }

  private static City city(String name, int level, String commission) {
    City c = new City();
    c.name = name;
    c.priceLevel = level;
    c.commissionRate = commission == null ? null : bd(commission);
    return c;
  }

  @Test
  void levelPricesRoundToTheNearestAmountEndingInNine() {
    assertThat(CityPricing.cityPrice(bd("249"), 125)).isEqualByComparingTo("309"); // 311.25
    assertThat(CityPricing.cityPrice(bd("249"), 120)).isEqualByComparingTo("299"); // 298.80
    assertThat(CityPricing.cityPrice(bd("149"), 110)).isEqualByComparingTo("159"); // 163.90 → 159 (4.9 away) not 169 (5.1)
    assertThat(CityPricing.cityPrice(bd("149"), 125)).isEqualByComparingTo("189"); // 186.25
    assertThat(CityPricing.cityPrice(bd("4999"), 125)).isEqualByComparingTo("6249"); // 6248.75
    assertThat(CityPricing.cityPrice(bd("249"), 150)).isEqualByComparingTo("369"); // 373.50
    assertThat(CityPricing.cityPrice(bd("249"), 80)).isEqualByComparingTo("199"); // 199.20
  }

  @Test
  void aTieGoesUpAndTinyAmountsStayAtLeastNine() {
    assertThat(CityPricing.cityPrice(bd("300"), 105)).isEqualByComparingTo("319"); // 315 is 4 from 319, 6 from 309
    assertThat(CityPricing.cityPrice(bd("280"), 105)).isEqualByComparingTo("299"); // 294 is exactly between 289 and 299
    assertThat(CityPricing.cityPrice(bd("8"), 50)).isEqualByComparingTo("9");
  }

  @Test
  void baseLevelAndFreeServicesAreLeftAlone() {
    assertThat(CityPricing.cityPrice(bd("311"), 100)).isEqualByComparingTo("311");
    assertThat(CityPricing.cityPrice(bd("250.50"), 100)).isEqualByComparingTo("250.50");
    assertThat(CityPricing.cityPrice(bd("0"), 150)).isEqualByComparingTo("0");
  }

  @Test
  void anExactCityPriceBeatsTheLevel() {
    ProblemType fan = new ProblemType();
    fan.price = bd("249");
    fan.cityPrices.put("Mumbai", bd("349.00"));
    assertThat(CityPricing.problemPrice(fan, city("Mumbai", 125, null))).isEqualByComparingTo("349");
    assertThat(CityPricing.problemPrice(fan, city("Pune", 110, null))).isEqualByComparingTo("269"); // 273.90
    assertThat(CityPricing.problemPrice(fan, city("Solapur", 100, null))).isEqualByComparingTo("249");
    assertThat(CityPricing.problemPrice(fan, null)).isEqualByComparingTo("249");
  }

  @Test
  void inspectionFeeFollowsTheLevel() {
    PlatformSettings s = new PlatformSettings();
    s.defaultInspectionFee = 199;
    ServiceCategory painting = new ServiceCategory();
    painting.inspectionFee = 999;
    assertThat(CityPricing.inspectionFee(null, s, city("Mumbai", 125, null))).isEqualTo(249); // 248.75
    assertThat(CityPricing.inspectionFee(painting, s, city("Mumbai", 125, null))).isEqualTo(1249); // 1248.75
    assertThat(CityPricing.inspectionFee(painting, s, city("Solapur", 100, null))).isEqualTo(999);
    assertThat(CityPricing.inspectionFee(painting, s, null)).isEqualTo(999);
  }

  @Test
  void cityCommissionReplacesTheCategoryRate() {
    PlatformSettings s = new PlatformSettings();
    s.defaultCommissionRate = bd("0.2");
    ServiceCategory electrician = new ServiceCategory();
    electrician.commissionRate = bd("0.18");
    assertThat(CityPricing.commissionRate(electrician, s, city("Mumbai", 125, "0.22"))).isEqualByComparingTo("0.22");
    assertThat(CityPricing.commissionRate(electrician, s, city("Pune", 110, null))).isEqualByComparingTo("0.18");
    assertThat(CityPricing.commissionRate(electrician, s, null)).isEqualByComparingTo("0.18");
    assertThat(CityPricing.commissionRate(new ServiceCategory(), s, city("Pune", 110, null))).isEqualByComparingTo("0.2");
  }
}
