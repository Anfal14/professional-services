package com.profecian.notifications;

import com.profecian.common.Formats;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Delivery channels behind small interfaces. The stubs log and (for WhatsApp) return the wa.me
 * link the apps already show. Replace a bean with a real provider (FCM/APNs, WhatsApp Business
 * API, MSG91/Twilio) without touching the rest of the code. A provider throws to signal a
 * retryable failure; the outbox worker backs off and dead-letters after N attempts.
 */
public final class Providers {
  private Providers() {}

  public interface PushProvider {
    /** `destination` is "<audience>:<id>"; the implementation looks up that user's device tokens. */
    void send(String destination, String title, String body);
  }

  public interface WhatsAppProvider {
    /** Returns the deep link (sandbox) or the provider message id. */
    String send(String phone, String text);
  }

  public interface SmsProvider {
    void send(String phone, String text);
  }

  @Configuration
  static class Stubs {
    private static final Logger log = LoggerFactory.getLogger(Providers.class);

    @Bean
    @ConditionalOnMissingBean
    PushProvider pushProvider() {
      // TODO: FCM (Android) / APNs (iOS) via Expo push or firebase-admin, using push_tokens.
      return (destination, title, body) -> log.info("[push stub] {} — {}: {}", destination, title, body);
    }

    @Bean
    @ConditionalOnMissingBean
    WhatsAppProvider whatsAppProvider() {
      // TODO: WhatsApp Business API template messages.
      return (phone, text) -> {
        String url = Formats.whatsappLink(phone, text);
        log.info("[whatsapp stub] {} — {}", phone, url);
        return url;
      };
    }

    @Bean
    @ConditionalOnMissingBean
    SmsProvider smsProvider() {
      // TODO: MSG91 / Twilio with DLT-registered templates.
      return (phone, text) -> log.info("[sms stub] {} — {}", phone, text);
    }
  }
}
