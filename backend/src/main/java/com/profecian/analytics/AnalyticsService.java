package com.profecian.analytics;

import com.profecian.common.Schedules;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

/** Dashboard and report figures in SQL — the selectors in packages/shared/src/analytics.ts. A booking counts as revenue when completed and paid. */
@Service
public class AnalyticsService {
  private static final String PAID = "b.status = 'completed' and b.payment_status = 'paid'";

  private final NamedParameterJdbcTemplate jdbc;
  private final Clock clock;

  public AnalyticsService(NamedParameterJdbcTemplate jdbc, Clock clock) {
    this.jdbc = jdbc;
    this.clock = clock;
  }

  public record Kpis(int totalUsers, int totalVendors, int approvedVendors, int pendingVendors, int activeBookings, int completedBookings,
                     int pendingAssignments, BigDecimal revenue, BigDecimal commission, BigDecimal vendorPayouts, int openComplaints, BigDecimal averageRating) {}

  public Kpis kpis() {
    return jdbc.queryForObject("""
        select
          (select count(*) from customers) as total_users,
          (select count(*) from vendors) as total_vendors,
          (select count(*) from vendors where status = 'approved') as approved_vendors,
          (select count(*) from vendors where status = 'pending') as pending_vendors,
          (select count(*) from bookings where status not in ('completed','cancelled','pending_assignment')) as active_bookings,
          (select count(*) from bookings where status = 'completed') as completed_bookings,
          (select count(*) from bookings where status = 'pending_assignment') as pending_assignments,
          (select coalesce(sum(total), 0) from bookings b where %1$s) as revenue,
          (select coalesce(sum(commission), 0) from bookings b where %1$s) as commission,
          (select coalesce(sum(vendor_payout), 0) from bookings b where %1$s) as vendor_payouts,
          (select count(*) from complaints where status <> 'resolved') as open_complaints,
          (select coalesce(round(avg(rating)::numeric, 1), 0) from reviews where status = 'published') as average_rating
        """.formatted(PAID), Map.of(), (rs, i) -> new Kpis(
        rs.getInt("total_users"), rs.getInt("total_vendors"), rs.getInt("approved_vendors"), rs.getInt("pending_vendors"),
        rs.getInt("active_bookings"), rs.getInt("completed_bookings"), rs.getInt("pending_assignments"),
        rs.getBigDecimal("revenue"), rs.getBigDecimal("commission"), rs.getBigDecimal("vendor_payouts"),
        rs.getInt("open_complaints"), rs.getBigDecimal("average_rating")));
  }

  public record DailyPoint(LocalDate date, BigDecimal revenue, BigDecimal commission, int bookings, int completed, int cancelled) {}

  /** One point per day for the last `days` days (business time zone), keyed by booking creation date. */
  public List<DailyPoint> daily(int days) {
    LocalDate today = Schedules.today(clock);
    return jdbc.query("""
        select d::date as day,
               coalesce(sum(case when %s then b.total end), 0) as revenue,
               coalesce(sum(case when %s then b.commission end), 0) as commission,
               count(b.id) as bookings,
               count(*) filter (where b.status = 'completed') as completed,
               count(*) filter (where b.status = 'cancelled') as cancelled
        from generate_series(cast(:from as date), cast(:to as date), interval '1 day') d
        left join bookings b on (b.created_at at time zone 'Asia/Kolkata')::date = d::date
        group by d order by d
        """.formatted(PAID, PAID), Map.of("from", today.minusDays(days - 1L), "to", today), (rs, i) -> new DailyPoint(
        rs.getDate("day").toLocalDate(), rs.getBigDecimal("revenue"), rs.getBigDecimal("commission"),
        rs.getInt("bookings"), rs.getInt("completed"), rs.getInt("cancelled")));
  }

  public record RankedRow(String id, String label, int bookings, BigDecimal revenue, BigDecimal secondary) {}

  public List<RankedRow> topServices() {
    return jdbc.query("""
        select c.id, c.name, count(b.id) as bookings, coalesce(sum(case when %s then b.total end), 0) as revenue
        from service_categories c left join bookings b on b.category_id = c.id and b.status <> 'cancelled'
        group by c.id, c.name order by revenue desc
        """.formatted(PAID), Map.of(), (rs, i) -> new RankedRow(rs.getString("id"), rs.getString("name"), rs.getInt("bookings"), rs.getBigDecimal("revenue"), null));
  }

  public List<RankedRow> topVendors() {
    return jdbc.query("""
        select v.id, v.name, v.rating, count(b.id) as bookings,
               coalesce(sum(case when b.payment_status = 'paid' then b.service_amount end), 0) as revenue
        from vendors v left join bookings b on b.vendor_id = v.id and b.status = 'completed'
        where v.status in ('approved', 'suspended')
        group by v.id, v.name, v.rating order by revenue desc
        """, Map.of(), (rs, i) -> new RankedRow(rs.getString("id"), rs.getString("name"), rs.getInt("bookings"), rs.getBigDecimal("revenue"), rs.getBigDecimal("rating")));
  }

  public List<RankedRow> cities() {
    return jdbc.query("""
        select b.address_city as city, count(*) as bookings,
               coalesce(sum(case when %s then b.total end), 0) as revenue,
               (select count(*) from vendors v where v.city = b.address_city and v.status = 'approved') as vendors
        from bookings b where b.status <> 'cancelled'
        group by b.address_city order by revenue desc
        """.formatted(PAID), Map.of(), (rs, i) -> new RankedRow(rs.getString("city"), rs.getString("city"), rs.getInt("bookings"), rs.getBigDecimal("revenue"),
        BigDecimal.valueOf(rs.getInt("vendors"))));
  }

  public record MixRow(String method, int count, BigDecimal amount) {}

  public List<MixRow> paymentMix() {
    return jdbc.query("""
        select coalesce(b.payment_method, 'upi') as method, count(*) as n, sum(b.total) as amount
        from bookings b where %s group by 1 order by amount desc
        """.formatted(PAID), Map.of(), (rs, i) -> new MixRow(rs.getString("method"), rs.getInt("n"), rs.getBigDecimal("amount")));
  }
}
