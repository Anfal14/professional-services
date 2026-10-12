package com.profecian;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/**
 * City-based pricing: a booking's prices, inspection fee and commission follow the city of the
 * visit address. Seed prices used here: el-fan ₹249, el-switch ₹149 (electrician).
 */
class CityPricingIT extends IntegrationTestBase {

  /** Creates a live city with its own price level and (optionally) commission rate. */
  private void newCity(String admin, String name, int priceLevel, String commissionRate) {
    assertThat(post("/api/v1/admin/cities", admin, city(name, priceLevel, commissionRate)).getStatusCode()).isEqualTo(HttpStatus.OK);
  }

  private Map<String, Object> city(String name, int priceLevel, String commissionRate) {
    Map<String, Object> c = new HashMap<>();
    c.put("name", name);
    c.put("state", "Testland");
    c.put("status", "live");
    c.put("lat", 15.0);
    c.put("lng", 75.0);
    c.put("radiusKm", 20);
    c.put("areas", List.of());
    c.put("disabledCategoryIds", List.of());
    c.put("priceLevel", priceLevel);
    c.put("commissionRate", commissionRate == null ? null : new BigDecimal(commissionRate));
    return c;
  }

  private ResponseEntity<JsonNode> book(String token, String city, Map<String, Object> group) {
    return post("/api/v1/customer/checkout", token, Map.of(
        "groups", List.of(group),
        "date", LocalDate.now().plusDays(5).toString(),
        "slot", "12:00 PM",
        "address", Map.of("label", "Other", "line", "7, Price Street", "city", city),
        "contactName", "Priya Sharma",
        "contactPhone", "9876500001"));
  }

  private static Map<String, Object> electrician(String... problemIds) {
    return Map.of("categoryId", "electrician", "problemTypeIds", List.of(problemIds));
  }

  private JsonNode publicSync(String path) {
    return sync(null).at(path);
  }

  private JsonNode named(JsonNode list, String field, String value) {
    for (JsonNode n : list) if (n.get(field).asText().equals(value)) return n;
    return null;
  }

  @Test
  void seedCarriesPriceLevelsCommissionAndExactPrices() {
    JsonNode cities = publicSync("/settings/cities");
    JsonNode mumbai = named(cities, "name", "Mumbai");
    assertThat(mumbai.get("priceLevel").asInt()).isEqualTo(125);
    assertThat(mumbai.get("commissionRate").decimalValue()).isEqualByComparingTo("0.22");
    JsonNode solapur = named(cities, "name", "Solapur");
    assertThat(solapur.get("priceLevel").asInt()).isEqualTo(100);
    assertThat(solapur.has("commissionRate")).isFalse();
    JsonNode fan = named(publicSync("/problemTypes"), "id", "el-fan");
    assertThat(fan.at("/cityPrices/Mumbai").decimalValue()).isEqualByComparingTo("349");
  }

  @Test
  void bookingUsesTheAddressCitysPricesAndCommission() {
    String admin = adminToken();
    String customer = customerToken(CUSTOMER_PHONE);
    newCity(admin, "Pricetown", 125, "0.25");

    JsonNode b = book(customer, "Pricetown", electrician("el-fan", "el-switch")).getBody().get(0);
    assertThat(b.at("/items/0/price").decimalValue()).isEqualByComparingTo("309"); // 249 × 1.25 = 311.25
    assertThat(b.at("/items/1/price").decimalValue()).isEqualByComparingTo("189"); // 149 × 1.25 = 186.25
    assertThat(b.at("/price/serviceAmount").decimalValue()).isEqualByComparingTo("498");
    assertThat(b.at("/price/tax").decimalValue()).isEqualByComparingTo("90"); // 89.64
    assertThat(b.at("/price/total").decimalValue()).isEqualByComparingTo("588");
    assertThat(b.at("/price/commissionRate").decimalValue()).isEqualByComparingTo("0.25");
    assertThat(b.at("/price/commission").decimalValue()).isEqualByComparingTo("125"); // 124.5
    assertThat(b.at("/price/vendorPayout").decimalValue()).isEqualByComparingTo("373");

    // The same cart at an address in a base-price city, with the category's own commission.
    JsonNode base = book(customer, "Solapur", electrician("el-fan", "el-switch")).getBody().get(0);
    assertThat(base.at("/price/serviceAmount").decimalValue()).isEqualByComparingTo("398");
    BigDecimal categoryRate = named(publicSync("/categories"), "id", "electrician").get("commissionRate").decimalValue();
    assertThat(base.at("/price/commissionRate").decimalValue()).isEqualByComparingTo(categoryRate);

    // The seeded exact price (₹349) beats Mumbai's level (which would give ₹309); Mumbai's 22% commission applies.
    JsonNode mumbai = book(customer, "Mumbai", electrician("el-fan", "el-switch")).getBody().get(0);
    assertThat(mumbai.at("/items/0/price").decimalValue()).isEqualByComparingTo("349");
    assertThat(mumbai.at("/items/1/price").decimalValue()).isEqualByComparingTo("189");
    assertThat(mumbai.at("/price/commissionRate").decimalValue()).isEqualByComparingTo("0.22");
  }

  @Test
  void adminSetsAndClearsAnExactCityPrice() {
    String admin = adminToken();
    String customer = customerToken(CUSTOMER_PHONE);
    newCity(admin, "Exactville", 120, null);
    String path = "/api/v1/admin/problem-types/el-switch/city-prices/Exactville";

    Map<String, Object> exact = new HashMap<>();
    exact.put("price", new BigDecimal("175.50"));
    ResponseEntity<JsonNode> set = exchange(HttpMethod.PUT, path, admin, exact, null);
    assertThat(set.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(set.getBody().at("/cityPrices/Exactville").decimalValue()).isEqualByComparingTo("175.5");
    // Used exactly as typed — no rounding to 9.
    assertThat(book(customer, "Exactville", electrician("el-switch")).getBody().get(0).at("/items/0/price").decimalValue()).isEqualByComparingTo("175.5");

    Map<String, Object> cleared = new HashMap<>();
    cleared.put("price", null);
    assertThat(exchange(HttpMethod.PUT, path, admin, cleared, null).getBody().at("/cityPrices").has("Exactville")).isFalse();
    assertThat(book(customer, "Exactville", electrician("el-switch")).getBody().get(0).at("/items/0/price").decimalValue()).isEqualByComparingTo("179"); // 149 × 1.2 = 178.8

    Map<String, Object> negative = new HashMap<>();
    negative.put("price", new BigDecimal("-1"));
    assertThat(exchange(HttpMethod.PUT, path, admin, negative, null).getBody().get("message").asText()).isEqualTo("Enter a valid price");
    assertThat(exchange(HttpMethod.PUT, "/api/v1/admin/problem-types/el-switch/city-prices/Atlantis", admin, exact, null).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    assertThat(exchange(HttpMethod.PUT, path, customer, exact, null).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
  }

  @Test
  void inspectionFeeFollowsTheCitysPriceLevel() {
    String admin = adminToken();
    String customer = customerToken(CUSTOMER_PHONE);
    newCity(admin, "Feeburg", 125, null);
    Map<String, Object> notSure = Map.of("categoryId", "ac-repair", "problemTypeIds", List.of(), "inspection", Map.of("description", "Water dripping from the indoor unit"));

    int baseFee = book(customer, "Solapur", notSure).getBody().get(0).at("/inspection/fee").asInt();
    JsonNode b = book(customer, "Feeburg", notSure).getBody().get(0);
    int expected = com.profecian.pricing.CityPricing.cityPrice(BigDecimal.valueOf(baseFee), 125).intValueExact();
    assertThat(b.at("/inspection/fee").asInt()).isEqualTo(expected);
    assertThat(expected % 10).isEqualTo(9);
    assertThat(expected).isGreaterThan(baseFee);
    assertThat(b.at("/price/serviceAmount").decimalValue()).isEqualByComparingTo(String.valueOf(expected));
  }

  @Test
  void existingBookingsKeepTheirPriceWhenTheCityChanges() {
    String admin = adminToken();
    String customer = customerToken(CUSTOMER_PHONE);
    newCity(admin, "Keepsville", 125, "0.25");
    JsonNode before = book(customer, "Keepsville", electrician("el-fan")).getBody().get(0);
    assertThat(before.at("/price/serviceAmount").decimalValue()).isEqualByComparingTo("309");

    // Prices go up to 150% and the city commission is removed.
    assertThat(exchange(HttpMethod.PUT, "/api/v1/admin/cities/Keepsville", admin, city("Keepsville", 150, null), null).getStatusCode()).isEqualTo(HttpStatus.OK);

    JsonNode same = named(sync(customer).get("bookings"), "id", before.get("id").asText());
    assertThat(same.at("/items/0/price").decimalValue()).isEqualByComparingTo("309");
    assertThat(same.at("/price/total").decimalValue()).isEqualByComparingTo(before.at("/price/total").decimalValue());
    assertThat(same.at("/price/commissionRate").decimalValue()).isEqualByComparingTo("0.25");
    assertThat(same.at("/price/commission").decimalValue()).isEqualByComparingTo(before.at("/price/commission").decimalValue());

    JsonNode after = book(customer, "Keepsville", electrician("el-fan")).getBody().get(0);
    assertThat(after.at("/items/0/price").decimalValue()).isEqualByComparingTo("369"); // 249 × 1.5 = 373.5
    BigDecimal categoryRate = named(publicSync("/categories"), "id", "electrician").get("commissionRate").decimalValue();
    assertThat(after.at("/price/commissionRate").decimalValue()).isEqualByComparingTo(categoryRate);
  }

  @Test
  void priceLevelAndCommissionAreValidated() {
    String admin = adminToken();
    assertThat(post("/api/v1/admin/cities", admin, city("Cheapside", 20, null)).getBody().get("message").asText())
        .isEqualTo("Price level must be a whole percentage between 50 and 300");
    assertThat(post("/api/v1/admin/cities", admin, city("Greedham", 100, "0.9")).getBody().get("message").asText())
        .isEqualTo("City commission must be between 0 and 60%");
  }
}
