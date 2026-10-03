package com.profecian.payments;

import com.profecian.common.Ids;
import java.math.BigDecimal;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Payment provider. `charge` either settles synchronously (sandbox) or returns `pending` with a
 * provider reference that a later webhook confirms (real gateways). Mirrors PaymentGateway in providers.ts.
 */
public interface PaymentGateway {
  String name();

  ChargeResult charge(ChargeRequest request);

  /** HMAC check of a webhook body. */
  boolean verifyWebhook(String payload, String signature);

  record ChargeRequest(BigDecimal amount, String method, String bookingCode, boolean simulateFailure) {}

  /** status: succeeded | failed | pending */
  record ChargeResult(String status, String providerRef, String failureReason) {
    public static ChargeResult ok(String ref) {
      return new ChargeResult("succeeded", ref, null);
    }

    public static ChargeResult failed(String reason) {
      return new ChargeResult("failed", null, reason);
    }
  }

  @Configuration
  class Config {
    @Bean
    @ConditionalOnProperty(name = "profecian.payments.provider", havingValue = "sandbox", matchIfMissing = true)
    PaymentGateway sandboxGateway(com.profecian.config.AppProperties props) {
      return new PaymentGateway() {
        @Override
        public String name() {
          return "sandbox";
        }

        @Override
        public ChargeResult charge(ChargeRequest r) {
          if (r.simulateFailure()) return ChargeResult.failed("Payment declined by bank (sandbox)");
          return ChargeResult.ok("pay_" + r.bookingCode() + "_" + Ids.random(8).toUpperCase());
        }

        @Override
        public boolean verifyWebhook(String payload, String signature) {
          return Webhooks.hmacMatches(props.payments().webhookSecret(), payload, signature);
        }
      };
    }

    @Bean
    @ConditionalOnProperty(name = "profecian.payments.provider", havingValue = "razorpay")
    PaymentGateway razorpayGateway(com.profecian.config.AppProperties props) {
      return new PaymentGateway() {
        @Override
        public String name() {
          return "razorpay";
        }

        @Override
        public ChargeResult charge(ChargeRequest r) {
          // TODO Razorpay: create an Order (POST /v1/orders, amount in paise, receipt = bookingCode),
          // return ChargeResult("pending", order.id, null), let the app open Razorpay Checkout,
          // and settle in the `payment.captured` / `payment.failed` webhook.
          throw new UnsupportedOperationException("Razorpay adapter not implemented yet");
        }

        @Override
        public boolean verifyWebhook(String payload, String signature) {
          // Razorpay signs the raw body with HMAC-SHA256 using the webhook secret (X-Razorpay-Signature).
          return Webhooks.hmacMatches(props.payments().webhookSecret(), payload, signature);
        }
      };
    }
  }
}
