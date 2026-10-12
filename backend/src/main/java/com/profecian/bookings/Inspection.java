package com.profecian.bookings;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * A booking's quote thread — InspectionRequest in types.ts. Either an "Other / Not sure" request
 * (the booking keeps its category; the professional inspects, then quotes) or a quote for extra
 * work the professional found on a normal booking.
 * Status: pending → quoted → approved | declined, or no_work_needed.
 */
@Entity
@Table(name = "booking_inspections")
public class Inspection {
  @Id
  @Column(name = "booking_id")
  public String bookingId;

  @OneToOne
  @MapsId
  @JoinColumn(name = "booking_id")
  public Booking booking;

  /** not_sure (customer chose "Other / Not sure") | extra_work (professional quoted more work on a normal booking). */
  public String kind = "not_sure";

  public String description;
  public int fee;
  public String status = "pending";

  @Column(name = "no_work_note")
  public String noWorkNote;

  @Column(name = "quote_amount")
  public BigDecimal quoteAmount;
  @Column(name = "quote_note")
  public String quoteNote;
  @Column(name = "quote_vendor_id")
  public String quoteVendorId;
  @Column(name = "quote_created_at")
  public Instant quoteCreatedAt;
  @Column(name = "quote_responded_at")
  public Instant quoteRespondedAt;
  @Column(name = "quote_responded_by")
  public String quoteRespondedBy;

  @ElementCollection(fetch = FetchType.LAZY)
  @CollectionTable(name = "inspection_photos", joinColumns = @JoinColumn(name = "booking_id"))
  @OrderColumn(name = "position")
  @Column(name = "file_ref")
  public List<String> photos = new ArrayList<>();

  @ElementCollection(fetch = FetchType.LAZY)
  @CollectionTable(name = "inspection_quote_lines", joinColumns = @JoinColumn(name = "booking_id"))
  @OrderColumn(name = "position")
  public List<QuoteLine> quoteLines = new ArrayList<>();

  public boolean hasQuote() {
    return quoteAmount != null;
  }

  public void clearQuote() {
    quoteAmount = null;
    quoteNote = null;
    quoteVendorId = null;
    quoteCreatedAt = null;
    quoteRespondedAt = null;
    quoteRespondedBy = null;
    quoteLines.clear();
  }

  @Embeddable
  public static class QuoteLine {
    public String description;
    public BigDecimal amount;

    public QuoteLine() {}

    public QuoteLine(String description, BigDecimal amount) {
      this.description = description;
      this.amount = amount;
    }
  }

  public boolean isExtraWork() {
    return "extra_work".equals(kind);
  }
}
