package com.profecian;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Profecian backend — one deployable split into modules by package (auth, customers,
 * vendors, catalog, bookings, assignment, payments, payouts, reviews, complaints,
 * notifications, admin, analytics). Behaviour mirrors packages/shared/src/mock.ts.
 */
@SpringBootApplication
@ConfigurationPropertiesScan
@EnableScheduling
public class ProfecianApplication {
  public static void main(String[] args) {
    SpringApplication.run(ProfecianApplication.class, args);
  }
}
