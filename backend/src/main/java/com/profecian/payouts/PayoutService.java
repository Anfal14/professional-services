package com.profecian.payouts;

import com.profecian.bookings.Booking;
import com.profecian.bookings.BookingRepository;
import com.profecian.common.ApiException;
import com.profecian.common.Ids;
import com.profecian.live.LiveEvents;
import com.profecian.notifications.NotificationService;
import com.profecian.notifications.NotifyFor;
import com.profecian.payments.LedgerService;
import com.profecian.pricing.Wallet;
import com.profecian.sync.Api;
import com.profecian.sync.ApiMapper;
import java.math.BigDecimal;
import java.time.Clock;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** vendor.requestPayout, admin.createPayout / updatePayout and the wallet — mock.ts + computeVendorWallet. */
@Service
public class PayoutService {
  private static final List<String> STATUSES = List.of("pending", "processing", "settled", "failed");

  private final Payout.Repository payouts;
  private final BookingRepository bookings;
  private final NotificationService notifications;
  private final NotifyFor notify;
  private final LedgerService ledger;
  private final ApiMapper mapper;
  private final LiveEvents live;
  private final Clock clock;

  public PayoutService(Payout.Repository payouts, BookingRepository bookings, NotificationService notifications, NotifyFor notify,
                       LedgerService ledger, ApiMapper mapper, LiveEvents live, Clock clock) {
    this.payouts = payouts;
    this.bookings = bookings;
    this.notifications = notifications;
    this.notify = notify;
    this.ledger = ledger;
    this.mapper = mapper;
    this.live = live;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public Wallet.Summary wallet(String vendorId) {
    List<Booking> jobs = bookings.findByVendorIdOrderByCreatedAtDesc(vendorId);
    List<Payout> mine = payouts.findByVendorIdOrderByCreatedAtDesc(vendorId);
    return Wallet.compute(
        jobs.stream().map(b -> new Wallet.Job(b.status, b.paymentStatus, b.paymentMethod, b.serviceAmount, b.commission, b.vendorPayout)).toList(),
        mine.stream().map(p -> new Wallet.PayoutRow(p.amount, p.status)).toList());
  }

  @Transactional
  public Api.Payout request(String vendorId) {
    Wallet.Summary w = wallet(vendorId);
    if (w.balance().compareTo(BigDecimal.valueOf(100)) < 0) throw ApiException.bad("Minimum payout is ₹100");
    Set<String> settled = new HashSet<>();
    payouts.findByVendorIdOrderByCreatedAtDesc(vendorId).forEach(p -> settled.addAll(p.bookingIds));
    Payout p = new Payout();
    p.id = Ids.newId("pay");
    p.vendorId = vendorId;
    p.amount = w.balance();
    p.bookingIds.addAll(bookings.findByVendorIdAndStatus(vendorId, "completed").stream()
        .filter(b -> "paid".equals(b.paymentStatus) && !settled.contains(b.id)).map(b -> b.id).toList());
    p.status = "pending";
    p.createdAt = clock.instant();
    payouts.save(p);
    live.notify("vendor", vendorId, null);
    live.notify("admin", "admin", null);
    return mapper.payout(p);
  }

  @Transactional
  public Api.Payout update(String id, String status) {
    if (!STATUSES.contains(status)) throw ApiException.bad("Unknown payout status");
    Payout p = payouts.findById(id).orElseThrow(() -> ApiException.notFound("Payout not found"));
    boolean settling = "settled".equals(status) && !"settled".equals(p.status);
    p.status = status;
    if (settling) {
      p.utr = "UTR" + String.valueOf(clock.millis()).substring(3);
      p.settledAt = clock.instant();
      ledger.recordPayoutSettled(p.id, p.vendorId, p.amount);
      notifications.publish(notify.payoutSettled(p.vendorId, p.amount, p.utr));
    }
    live.notify("vendor", p.vendorId, null);
    live.notify("admin", "admin", null);
    return mapper.payout(p);
  }
}
