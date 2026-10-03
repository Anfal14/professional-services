package com.profecian.settings;

import com.profecian.common.ApiException;
import com.profecian.live.LiveEvents;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SettingsService {
  public interface SettingsRepository extends JpaRepository<PlatformSettings, Short> {}

  public interface CityRepository extends JpaRepository<City, String> {}

  private final SettingsRepository settings;
  private final CityRepository cities;
  private final LiveEvents live;

  public SettingsService(SettingsRepository settings, CityRepository cities, LiveEvents live) {
    this.settings = settings;
    this.cities = cities;
    this.live = live;
  }

  @Transactional(readOnly = true)
  public PlatformSettings get() {
    return settings.findById((short) 1).orElseThrow(() -> new IllegalStateException("platform_settings row missing"));
  }

  @Transactional(readOnly = true)
  public List<City> cities() {
    return cities.findAll(Sort.by("position"));
  }

  /** Approximate coordinates near a city centre, deterministic per seed — jitterNear in geo.ts. */
  @Transactional(readOnly = true)
  public double[] jitterNear(String city, String seed) {
    City c = cities.findById(city).filter(x -> x.lat != null).orElseGet(() -> cities.findById("Solapur").orElse(null));
    double lat = c != null && c.lat != null ? c.lat : 17.6599;
    double lng = c != null && c.lng != null ? c.lng : 75.9064;
    int h = 0;
    for (int i = 0; i < seed.length(); i++) h = h * 31 + seed.charAt(i);
    double dx = ((h & 0xff) / 255.0 - 0.5) * 0.12;
    double dy = (((h >> 8) & 0xff) / 255.0 - 0.5) * 0.12;
    return new double[] {lat + dy, lng + dx};
  }

  public record Patch(BigDecimal taxRate, BigDecimal defaultCommissionRate, Integer defaultInspectionFee, List<String> cities, String whatsappNumber, String supportPhone) {}

  @Transactional
  public PlatformSettings update(Patch patch) {
    PlatformSettings s = get();
    if (patch.taxRate() != null) {
      if (patch.taxRate().compareTo(BigDecimal.ZERO) < 0 || patch.taxRate().compareTo(new BigDecimal("0.28")) > 0) throw ApiException.bad("GST must be 0–28% and commission 0–60%");
      s.taxRate = patch.taxRate();
    }
    if (patch.defaultCommissionRate() != null) {
      if (patch.defaultCommissionRate().compareTo(BigDecimal.ZERO) < 0 || patch.defaultCommissionRate().compareTo(new BigDecimal("0.6")) > 0) throw ApiException.bad("GST must be 0–28% and commission 0–60%");
      s.defaultCommissionRate = patch.defaultCommissionRate();
    }
    if (patch.defaultInspectionFee() != null) {
      if (patch.defaultInspectionFee() < 0 || patch.defaultInspectionFee() > 10_000) throw ApiException.bad("Inspection fee must be a whole amount between ₹0 and ₹10,000");
      s.defaultInspectionFee = patch.defaultInspectionFee();
    }
    if (patch.whatsappNumber() != null) s.whatsappNumber = patch.whatsappNumber();
    if (patch.supportPhone() != null) s.supportPhone = patch.supportPhone();
    if (patch.cities() != null) {
      List<City> existing = cities.findAll();
      int i = 0;
      for (String name : patch.cities()) {
        City c = existing.stream().filter(x -> x.name.equals(name)).findFirst().orElseGet(City::new);
        c.name = name;
        c.position = i++;
        cities.save(c);
      }
      existing.stream().filter(c -> !patch.cities().contains(c.name)).forEach(cities::delete);
    }
    s.updatedAt = Instant.now();
    live.notify("public", "all", null);
    return s;
  }
}
