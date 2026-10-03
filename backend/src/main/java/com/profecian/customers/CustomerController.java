package com.profecian.customers;

import com.profecian.auth.CurrentUser;
import com.profecian.bookings.CustomerBookingService;
import com.profecian.payments.IdempotencyService;
import com.profecian.payments.PaymentService;
import com.profecian.sync.Api;
import com.profecian.sync.ApiMapper;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The `customer` group of the apps' backend. Every action applies to the signed-in customer. */
@RestController
@RequestMapping("/api/v1/customer")
@Tag(name = "Customer")
@SecurityRequirement(name = "bearer")
public class CustomerController {
  private final CustomerService customers;
  private final CustomerBookingService bookings;
  private final PaymentService payments;
  private final IdempotencyService idempotency;
  private final ApiMapper mapper;

  public CustomerController(CustomerService customers, CustomerBookingService bookings, PaymentService payments, IdempotencyService idempotency, ApiMapper mapper) {
    this.customers = customers;
    this.bookings = bookings;
    this.payments = payments;
    this.idempotency = idempotency;
    this.mapper = mapper;
  }

  @PatchMapping("/profile")
  public Api.Customer updateProfile(@RequestBody CustomerService.ProfilePatch patch) {
    return customers.updateProfile(CurrentUser.get().id(), patch);
  }

  @PostMapping("/addresses")
  public Api.Address saveAddress(@RequestBody CustomerService.AddressInput address) {
    return mapper.address(customers.saveAddress(CurrentUser.get().id(), address));
  }

  @DeleteMapping("/addresses/{id}")
  public ResponseEntity<Void> deleteAddress(@PathVariable String id) {
    customers.deleteAddress(CurrentUser.get().id(), id);
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/bookings")
  public Api.Booking createBooking(@RequestBody CustomerBookingService.CreateBooking input) {
    return bookings.create(CurrentUser.get(), input);
  }

  /** Cart checkout: one booking per service, all created in one transaction (or none). */
  @PostMapping("/checkout")
  public List<Api.Booking> checkout(@RequestBody CustomerBookingService.Checkout input) {
    return bookings.checkout(CurrentUser.get(), input);
  }

  public record Reason(String reason) {}

  public record Reschedule(LocalDate date, String slot) {}

  public record Answer(String answer) {}

  public record QuoteAnswer(boolean approve) {}

  public record Pay(String method, boolean simulateFailure) {}

  @PostMapping("/bookings/{id}/cancel")
  public Api.Booking cancel(@PathVariable String id, @RequestBody Reason r) {
    return bookings.cancel(CurrentUser.get(), id, r.reason());
  }

  @PostMapping("/bookings/{id}/reschedule")
  public Api.Booking reschedule(@PathVariable String id, @RequestBody Reschedule r) {
    return bookings.reschedule(CurrentUser.get(), id, r.date(), r.slot());
  }

  @PostMapping("/bookings/{id}/cash")
  public Api.Booking chooseCash(@PathVariable String id) {
    return bookings.chooseCash(CurrentUser.get(), id);
  }

  /** Online payment. Send an `Idempotency-Key` so a retried request never charges twice. */
  @PostMapping("/bookings/{id}/pay")
  public Api.Booking pay(@PathVariable String id, @RequestBody Pay r, @RequestHeader(value = "Idempotency-Key", required = false) String key) {
    CurrentUser u = CurrentUser.get();
    return idempotency.run(u.role() + ":" + u.id(), key, id + ":" + r.method() + ":" + r.simulateFailure(), Api.Booking.class,
        () -> payments.payOnline(u, id, r.method(), r.simulateFailure()));
  }

  @PostMapping("/bookings/{id}/clarification")
  public Api.Booking answer(@PathVariable String id, @RequestBody Answer r) {
    return bookings.answerClarification(CurrentUser.get(), id, r.answer());
  }

  @PostMapping("/bookings/{id}/quote")
  public Api.Booking respondToQuote(@PathVariable String id, @RequestBody QuoteAnswer r) {
    return bookings.respondToQuote(CurrentUser.get(), id, r.approve());
  }

  @PostMapping("/reviews")
  public Api.Review review(@RequestBody CustomerBookingService.ReviewInput r) {
    return bookings.submitReview(CurrentUser.get(), r);
  }

  @PostMapping("/complaints")
  public Api.Complaint complaint(@RequestBody CustomerBookingService.ComplaintInput r) {
    return bookings.raiseComplaint(CurrentUser.get(), r);
  }
}
