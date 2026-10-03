package com.profecian.catalog;

import com.profecian.bookings.BookingRepository;
import com.profecian.catalog.CatalogRepositories.CategoryRepository;
import com.profecian.catalog.CatalogRepositories.ProblemTypeRepository;
import com.profecian.common.ApiException;
import com.profecian.common.Ids;
import com.profecian.live.LiveEvents;
import com.profecian.sync.Api;
import com.profecian.sync.ApiMapper;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** admin.saveCategory / saveProblemType / deleteProblemType from mock.ts. */
@Service
public class CatalogService {
  private final CategoryRepository categories;
  private final ProblemTypeRepository problemTypes;
  private final BookingRepository bookings;
  private final ApiMapper mapper;
  private final LiveEvents live;

  public CatalogService(CategoryRepository categories, ProblemTypeRepository problemTypes, BookingRepository bookings, ApiMapper mapper, LiveEvents live) {
    this.categories = categories;
    this.problemTypes = problemTypes;
    this.bookings = bookings;
    this.mapper = mapper;
    this.live = live;
  }

  public record CategoryInput(String id, String name, String tagline, String description, String icon, String image, String tint, boolean enabled,
                              boolean popular, BigDecimal commissionRate, Integer inspectionFee, List<String> includes) {}

  @Transactional
  public Api.ServiceCategory saveCategory(CategoryInput in) {
    if (in.name() == null || in.name().isBlank()) throw ApiException.bad("Category name is required");
    if (in.commissionRate() == null || in.commissionRate().signum() < 0 || in.commissionRate().compareTo(new BigDecimal("0.6")) > 0) {
      throw ApiException.bad("Commission must be between 0 and 60%");
    }
    if (in.inspectionFee() != null && (in.inspectionFee() < 0 || in.inspectionFee() > 10_000)) {
      throw ApiException.bad("Inspection fee must be a whole amount between ₹0 and ₹10,000");
    }
    ServiceCategory c = in.id() == null ? null : categories.findById(in.id()).orElse(null);
    if (c == null) {
      c = new ServiceCategory();
      c.id = Ids.newId("cat");
      c.sortOrder = (int) categories.count();
    }
    c.name = in.name().trim();
    c.tagline = in.tagline() == null ? "" : in.tagline();
    c.description = in.description() == null ? "" : in.description();
    c.icon = in.icon();
    c.image = in.image() == null ? "" : in.image();
    c.tint = in.tint();
    c.enabled = in.enabled();
    c.popular = in.popular();
    c.commissionRate = in.commissionRate();
    c.inspectionFee = in.inspectionFee();
    c.includes.clear();
    c.includes.addAll(in.includes() == null ? List.of() : in.includes());
    categories.save(c);
    live.notify("public", "all", null);
    return mapper.category(c);
  }

  public record ProblemTypeInput(String id, String categoryId, String name, String description, String icon, BigDecimal price, String pricingModel,
                                 int durationMins, boolean enabled) {}

  @Transactional
  public Api.ProblemType saveProblemType(ProblemTypeInput in) {
    if (in.name() == null || in.name().isBlank()) throw ApiException.bad("Problem type name is required");
    if (in.price() == null || in.price().signum() < 0) throw ApiException.bad("Enter a valid price");
    if (!List.of("fixed", "starting_at", "inspection").contains(in.pricingModel())) throw ApiException.bad("Unknown pricing model");
    if (!categories.existsById(in.categoryId())) throw ApiException.bad("Unknown category");
    ProblemType p = in.id() == null ? null : problemTypes.findById(in.id()).orElse(null);
    if (p == null) {
      p = new ProblemType();
      p.id = Ids.newId("prb");
    }
    p.categoryId = in.categoryId();
    p.name = in.name().trim();
    p.description = in.description() == null ? "" : in.description();
    p.icon = in.icon();
    p.price = in.price();
    p.pricingModel = in.pricingModel();
    p.durationMins = in.durationMins();
    p.enabled = in.enabled();
    problemTypes.save(p);
    live.notify("public", "all", null);
    return mapper.problemType(p);
  }

  @Transactional
  public void deleteProblemType(String id) {
    if (bookings.existsByProblemTypeId(id) || bookings.existsByItemProblemTypeId(id)) throw ApiException.conflict("This problem type has bookings — disable it instead");
    problemTypes.deleteById(id);
    live.notify("public", "all", null);
  }
}
