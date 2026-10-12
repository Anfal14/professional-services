package com.profecian.bookings;

import java.util.HashMap;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * A professional's completion rate, counted from booking history — reliabilityOf in release.ts.
 * Nothing is stored: "accepted" is the jobs they hold or finished after accepting plus the ones
 * they released, and "late" is their releases with 2 hours or less to the slot or once on the way.
 */
@Service
public class ReliabilityService {
  public record Stats(int accepted, int lateReleases) {
    public static final Stats NONE = new Stats(0, 0);

    /** Whole percentage, or null while "New". */
    public Integer rate() {
      return ReleaseRules.completionRate(accepted, lateReleases);
    }
  }

  // A cancelled booking still counts as accepted if its professional accepted it after being assigned.
  private static final String SQL = """
      select vendor_id, sum(accepted) as accepted, sum(late) as late from (
        select b.vendor_id, 1 as accepted, 0 as late
        from bookings b
        where b.vendor_id is not null and (
          b.status in ('accepted', 'on_the_way', 'arrived', 'in_progress', 'completed')
          or (b.status = 'cancelled' and exists (
            select 1 from booking_events e
            where e.booking_id = b.id and e.kind = 'accepted'
              and e.position > coalesce((select max(a.position) from booking_events a
                                         where a.booking_id = b.id and a.kind in ('assigned', 'reassigned')), -1))))
        union all
        select r.vendor_id, 1, case when r.late then 1 else 0 end from booking_releases r
      ) t
      %s
      group by vendor_id
      """;

  private final JdbcTemplate jdbc;

  public ReliabilityService(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  /** Every professional with any history; absent means nothing accepted yet. */
  @Transactional(readOnly = true)
  public Map<String, Stats> all() {
    Map<String, Stats> out = new HashMap<>();
    jdbc.query(SQL.formatted(""), rs -> {
      out.put(rs.getString("vendor_id"), new Stats(rs.getInt("accepted"), rs.getInt("late")));
    });
    return out;
  }

  @Transactional(readOnly = true)
  public Stats of(String vendorId) {
    return jdbc.query(SQL.formatted("where vendor_id = ?"), rs -> rs.next() ? new Stats(rs.getInt("accepted"), rs.getInt("late")) : Stats.NONE, vendorId);
  }
}
