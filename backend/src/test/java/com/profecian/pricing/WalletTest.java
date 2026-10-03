package com.profecian.pricing;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

/** computeVendorWallet in packages/shared/src/pricing.ts. */
class WalletTest {
  private static Wallet.Job job(String status, String pay, String method, int service, int commission) {
    return new Wallet.Job(status, pay, method, BigDecimal.valueOf(service), BigDecimal.valueOf(commission), BigDecimal.valueOf(service - commission));
  }

  @Test
  void onlinePayoutsMinusCashCommissionMinusPayouts() {
    List<Wallet.Job> jobs = List.of(
        job("completed", "paid", "upi", 1000, 200),   // platform owes 800
        job("completed", "paid", "cash", 500, 100),   // vendor owes 100
        job("completed", "unpaid", null, 300, 60),    // counted in earnings, not in balance
        job("in_progress", "unpaid", null, 999, 199)  // ignored
    );
    List<Wallet.PayoutRow> payouts = List.of(
        new Wallet.PayoutRow(BigDecimal.valueOf(300), "settled"),
        new Wallet.PayoutRow(BigDecimal.valueOf(100), "pending"),
        new Wallet.PayoutRow(BigDecimal.valueOf(50), "failed"));

    Wallet.Summary w = Wallet.compute(jobs, payouts);

    assertThat(w.completedJobs()).isEqualTo(3);
    assertThat(w.grossEarnings()).isEqualByComparingTo("1800");
    assertThat(w.commissionDeducted()).isEqualByComparingTo("360");
    assertThat(w.netEarnings()).isEqualByComparingTo("1440");
    assertThat(w.onlinePayoutOwed()).isEqualByComparingTo("800");
    assertThat(w.cashCommissionOwed()).isEqualByComparingTo("100");
    assertThat(w.settled()).isEqualByComparingTo("300");
    assertThat(w.inProcess()).isEqualByComparingTo("100");
    assertThat(w.balance()).isEqualByComparingTo("300"); // 800 − 100 − 300 − 100
  }

  @Test
  void balanceCanBeNegativeWhenVendorOwesCashCommission() {
    Wallet.Summary w = Wallet.compute(List.of(job("completed", "paid", "cash", 1000, 200)), List.of());
    assertThat(w.balance()).isEqualByComparingTo("-200");
  }
}
