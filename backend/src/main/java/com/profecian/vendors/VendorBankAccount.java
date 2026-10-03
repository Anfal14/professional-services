package com.profecian.vendors;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.Instant;

/** Payout account. Only the last 4 digits are ever returned; the full number is encrypted at rest. */
@Entity
@Table(name = "vendor_bank_accounts")
public class VendorBankAccount {
  @Id
  @Column(name = "vendor_id")
  public String vendorId;

  @OneToOne
  @MapsId
  @JoinColumn(name = "vendor_id")
  public Vendor vendor;

  @Column(name = "holder_name")
  public String holderName;

  @Column(name = "account_last4")
  public String accountLast4;

  @Column(name = "account_number_enc")
  public String accountNumberEncrypted;

  public String ifsc;

  @Column(name = "bank_name")
  public String bankName;

  @Column(name = "updated_at")
  public Instant updatedAt = Instant.now();
}
