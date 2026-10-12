package com.profecian.settings;

import com.profecian.catalog.CatalogRepositories.CategoryRepository;
import com.profecian.catalog.ServiceCategory;
import com.profecian.common.ApiException;
import com.profecian.live.LiveEvents;
import com.profecian.pricing.CityPricing;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Managing served cities and the per-city booking rules — cities.ts on the frontend (same checks and messages). */
@Service
public class CityService {
  public static final Set<String> STATUSES = Set.of("live", "coming_soon", "paused");

  /** priceLevel null → 100 (base prices); commissionRate null → the category's rate. */
  public record CityInput(String name, String state, String status, Double lat, Double lng, Integer radiusKm, List<String> areas, List<String> disabledCategoryIds,
                          Integer priceLevel, BigDecimal commissionRate) {}

  private final SettingsService.CityRepository cities;
  private final CategoryRepository categories;
  private final NamedParameterJdbcTemplate jdbc;
  private final LiveEvents live;

  public CityService(SettingsService.CityRepository cities, CategoryRepository categories, NamedParameterJdbcTemplate jdbc, LiveEvents live) {
    this.cities = cities;
    this.categories = categories;
    this.jdbc = jdbc;
    this.live = live;
  }

  @Transactional(readOnly = true)
  public Optional<City> find(String name) {
    if (name == null || name.isBlank()) return Optional.empty();
    return cities.findAll().stream().filter(c -> c.name.equalsIgnoreCase(name.trim())).findFirst();
  }

  /** Why a customer can't book `category` at an address in `cityName`, or null when they can — bookingBlockedReason in cities.ts. */
  @Transactional(readOnly = true)
  public String bookingBlockedReason(String cityName, ServiceCategory category) {
    City city = find(cityName).orElse(null);
    if (city == null) return "We don’t serve " + (cityName == null || cityName.isBlank() ? "this location" : cityName) + " yet";
    if ("coming_soon".equals(city.status)) return "We’re launching in " + city.name + " soon — bookings aren’t open yet";
    if ("paused".equals(city.status)) return "Bookings in " + city.name + " are paused for now";
    if (category != null && city.disabledCategoryIds.contains(category.id)) return category.name + " isn’t available in " + city.name + " yet";
    return null;
  }

  /** Vendors can join live cities and coming-soon ones (recruiting before launch). Returns the canonical city. */
  @Transactional(readOnly = true)
  public City requireVendorCity(String cityName) {
    return find(cityName).filter(c -> !"paused".equals(c.status))
        .orElseThrow(() -> ApiException.bad("We aren’t accepting partners in that city right now"));
  }

  /** Creates a city (`editing` null) or updates the one named `editing`. Same validation as normalizeCity in cities.ts. */
  @Transactional
  public City save(CityInput in, String editing) {
    List<City> all = cities.findAll();
    City existing = editing == null ? null : all.stream().filter(c -> c.name.equals(editing)).findFirst()
        .orElseThrow(() -> ApiException.notFound("City not found"));
    String name = in.name() == null ? "" : in.name().trim().replaceAll("\\s+", " ");
    if (name.length() < 2) throw ApiException.bad("Enter the city name");
    if (existing == null && all.stream().anyMatch(c -> c.name.equalsIgnoreCase(name))) throw ApiException.bad(name + " already exists");
    if (existing != null && !existing.name.equals(name)) throw ApiException.bad("A city can’t be renamed — bookings and addresses refer to it by name");
    if (in.lat() == null || in.lng() == null || in.lat() < -90 || in.lat() > 90 || in.lng() < -180 || in.lng() > 180) {
      throw ApiException.bad("Enter a valid latitude and longitude for the city centre");
    }
    if (in.radiusKm() == null || in.radiusKm() < 1 || in.radiusKm() > 200) throw ApiException.bad("Service radius must be between 1 and 200 km");
    int priceLevel = in.priceLevel() == null ? CityPricing.BASE_PRICE_LEVEL : in.priceLevel();
    if (priceLevel < CityPricing.PRICE_LEVEL_MIN || priceLevel > CityPricing.PRICE_LEVEL_MAX) {
      throw ApiException.bad("Price level must be a whole percentage between " + CityPricing.PRICE_LEVEL_MIN + " and " + CityPricing.PRICE_LEVEL_MAX);
    }
    BigDecimal commission = in.commissionRate();
    if (commission != null && (commission.signum() < 0 || commission.compareTo(new BigDecimal("0.6")) > 0)) throw ApiException.bad("City commission must be between 0 and 60%");
    String status = in.status() == null ? "live" : in.status();
    if (!STATUSES.contains(status)) throw ApiException.bad("Unknown city status");
    Set<String> off = new LinkedHashSet<>(in.disabledCategoryIds() == null ? List.of() : in.disabledCategoryIds());
    if (!off.isEmpty() && categories.findAllById(off).size() != off.size()) throw ApiException.bad("Unknown service category");

    City c = existing != null ? existing : new City();
    if (existing == null) {
      c.name = name;
      c.position = all.stream().mapToInt(x -> x.position + 1).max().orElse(0);
    }
    c.state = in.state() == null ? "" : in.state().trim();
    c.status = status;
    c.lat = Math.round(in.lat() * 1e6) / 1e6;
    c.lng = Math.round(in.lng() * 1e6) / 1e6;
    c.radiusKm = in.radiusKm();
    c.priceLevel = priceLevel;
    c.commissionRate = commission;
    Set<String> areas = new LinkedHashSet<>();
    for (String a : in.areas() == null ? List.<String>of() : in.areas()) {
      String t = a == null ? "" : a.trim().replaceAll("\\s+", " ");
      if (!t.isEmpty()) areas.add(t);
    }
    c.areas.clear();
    c.areas.addAll(new ArrayList<>(areas));
    c.disabledCategoryIds.clear();
    c.disabledCategoryIds.addAll(off);
    City saved = cities.save(c);
    live.notify("public", "all", null);
    return saved;
  }

  /** Deletes a city nobody uses yet; anything with customers, vendors or bookings must be paused instead. */
  @Transactional
  public void delete(String name) {
    City c = cities.findById(name).orElseThrow(() -> ApiException.notFound("City not found"));
    Boolean used = jdbc.queryForObject("""
        select exists (select 1 from customers where city = :name)
            or exists (select 1 from customer_addresses where city = :name)
            or exists (select 1 from vendors where city = :name)
            or exists (select 1 from bookings where address_city = :name)
        """, Map.of("name", name), Boolean.class);
    if (Boolean.TRUE.equals(used)) throw ApiException.bad(name + " has customers, vendors or bookings — pause it instead");
    cities.delete(c);
    live.notify("public", "all", null);
  }
}
