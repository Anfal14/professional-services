package com.profecian.pricing;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * The single place money is calculated — computeBreakdown in pricing.ts.
 * - Customer pays serviceAmount + tax (GST on the service, added on top).
 * - Platform keeps commissionRate of serviceAmount.
 * - Vendor earns serviceAmount − commission.
 * Tax and commission are rounded to whole rupees so customers never see paise.
 */
public final class Pricing {
  private Pricing() {}

  public record Breakdown(BigDecimal serviceAmount, BigDecimal tax, BigDecimal total, BigDecimal commissionRate, BigDecimal commission, BigDecimal vendorPayout) {}

  public static Breakdown compute(BigDecimal serviceAmount, BigDecimal commissionRate, BigDecimal taxRate) {
    BigDecimal amount = round2(serviceAmount.max(BigDecimal.ZERO));
    BigDecimal tax = amount.multiply(taxRate).setScale(0, RoundingMode.HALF_UP);
    BigDecimal commission = amount.multiply(commissionRate).setScale(0, RoundingMode.HALF_UP);
    return new Breakdown(amount, tax, round2(amount.add(tax)), commissionRate, commission, round2(amount.subtract(commission)));
  }

  /** Pre-tax amount of a visit: known problems + inspection fee, or + the approved quote instead of the fee. */
  public static BigDecimal serviceAmount(List<BigDecimal> itemPrices, Integer inspectionFee, BigDecimal approvedQuote) {
    BigDecimal items = itemPrices.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
    if (inspectionFee == null) return items;
    return items.add(approvedQuote != null ? approvedQuote : BigDecimal.valueOf(inspectionFee));
  }

  public static BigDecimal round2(BigDecimal value) {
    return value.setScale(2, RoundingMode.HALF_UP);
  }
}
