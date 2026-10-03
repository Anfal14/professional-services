package com.profecian.payments;

import com.profecian.bookings.Booking;
import java.math.BigDecimal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Commission / earning / settlement records. On payment:
 *  - online: customer_payment (total), platform_commission, vendor_earning (owed to the vendor);
 *  - cash:   customer_payment (collected by the vendor), cash_commission_due (vendor owes the platform).
 */
@Service
public class LedgerService {
  private final LedgerEntry.Repository entries;

  public LedgerService(LedgerEntry.Repository entries) {
    this.entries = entries;
  }

  @Transactional(propagation = Propagation.MANDATORY)
  public void recordPayment(Booking b) {
    entries.save(LedgerEntry.of("customer_payment", b.id, b.vendorId, null, b.total));
    if ("cash".equals(b.paymentMethod)) {
      entries.save(LedgerEntry.of("cash_commission_due", b.id, b.vendorId, null, b.commission));
    } else {
      entries.save(LedgerEntry.of("platform_commission", b.id, b.vendorId, null, b.commission));
      if (b.vendorId != null) entries.save(LedgerEntry.of("vendor_earning", b.id, b.vendorId, null, b.vendorPayout));
    }
  }

  @Transactional(propagation = Propagation.MANDATORY)
  public void recordPayoutSettled(String payoutId, String vendorId, BigDecimal amount) {
    entries.save(LedgerEntry.of("payout_settled", null, vendorId, payoutId, amount));
  }
}
