package com.profecian.pricing;

import java.math.BigDecimal;
import java.util.List;

/**
 * Vendor wallet, derived from bookings and payouts — computeVendorWallet in pricing.ts.
 * - Online-paid jobs: the platform holds the money and owes the vendor `vendorPayout`.
 * - Cash jobs: the vendor holds the money and owes the platform `commission`.
 * Balance = online payouts owed − cash commission owed − amounts settled or in process.
 */
public final class Wallet {
  private Wallet() {}

  public record Job(String status, String paymentStatus, String paymentMethod, BigDecimal serviceAmount, BigDecimal commission, BigDecimal vendorPayout) {}

  public record PayoutRow(BigDecimal amount, String status) {}

  public record Summary(BigDecimal grossEarnings, BigDecimal commissionDeducted, BigDecimal netEarnings, BigDecimal onlinePayoutOwed,
                        BigDecimal cashCommissionOwed, BigDecimal settled, BigDecimal inProcess, BigDecimal balance, int completedJobs) {}

  public static Summary compute(List<Job> jobs, List<PayoutRow> payouts) {
    BigDecimal gross = BigDecimal.ZERO;
    BigDecimal commission = BigDecimal.ZERO;
    BigDecimal online = BigDecimal.ZERO;
    BigDecimal cashCommission = BigDecimal.ZERO;
    int completed = 0;
    for (Job j : jobs) {
      if (!"completed".equals(j.status())) continue;
      completed += 1;
      gross = gross.add(j.serviceAmount());
      commission = commission.add(j.commission());
      if (!"paid".equals(j.paymentStatus())) continue;
      if ("cash".equals(j.paymentMethod())) cashCommission = cashCommission.add(j.commission());
      else online = online.add(j.vendorPayout());
    }
    BigDecimal settled = payouts.stream().filter(p -> "settled".equals(p.status())).map(PayoutRow::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
    BigDecimal inProcess = payouts.stream().filter(p -> "pending".equals(p.status()) || "processing".equals(p.status()))
        .map(PayoutRow::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
    return new Summary(
        Pricing.round2(gross), Pricing.round2(commission), Pricing.round2(gross.subtract(commission)), Pricing.round2(online),
        Pricing.round2(cashCommission), Pricing.round2(settled), Pricing.round2(inProcess),
        Pricing.round2(online.subtract(cashCommission).subtract(settled).subtract(inProcess)), completed);
  }
}
