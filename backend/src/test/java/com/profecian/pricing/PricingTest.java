package com.profecian.pricing;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Same cases as computeBreakdown in packages/shared/src/pricing.ts. */
class PricingTest {
  private static BigDecimal bd(String v) {
    return new BigDecimal(v);
  }

  @Test
  void gstOnTopCommissionFromServiceAmountWholeRupees() {
    Pricing.Breakdown p = Pricing.compute(bd("499"), bd("0.2"), bd("0.18"));
    assertThat(p.serviceAmount()).isEqualByComparingTo("499");
    assertThat(p.tax()).isEqualByComparingTo("90"); // 89.82 → 90
    assertThat(p.total()).isEqualByComparingTo("589");
    assertThat(p.commission()).isEqualByComparingTo("100"); // 99.8 → 100
    assertThat(p.vendorPayout()).isEqualByComparingTo("399");
  }

  @Test
  void roundsHalfUpLikeMathRound() {
    // 249 × 0.18 = 44.82 → 45; 249 × 0.18 commission → 45 (rate 0.18)
    Pricing.Breakdown p = Pricing.compute(bd("249"), bd("0.18"), bd("0.18"));
    assertThat(p.tax()).isEqualByComparingTo("45");
    assertThat(p.commission()).isEqualByComparingTo("45");
    assertThat(p.vendorPayout()).isEqualByComparingTo("204");
    // 25 × 0.18 = 4.5 → 5 (Math.round rounds .5 up)
    assertThat(Pricing.compute(bd("25"), bd("0.18"), bd("0.18")).tax()).isEqualByComparingTo("5");
  }

  @Test
  void negativeAmountsClampToZero() {
    Pricing.Breakdown p = Pricing.compute(bd("-10"), bd("0.2"), bd("0.18"));
    assertThat(p.total()).isEqualByComparingTo("0");
    assertThat(p.vendorPayout()).isEqualByComparingTo("0");
  }

  @Test
  void inspectionFeeIsReplacedByApprovedQuote() {
    List<BigDecimal> items = List.of(bd("149"));
    assertThat(Pricing.serviceAmount(items, null, null)).isEqualByComparingTo("149");
    assertThat(Pricing.serviceAmount(items, 199, null)).isEqualByComparingTo("348");
    assertThat(Pricing.serviceAmount(List.of(), 199, bd("600"))).isEqualByComparingTo("600");
    // ₹600 quote + 18% GST = ₹708, as in the seeded electrician example
    assertThat(Pricing.compute(bd("600"), bd("0.18"), bd("0.18")).total()).isEqualByComparingTo("708");
  }
}
