package com.profecian.auth;

import com.profecian.common.ApiException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

/** The authenticated caller: role (customer | vendor | admin), subject id and, for admins, the admin role. */
public record CurrentUser(String role, String id, String adminRole) {

  public static CurrentUser get() {
    return find().orElseThrow(() -> ApiException.unauthorized("Please log in again"));
  }

  public static java.util.Optional<CurrentUser> find() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth instanceof JwtAuthenticationToken token) {
      Jwt jwt = token.getToken();
      return java.util.Optional.of(new CurrentUser(jwt.getClaimAsString("role"), jwt.getSubject(), jwt.getClaimAsString("adminRole")));
    }
    return java.util.Optional.empty();
  }

  public boolean isCustomer() {
    return "customer".equals(role);
  }

  public boolean isVendor() {
    return "vendor".equals(role);
  }

  public boolean isAdmin() {
    return "admin".equals(role);
  }

  /** Customers and vendors may only act on their own id (the apps pass it explicitly, like the mock). */
  public void requireSelf(String id, String message) {
    if (!this.id.equals(id)) throw ApiException.forbidden(message);
  }
}
