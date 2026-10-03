package com.profecian.bookings;

import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookingRepository extends JpaRepository<Booking, String> {
  List<Booking> findByCustomerIdOrderByCreatedAtDesc(String customerId);

  List<Booking> findByVendorIdOrderByCreatedAtDesc(String vendorId);

  List<Booking> findAllByOrderByCreatedAtDesc();

  List<Booking> findByVendorIdAndStatus(String vendorId, String status);

  List<Booking> findByDateAndStatusIn(LocalDate date, Collection<String> statuses);

  boolean existsByProblemTypeId(String problemTypeId);

  @Query("select count(b) > 0 from Booking b join b.items i where i.problemTypeId = :problemTypeId")
  boolean existsByItemProblemTypeId(@Param("problemTypeId") String problemTypeId);

  /** Row lock for money movements (payments) where a concurrent update must wait rather than fail. */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select b from Booking b where b.id = :id")
  Optional<Booking> lockById(@Param("id") String id);

  @Query("""
      select b from Booking b
      where (:status is null or b.status = :status)
        and (:q is null or lower(b.code) like :q or lower(b.customerName) like :q or b.customerPhone like :q or lower(b.addressCity) like :q)
      order by b.createdAt desc""")
  Page<Booking> search(@Param("status") String status, @Param("q") String q, Pageable pageable);
}
