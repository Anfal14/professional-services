package com.profecian.auth;

import com.profecian.admin.AdminUser;
import com.profecian.common.ApiException;
import com.profecian.customers.Customer;
import com.profecian.customers.CustomerRepository;
import com.profecian.customers.CustomerService;
import com.profecian.sync.Api;
import com.profecian.sync.ApiMapper;
import com.profecian.vendors.Vendor;
import com.profecian.vendors.VendorRepository;
import com.profecian.vendors.VendorService;
import java.util.List;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Login flows. Customers and vendors use phone OTP: a known number gets tokens; a new number gets
 * a short-lived signup token used to create the profile. Admins use email + bcrypt password.
 */
@Service
public class AuthService {
  private final OtpService otp;
  private final TokenService tokens;
  private final JwtService jwt;
  private final CustomerRepository customers;
  private final CustomerService customerService;
  private final VendorRepository vendors;
  private final VendorService vendorService;
  private final AdminUser.Repository admins;
  private final PasswordEncoder passwords;
  private final ApiMapper mapper;

  public AuthService(OtpService otp, TokenService tokens, JwtService jwt, CustomerRepository customers, CustomerService customerService,
                     VendorRepository vendors, VendorService vendorService, AdminUser.Repository admins, PasswordEncoder passwords, ApiMapper mapper) {
    this.otp = otp;
    this.tokens = tokens;
    this.jwt = jwt;
    this.customers = customers;
    this.customerService = customerService;
    this.vendors = vendors;
    this.vendorService = vendorService;
    this.admins = admins;
    this.passwords = passwords;
    this.mapper = mapper;
  }

  public Api.OtpSent requestOtp(String phone) {
    OtpService.Sent s = otp.request(phone);
    return new Api.OtpSent(s.requestId(), s.resendInSec());
  }

  @Transactional
  public Api.VerifyResult verifyCustomer(String requestId, String code) {
    String phone = otp.verify(requestId, code);
    Customer c = customers.findByPhone(phone).orElse(null);
    if (c == null) return new Api.VerifyResult(phone, null, null, null, null, jwt.signupToken("customer", phone));
    if (c.blocked) throw ApiException.forbidden("This account has been blocked. Please contact support.");
    return new Api.VerifyResult(phone, mapper.customer(c), null, new Api.Session("customer", c.id), tokens(tokens.issue("customer", c.id, null)), null);
  }

  @Transactional
  public Api.VerifyResult createCustomer(String signupToken, String name, String email, String city) {
    String phone = jwt.verifySignup(signupToken, "customer");
    Customer c = customerService.create(phone, name, email, city);
    return new Api.VerifyResult(phone, mapper.customer(c), null, new Api.Session("customer", c.id), tokens(tokens.issue("customer", c.id, null)), null);
  }

  @Transactional
  public Api.VerifyResult verifyVendor(String requestId, String code) {
    String phone = otp.verify(requestId, code);
    Vendor v = vendors.findByPhone(phone).orElse(null);
    if (v == null) return new Api.VerifyResult(phone, null, null, null, null, jwt.signupToken("vendor", phone));
    return new Api.VerifyResult(phone, null, mapper.vendor(v, true), new Api.Session("vendor", v.id), tokens(tokens.issue("vendor", v.id, null)), null);
  }

  @Transactional
  public Api.VerifyResult registerVendor(String signupToken, String name, String email, String city, List<String> categoryIds, List<String> serviceAreas) {
    String phone = jwt.verifySignup(signupToken, "vendor");
    Vendor v = vendorService.register(phone, name, email, city, categoryIds, serviceAreas);
    return new Api.VerifyResult(phone, null, mapper.vendor(v, true), new Api.Session("vendor", v.id), tokens(tokens.issue("vendor", v.id, null)), null);
  }

  @Transactional
  public Api.LoginResult adminLogin(String email, String password) {
    AdminUser a = admins.findByEmailIgnoreCase(email == null ? "" : email.trim()).filter(x -> x.active).orElse(null);
    if (a == null || password == null || !passwords.matches(password, a.passwordHash)) throw ApiException.unauthorized("Invalid email or password");
    return new Api.LoginResult(new Api.AdminUser(a.id, a.name, a.email, a.role), new Api.Session("admin", a.id), tokens(tokens.issue("admin", a.id, a.role)));
  }

  public Api.Tokens refresh(String refreshToken) {
    return tokens(tokens.refresh(refreshToken, id -> admins.findById(id).filter(a -> a.active).map(a -> a.role)
        .orElseThrow(() -> ApiException.unauthorized("Please log in again"))));
  }

  public void logout(String refreshToken) {
    tokens.revoke(refreshToken);
  }

  private static Api.Tokens tokens(TokenService.Tokens t) {
    return new Api.Tokens(t.accessToken(), t.refreshToken(), t.expiresIn());
  }
}
