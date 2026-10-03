package com.profecian.vendors;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VendorRepository extends JpaRepository<Vendor, String> {
  Optional<Vendor> findByPhone(String phone);

  boolean existsByPhone(String phone);

  List<Vendor> findAllByOrderByJoinedAtDesc();
}
