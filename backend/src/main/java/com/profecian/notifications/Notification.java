package com.profecian.notifications;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** In-app notification (AppNotification in types.ts). External delivery goes through the outbox. */
@Entity
@Table(name = "notifications")
public class Notification {
  @Id
  public String id;

  /** customer | vendor | admin */
  public String audience;

  /** Customer/vendor id, or "admin" for the admin team inbox. */
  @Column(name = "recipient_id")
  public String recipientId;

  public String kind;
  public String title;
  public String body;

  /** Comma-separated: whatsapp, push, sms, in_app */
  public String channels;

  @Column(name = "booking_id")
  public String bookingId;

  @Column(name = "whatsapp_url")
  public String whatsappUrl;

  public boolean read;

  @Column(name = "created_at")
  public Instant createdAt = Instant.now();

  public List<String> channelList() {
    return List.of(channels.split(","));
  }

  public interface Repository extends JpaRepository<Notification, String> {
    List<Notification> findByAudienceAndRecipientIdOrderByCreatedAtDesc(String audience, String recipientId);

    List<Notification> findByAudienceOrderByCreatedAtDesc(String audience);

    @Modifying
    @Query("update Notification n set n.read = true where n.audience = :audience and n.recipientId = :recipientId and (:all = true or n.id in :ids)")
    int markRead(@Param("audience") String audience, @Param("recipientId") String recipientId, @Param("all") boolean all, @Param("ids") List<String> ids);
  }
}
