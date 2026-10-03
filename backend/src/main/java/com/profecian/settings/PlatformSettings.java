package com.profecian.settings;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.Instant;

/** Singleton row (id = 1): GST, default commission and inspection fee, contact numbers. */
@Entity
@Table(name = "platform_settings")
public class PlatformSettings {
  @Id
  public Short id = 1;

  @Column(name = "tax_rate", nullable = false)
  public BigDecimal taxRate;

  @Column(name = "default_commission_rate", nullable = false)
  public BigDecimal defaultCommissionRate;

  @Column(name = "default_inspection_fee", nullable = false)
  public int defaultInspectionFee;

  @Column(name = "whatsapp_number", nullable = false)
  public String whatsappNumber;

  @Column(name = "support_phone", nullable = false)
  public String supportPhone;

  @Column(name = "updated_at", nullable = false)
  public Instant updatedAt = Instant.now();

  @Version
  public Long version;
}
