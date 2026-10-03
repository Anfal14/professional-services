package com.profecian.payments;

import com.profecian.auth.CurrentUser;
import com.profecian.bookings.Booking;
import com.profecian.bookings.BookingCore;
import com.profecian.bookings.BookingRepository;
import com.profecian.common.ApiException;
import com.profecian.common.Ids;
import com.profecian.notifications.NotifyFor;
import com.profecian.sync.Api;
import com.profecian.sync.ApiMapper;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * customer.payOnline from mock.ts. The gateway call happens outside any database transaction:
 *  1. mark the booking `pending` and record a payment attempt (commit);
 *  2. charge;
 *  3. record the outcome (commit) — failed bookings show the reason, paid ones write ledger rows.
 * A failure is then surfaced to the customer with the gateway's message.
 */
@Service
public class PaymentService {
  private static final Set<String> ONLINE = Set.of("upi", "card", "netbanking", "wallet");

  private final BookingRepository bookings;
  private final BookingCore core;
  private final PaymentGateway gateway;
  private final PaymentAttempt.Repository attempts;
  private final LedgerService ledger;
  private final NotifyFor notify;
  private final ApiMapper mapper;
  private final TransactionTemplate tx;

  public PaymentService(BookingRepository bookings, BookingCore core, PaymentGateway gateway, PaymentAttempt.Repository attempts,
                        LedgerService ledger, NotifyFor notify, ApiMapper mapper, TransactionTemplate tx) {
    this.bookings = bookings;
    this.core = core;
    this.gateway = gateway;
    this.attempts = attempts;
    this.ledger = ledger;
    this.notify = notify;
    this.mapper = mapper;
    this.tx = tx;
  }

  public Api.Booking payOnline(CurrentUser user, String bookingId, String method, boolean simulateFailure) {
    if (!ONLINE.contains(method)) throw ApiException.bad("Choose a payment method");
    PaymentAttempt attempt = tx.execute(s -> {
      Booking b = bookings.lockById(bookingId).orElseThrow(() -> ApiException.notFound("Booking not found"));
      if (!b.customerId.equals(user.id())) throw ApiException.notFound("Booking not found");
      if ("paid".equals(b.paymentStatus)) throw ApiException.conflict("This booking is already paid");
      if (BookingCore.isQuoteOpen(b)) throw ApiException.bad("You can pay once the inspection is done and the repair quote is settled");
      b.paymentMethod = method;
      b.paymentStatus = "pending";
      b.failureReason = null;
      core.commit(b, List.of());
      PaymentAttempt a = new PaymentAttempt();
      a.id = Ids.newId("pat");
      a.bookingId = b.id;
      a.provider = gateway.name();
      a.method = method;
      a.amount = b.total;
      return attempts.save(a);
    });

    PaymentGateway.ChargeResult result;
    try {
      Booking b = core.load(bookingId);
      result = gateway.charge(new PaymentGateway.ChargeRequest(b.total, method, b.code, simulateFailure));
    } catch (RuntimeException e) {
      result = PaymentGateway.ChargeResult.failed("Payment could not be started. Please try again");
    }
    final PaymentGateway.ChargeResult outcome = result;
    Api.Booking updated = tx.execute(s -> applyOutcome(attempt.id, outcome, method));
    if ("failed".equals(outcome.status())) throw ApiException.bad(outcome.failureReason());
    return updated;
  }

  /** Applies a gateway result once (also used by webhooks). Safe to call again for the same attempt. */
  Api.Booking applyOutcome(String attemptId, PaymentGateway.ChargeResult result, String method) {
    PaymentAttempt a = attempts.findById(attemptId).orElseThrow();
    Booking b = bookings.lockById(a.bookingId).orElseThrow();
    if (!"created".equals(a.status) || "pending".equals(result.status())) {
      if (result.providerRef() != null) a.providerRef = result.providerRef();
      return mapper.booking(b);
    }
    a.updatedAt = core.clock().instant();
    if (result.providerRef() != null) a.providerRef = result.providerRef();
    if ("succeeded".equals(result.status())) {
      a.status = "succeeded";
      if ("paid".equals(b.paymentStatus)) return mapper.booking(b);
      b.paymentMethod = method;
      b.paymentStatus = "paid";
      b.paidAt = core.clock().instant();
      b.txnId = result.providerRef();
      b.failureReason = null;
      core.event(b, "payment_received", "system", result.providerRef());
      ledger.recordPayment(b);
      return mapper.booking(core.commit(b, notify.paymentReceived(b)));
    }
    a.status = "failed";
    a.failureReason = result.failureReason();
    b.paymentMethod = method;
    b.paymentStatus = "failed";
    b.failureReason = result.failureReason();
    core.event(b, "payment_failed", "system", result.failureReason());
    return mapper.booking(core.commit(b, notify.paymentFailed(b, result.failureReason())));
  }
}
