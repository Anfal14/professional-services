package com.profecian.auth;

import java.util.List;
import java.util.Map;

/** ROLE_PERMISSIONS from mock.ts. Admin permissions become authorities "PERM_<name>". */
public final class Permissions {
  private Permissions() {}

  public static final Map<String, List<String>> ROLE_PERMISSIONS = Map.of(
      "super_admin", List.of("dashboard", "users", "vendors", "services", "bookings", "payments", "reviews", "analytics", "settings"),
      "operations", List.of("dashboard", "users", "vendors", "services", "bookings", "reviews", "analytics"),
      "finance", List.of("dashboard", "payments", "analytics"),
      "support", List.of("dashboard", "users", "bookings", "reviews"));

  public static boolean can(String adminRole, String permission) {
    return adminRole != null && ROLE_PERMISSIONS.getOrDefault(adminRole, List.of()).contains(permission);
  }
}
