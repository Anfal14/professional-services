package com.profecian.payments;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.profecian.common.ApiException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * `Idempotency-Key` support: the first request with a key runs and its response is stored; a retry
 * with the same key and body gets the stored response; the same key with a different body is refused.
 */
@Service
public class IdempotencyService {
  private final Repo repo;
  private final TransactionTemplate tx;
  private final ObjectMapper json;

  public IdempotencyService(Repo repo, TransactionTemplate tx, ObjectMapper json) {
    this.repo = repo;
    this.tx = tx;
    this.json = json;
  }

  public <T> T run(String principal, String key, String requestHash, Class<T> type, Supplier<T> action) {
    if (key == null || key.isBlank()) return action.get();
    Optional<Row> existing = repo.findById(new RowId(principal, key));
    if (existing.isPresent()) return replay(existing.get(), requestHash, type);
    // Atomic claim of the key; a concurrent request with the same key gets the stored (or in-flight) answer.
    Integer claimed = tx.execute(s -> repo.claim(principal, key, requestHash));
    if (claimed == null || claimed == 0) return replay(repo.findById(new RowId(principal, key)).orElseThrow(), requestHash, type);
    try {
      T result = action.get();
      tx.executeWithoutResult(s -> repo.findById(new RowId(principal, key)).ifPresent(r -> {
        r.statusCode = 200;
        r.responseBody = write(result);
      }));
      return result;
    } catch (ApiException e) {
      tx.executeWithoutResult(s -> repo.findById(new RowId(principal, key)).ifPresent(r -> {
        r.statusCode = e.status().value();
        r.responseBody = e.getMessage();
      }));
      throw e;
    }
  }

  private <T> T replay(Row r, String requestHash, Class<T> type) {
    if (!Objects.equals(r.requestHash, requestHash)) throw ApiException.conflict("This request was already sent with different details");
    if (r.statusCode == null) throw ApiException.conflict("This payment is still being processed");
    if (r.statusCode != 200) throw new ApiException(org.springframework.http.HttpStatus.valueOf(r.statusCode), r.responseBody);
    try {
      return json.readValue(r.responseBody, type);
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }

  private String write(Object o) {
    try {
      return json.writeValueAsString(o);
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }

  public static class RowId implements Serializable {
    public String principal;
    public String key;

    public RowId() {}

    public RowId(String principal, String key) {
      this.principal = principal;
      this.key = key;
    }

    @Override
    public boolean equals(Object o) {
      return o instanceof RowId r && Objects.equals(principal, r.principal) && Objects.equals(key, r.key);
    }

    @Override
    public int hashCode() {
      return Objects.hash(principal, key);
    }
  }

  @Entity
  @Table(name = "idempotency_keys")
  @IdClass(RowId.class)
  public static class Row {
    @Id
    public String principal;
    @Id
    public String key;
    @Column(name = "request_hash")
    public String requestHash;
    @Column(name = "status_code")
    public Integer statusCode;
    @Column(name = "response_body")
    public String responseBody;
    @Column(name = "created_at")
    public Instant createdAt = Instant.now();
  }

  public interface Repo extends JpaRepository<Row, RowId> {
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = "insert into idempotency_keys (principal, key, request_hash) values (:principal, :key, :hash) on conflict do nothing", nativeQuery = true)
    int claim(@org.springframework.data.repository.query.Param("principal") String principal, @org.springframework.data.repository.query.Param("key") String key,
              @org.springframework.data.repository.query.Param("hash") String hash);
  }
}
