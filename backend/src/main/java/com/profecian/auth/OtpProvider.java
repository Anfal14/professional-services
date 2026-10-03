package com.profecian.auth;

import com.profecian.config.AppProperties;
import com.profecian.notifications.Providers.SmsProvider;
import java.security.SecureRandom;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Generates and delivers one-time codes. The sandbox accepts the fixed code 123456 and sends nothing. */
public interface OtpProvider {
  String TEST_OTP = "123456";

  /** Picks the code for this request and sends it to the phone. */
  String issue(String phone);

  @Configuration
  class Config {
    @Bean
    OtpProvider otpProvider(AppProperties props, SmsProvider sms) {
      if (props.otp().sandbox()) return phone -> TEST_OTP;
      SecureRandom random = new SecureRandom();
      return phone -> {
        String code = String.format("%06d", random.nextInt(1_000_000));
        sms.send(phone, code + " is your Profecian verification code. It expires in 5 minutes. Do not share it.");
        return code;
      };
    }
  }
}
