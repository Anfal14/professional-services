package com.profecian.auth;

import com.profecian.sync.Api;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Auth")
public class AuthController {
  private final AuthService auth;

  public AuthController(AuthService auth) {
    this.auth = auth;
  }

  public record OtpRequest(String phone) {}

  public record OtpVerify(String requestId, String code) {}

  public record CustomerSignup(String signupToken, String name, String email, String city) {}

  public record VendorSignup(String signupToken, String name, String email, String city, List<String> categoryIds, List<String> serviceAreas) {}

  public record AdminLogin(String email, String password) {}

  public record Refresh(String refreshToken) {}

  @Operation(summary = "Send an OTP to a phone number (customers and vendors). Sandbox code: 123456")
  @PostMapping("/otp")
  public Api.OtpSent otp(@RequestBody OtpRequest r) {
    return auth.requestOtp(r.phone());
  }

  @Operation(summary = "Verify a customer OTP: tokens for a known number, a signup token for a new one")
  @PostMapping("/customer/verify")
  public Api.VerifyResult verifyCustomer(@RequestBody OtpVerify r) {
    return auth.verifyCustomer(r.requestId(), r.code());
  }

  @PostMapping("/customer/profile")
  public Api.VerifyResult createCustomer(@RequestBody CustomerSignup r) {
    return auth.createCustomer(r.signupToken(), r.name(), r.email(), r.city());
  }

  @PostMapping("/vendor/verify")
  public Api.VerifyResult verifyVendor(@RequestBody OtpVerify r) {
    return auth.verifyVendor(r.requestId(), r.code());
  }

  @PostMapping("/vendor/register")
  public Api.VerifyResult registerVendor(@RequestBody VendorSignup r) {
    return auth.registerVendor(r.signupToken(), r.name(), r.email(), r.city(), r.categoryIds(), r.serviceAreas());
  }

  @PostMapping("/admin/login")
  public Api.LoginResult adminLogin(@RequestBody AdminLogin r) {
    return auth.adminLogin(r.email(), r.password());
  }

  @Operation(summary = "Rotate a refresh token for a new token pair")
  @PostMapping("/refresh")
  public Api.Tokens refresh(@RequestBody Refresh r) {
    return auth.refresh(r.refreshToken());
  }

  @PostMapping("/logout")
  public ResponseEntity<Void> logout(@RequestBody Refresh r) {
    auth.logout(r.refreshToken());
    return ResponseEntity.noContent().build();
  }
}
