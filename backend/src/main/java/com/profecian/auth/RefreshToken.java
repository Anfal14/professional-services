package com.profecian.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Opaque refresh token, stored hashed and rotated on every use. */
@Entity
@Table(name = "refresh_tokens")
public class RefreshToken {
  @Id
  public String id;

  public String role;

  @Column(name = "subject_id")
  public String subjectId;

  @Column(name = "token_hash")
  public String tokenHash;

  @Column(name = "expires_at")
  public Instant expiresAt;

  @Column(name = "revoked_at")
  public Instant revokedAt;

  @Column(name = "created_at")
  public Instant createdAt = Instant.now();

  public interface Repository extends JpaRepository<RefreshToken, String> {
    Optional<RefreshToken> findByTokenHash(String tokenHash);

    @Modifying
    @Query("update RefreshToken t set t.revokedAt = :now where t.role = :role and t.subjectId = :subjectId and t.revokedAt is null")
    int revokeAll(@Param("role") String role, @Param("subjectId") String subjectId, @Param("now") Instant now);
  }
}
