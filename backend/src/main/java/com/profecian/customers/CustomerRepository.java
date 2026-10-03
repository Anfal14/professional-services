package com.profecian.customers;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerRepository extends JpaRepository<Customer, String> {
  Optional<Customer> findByPhone(String phone);

  boolean existsByPhone(String phone);
}
