package com.profecian.settings;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** A served city with its centre, used to place addresses without coordinates (jitterNear in geo.ts). */
@Entity
@Table(name = "platform_cities")
public class City {
  @Id
  public String name;

  public int position;
  public Double lat;
  public Double lng;
}
