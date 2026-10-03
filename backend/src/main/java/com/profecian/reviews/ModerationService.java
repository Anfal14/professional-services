package com.profecian.reviews;

import com.profecian.common.ApiException;
import com.profecian.complaints.Complaint;
import com.profecian.live.LiveEvents;
import com.profecian.sync.Api;
import com.profecian.sync.ApiMapper;
import com.profecian.vendors.Vendor;
import com.profecian.vendors.VendorRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** admin.setReviewStatus and admin.updateComplaint from mock.ts. */
@Service
public class ModerationService {
  private final Review.Repository reviews;
  private final Complaint.Repository complaints;
  private final VendorRepository vendors;
  private final ApiMapper mapper;
  private final LiveEvents live;
  private final Clock clock;

  public ModerationService(Review.Repository reviews, Complaint.Repository complaints, VendorRepository vendors, ApiMapper mapper, LiveEvents live, Clock clock) {
    this.reviews = reviews;
    this.complaints = complaints;
    this.vendors = vendors;
    this.mapper = mapper;
    this.live = live;
    this.clock = clock;
  }

  /** Changing visibility re-derives the vendor's rating from published reviews only. */
  @Transactional
  public Api.Review setReviewStatus(String id, String status) {
    if (!List.of("published", "hidden", "flagged").contains(status)) throw ApiException.bad("Unknown review status");
    Review r = reviews.findById(id).orElseThrow(() -> ApiException.notFound("Review not found"));
    r.status = status;
    reviews.flush();
    List<Review> published = reviews.findByVendorIdAndStatus(r.vendorId, "published");
    Vendor v = vendors.findById(r.vendorId).orElseThrow();
    v.ratingCount = published.size();
    v.rating = published.isEmpty() ? BigDecimal.ZERO
        : BigDecimal.valueOf(published.stream().mapToInt(x -> x.rating).sum()).divide(BigDecimal.valueOf(published.size()), 1, RoundingMode.HALF_UP);
    live.notify("admin", "admin", null);
    live.notify("vendor", r.vendorId, null);
    live.notify("public", "all", null);
    return mapper.review(r);
  }

  @Transactional
  public Api.Complaint updateComplaint(String id, String status, String resolution) {
    if (!List.of("open", "in_progress", "resolved").contains(status)) throw ApiException.bad("Unknown complaint status");
    Complaint c = complaints.findById(id).orElseThrow(() -> ApiException.notFound("Complaint not found"));
    c.status = status;
    c.resolution = resolution;
    c.updatedAt = clock.instant();
    live.notify("admin", "admin", null);
    live.notify("customer", c.customerId, c.bookingId);
    return mapper.complaint(c);
  }
}
