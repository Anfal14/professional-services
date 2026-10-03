package com.profecian.notifications;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

/**
 * Transactional outbox row: written in the same transaction as the business change, delivered
 * later by {@link OutboxWorker} with retries and exponential backoff, dead-lettered after N attempts.
 */
@Entity
@Table(name = "outbox")
public class OutboxMessage {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;

  @Column(name = "notification_id")
  public String notificationId;

  /** push | whatsapp | sms */
  public String channel;

  /** Phone number, or "<audience>:<id>" for push. */
  public String destination;

  /** JSON: { title, body, url? } */
  public String payload;

  /** pending | sent | dead */
  public String status = "pending";

  public int attempts;

  @Column(name = "next_attempt_at")
  public Instant nextAttemptAt = Instant.now();

  @Column(name = "last_error")
  public String lastError;

  @Column(name = "created_at")
  public Instant createdAt = Instant.now();

  @Column(name = "sent_at")
  public Instant sentAt;

  public interface Repository extends JpaRepository<OutboxMessage, Long> {
    /** Claims due rows; SKIP LOCKED lets several servers run the worker without double-sending. */
    @Query(value = "select * from outbox where status = 'pending' and next_attempt_at <= now() order by id limit :limit for update skip locked", nativeQuery = true)
    List<OutboxMessage> claimDue(int limit);

    long countByStatus(String status);
  }
}
