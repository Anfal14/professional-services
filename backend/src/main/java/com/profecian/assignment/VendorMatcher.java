package com.profecian.assignment;

import com.profecian.bookings.Booking;
import com.profecian.settings.SettingsService;
import com.profecian.sync.Api;
import com.profecian.sync.ApiMapper;
import com.profecian.vendors.VendorRepository;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * suggestVendors from mock.ts, computed in PostGIS. Lower score is better:
 * distance (km) + 4 × same-day workload − 2 × rating, +1000 if the vendor doesn't offer the
 * category, +500 if they are unavailable. Only approved vendors are considered.
 */
@Service
public class VendorMatcher {
  private static final String SQL = """
      with target as (
        select coalesce(b.address_location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography) as point, b.date, b.category_id
        from bookings b where b.id = :bookingId
      ),
      ranked as (
        select v.id,
               ST_Distance(v.location, t.point) / 1000.0 as km,
               (select count(*) from bookings x
                 where x.vendor_id = v.id and x.date = t.date and x.status not in ('completed', 'cancelled')) as workload,
               exists (select 1 from vendor_categories vc where vc.vendor_id = v.id and vc.category_id = t.category_id) as matches,
               v.available,
               v.rating
        from vendors v cross join target t
        where v.status = 'approved'
      )
      select id, km, workload, matches, available,
             km + workload * 4 - rating * 2 + case when matches then 0 else 1000 end + case when available then 0 else 500 end as score
      from ranked
      order by score
      """;

  private final NamedParameterJdbcTemplate jdbc;
  private final VendorRepository vendors;
  private final SettingsService settings;
  private final ApiMapper mapper;

  public VendorMatcher(NamedParameterJdbcTemplate jdbc, VendorRepository vendors, SettingsService settings, ApiMapper mapper) {
    this.jdbc = jdbc;
    this.vendors = vendors;
    this.settings = settings;
    this.mapper = mapper;
  }

  public record Match(String vendorId, double distanceKm, int workload, boolean matchesService, boolean available, double score) {}

  public List<Match> rank(Booking b) {
    // Bookings without coordinates fall back to a point near their city (jitterNear(city, booking.id)).
    double[] fallback = settings.jitterNear(b.addressCity, b.id);
    return jdbc.query(SQL, Map.of("bookingId", b.id, "lat", fallback[0], "lng", fallback[1]), (rs, i) -> new Match(
        rs.getString("id"),
        Math.round(rs.getDouble("km") * 10) / 10.0,
        rs.getInt("workload"),
        rs.getBoolean("matches"),
        rs.getBoolean("available"),
        rs.getDouble("score")));
  }

  @Transactional(readOnly = true)
  public List<Api.VendorSuggestion> suggest(Booking b) {
    return rank(b).stream().map(m -> new Api.VendorSuggestion(
        mapper.vendor(vendors.findById(m.vendorId()).orElseThrow(), true), m.distanceKm(), m.workload(), m.matchesService(), m.available(), m.score()))
        .toList();
  }
}
