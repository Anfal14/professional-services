package com.profecian.bookings;

import com.profecian.catalog.CatalogRepositories.CategoryRepository;
import com.profecian.catalog.CatalogRepositories.ProblemTypeRepository;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

/** Service and problem names for messages — bookingProblemNames / bookingProblemLabel in pricing.ts. */
@Component
public class BookingLabels {
  public static final String INSPECTION_LABEL = "Not sure — needs inspection";

  private final CategoryRepository categories;
  private final ProblemTypeRepository problemTypes;

  public BookingLabels(CategoryRepository categories, ProblemTypeRepository problemTypes) {
    this.categories = categories;
    this.problemTypes = problemTypes;
  }

  public String service(Booking b) {
    return categories.findById(b.categoryId).map(c -> c.name).orElse("Service");
  }

  public List<String> problemNames(Booking b) {
    List<String> names = new ArrayList<>(b.items.stream().map(i -> i.name).toList());
    if (names.isEmpty() && b.problemTypeId != null) problemTypes.findById(b.problemTypeId).ifPresent(p -> names.add(p.name));
    if (b.inspection != null) names.add(INSPECTION_LABEL);
    return names;
  }

  /** "Fan repair", "Fan repair + Switch repair" or "Fan repair + 2 more". */
  public String problem(Booking b) {
    List<String> n = problemNames(b);
    if (n.size() <= 2) return String.join(" + ", n);
    return n.get(0) + " + " + (n.size() - 1) + " more";
  }
}
