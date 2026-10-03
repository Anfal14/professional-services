package com.profecian.catalog;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public final class CatalogRepositories {
  private CatalogRepositories() {}

  public interface CategoryRepository extends JpaRepository<ServiceCategory, String> {
    List<ServiceCategory> findAllByOrderBySortOrderAsc();
  }

  public interface ProblemTypeRepository extends JpaRepository<ProblemType, String> {
    List<ProblemType> findAllByOrderByCategoryIdAscIdAsc();
  }
}
