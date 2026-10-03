package com.profecian.admin;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

@Entity
@Table(name = "admin_users")
public class AdminUser {
  @Id
  public String id;

  public String name;
  public String email;

  /** super_admin | operations | finance | support */
  public String role;

  @Column(name = "password_hash")
  public String passwordHash;

  public boolean active = true;

  @Column(name = "created_at")
  public Instant createdAt = Instant.now();

  public interface Repository extends JpaRepository<AdminUser, String> {
    Optional<AdminUser> findByEmailIgnoreCase(String email);
  }
}
