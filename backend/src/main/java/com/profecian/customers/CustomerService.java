package com.profecian.customers;

import com.profecian.common.ApiException;
import com.profecian.common.Ids;
import com.profecian.common.Phones;
import com.profecian.live.LiveEvents;
import com.profecian.settings.SettingsService;
import com.profecian.sync.Api;
import com.profecian.sync.ApiMapper;
import java.time.Clock;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Customer profile and saved addresses — customer.createProfile / updateProfile / saveAddress / deleteAddress in mock.ts. */
@Service
public class CustomerService {
  private final CustomerRepository customers;
  private final SettingsService settings;
  private final ApiMapper mapper;
  private final LiveEvents live;
  private final Clock clock;

  public CustomerService(CustomerRepository customers, SettingsService settings, ApiMapper mapper, LiveEvents live, Clock clock) {
    this.customers = customers;
    this.settings = settings;
    this.mapper = mapper;
    this.live = live;
    this.clock = clock;
  }

  public Customer get(String id) {
    return customers.findById(id).orElseThrow(() -> ApiException.notFound("Customer not found"));
  }

  @Transactional
  public Customer create(String rawPhone, String name, String email, String city) {
    String phone = Phones.normalize(rawPhone);
    if (customers.existsByPhone(phone)) throw ApiException.conflict("An account already exists for this number");
    if (name == null || name.trim().length() < 2) throw ApiException.bad("Please enter your full name");
    Customer c = new Customer();
    c.id = Ids.newId("cus");
    c.name = name.trim();
    c.phone = phone;
    c.email = email == null || email.isBlank() ? null : email.trim();
    c.city = city;
    c.createdAt = clock.instant();
    customers.save(c);
    live.notify("admin", "admin", null);
    return c;
  }

  public record ProfilePatch(String name, String email, String city) {}

  @Transactional
  public Api.Customer updateProfile(String id, ProfilePatch patch) {
    Customer c = get(id);
    if (patch.name() != null) c.name = patch.name().trim();
    if (patch.email() != null) c.email = patch.email().isBlank() ? null : patch.email().trim();
    if (patch.city() != null) c.city = patch.city();
    live.notify("customer", id, null);
    live.notify("admin", "admin", null);
    return mapper.customer(c);
  }

  public record AddressInput(String id, String label, String line, String landmark, String city, String pincode, Double lat, Double lng) {}

  /** Upserts by id; new addresses go first. Missing coordinates are placed near the city centre (jitterNear). */
  @Transactional
  public CustomerAddress saveAddress(String customerId, AddressInput in) {
    if (in.line() == null || in.line().isBlank()) throw ApiException.bad("Enter the address");
    if (in.city() == null || in.city().isBlank()) throw ApiException.bad("Choose a city");
    String label = in.label() == null ? "Home" : in.label();
    if (!List.of("Home", "Work", "Other").contains(label)) throw ApiException.bad("Invalid address label");
    Customer c = get(customerId);
    CustomerAddress a = in.id() == null ? null : c.addresses.stream().filter(x -> x.id.equals(in.id())).findFirst().orElse(null);
    if (a == null) {
      a = new CustomerAddress();
      a.id = in.id() != null && !in.id().isBlank() ? in.id() : Ids.newId("adr");
      for (CustomerAddress other : c.addresses) other.position += 1;
      a.position = 0;
      c.addresses.add(0, a);
    }
    a.label = label;
    a.line = in.line().trim();
    a.landmark = in.landmark() == null || in.landmark().isBlank() ? null : in.landmark().trim();
    a.city = in.city();
    a.pincode = in.pincode() == null || in.pincode().isBlank() ? null : in.pincode();
    if (in.lat() != null && in.lng() != null) {
      a.lat = in.lat();
      a.lng = in.lng();
    } else {
      double[] p = settings.jitterNear(a.city, a.line);
      a.lat = p[0];
      a.lng = p[1];
    }
    customers.saveAndFlush(c);
    live.notify("customer", customerId, null);
    return a;
  }

  @Transactional
  public void deleteAddress(String customerId, String addressId) {
    Customer c = get(customerId);
    c.addresses.removeIf(a -> a.id.equals(addressId));
    for (int i = 0; i < c.addresses.size(); i++) c.addresses.get(i).position = i;
    live.notify("customer", customerId, null);
  }

  @Transactional
  public void setBlocked(String id, boolean blocked) {
    get(id).blocked = blocked;
    live.notify("admin", "admin", null);
    live.notify("customer", id, null);
  }
}
