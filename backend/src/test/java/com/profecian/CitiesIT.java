package com.profecian;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/** Multi-city rules: where customers can book, what each city offers, who gets matched, and managing cities. */
class CitiesIT extends IntegrationTestBase {

  private ResponseEntity<JsonNode> checkoutIn(String token, String city, String categoryId, String problemId) {
    return post("/api/v1/customer/checkout", token, Map.of(
        "groups", List.of(Map.of("categoryId", categoryId, "problemTypeIds", List.of(problemId))),
        "date", LocalDate.now().plusDays(4).toString(),
        "slot", "11:00 AM",
        "address", Map.of("label", "Other", "line", "12, Test Street", "city", city),
        "contactName", "Priya Sharma",
        "contactPhone", "9876500001"));
  }

  private Map<String, Object> city(String name, String status) {
    Map<String, Object> c = new HashMap<>();
    c.put("name", name);
    c.put("state", "Maharashtra");
    c.put("status", status);
    c.put("lat", 19.9975);
    c.put("lng", 73.7898);
    c.put("radiusKm", 25);
    c.put("areas", List.of("College Road", " Gangapur Road ", "College Road"));
    c.put("disabledCategoryIds", List.of());
    return c;
  }

  private JsonNode publicCity(String name) {
    for (JsonNode c : sync(null).at("/settings/cities")) if (c.get("name").asText().equals(name)) return c;
    return null;
  }

  @Test
  void seededCitiesCarryTheirDetails() {
    JsonNode mumbai = publicCity("Mumbai");
    assertThat(mumbai.get("status").asText()).isEqualTo("live");
    assertThat(mumbai.get("radiusKm").asInt()).isEqualTo(40);
    assertThat(mumbai.get("areas").size()).isEqualTo(5);
    assertThat(mumbai.get("disabledCategoryIds").get(0).asText()).isEqualTo("pest-control");
    assertThat(publicCity("Delhi").get("status").asText()).isEqualTo("coming_soon");
  }

  @Test
  void bookingsOnlyOpenInLiveCitiesForOfferedServices() {
    String token = customerToken(CUSTOMER_PHONE);

    ResponseEntity<JsonNode> comingSoon = checkoutIn(token, "Delhi", "electrician", "el-fan");
    assertThat(comingSoon.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    assertThat(comingSoon.getBody().get("message").asText()).isEqualTo("We’re launching in Delhi soon — bookings aren’t open yet");

    ResponseEntity<JsonNode> unknown = checkoutIn(token, "Atlantis", "electrician", "el-fan");
    assertThat(unknown.getBody().get("message").asText()).isEqualTo("We don’t serve Atlantis yet");

    ResponseEntity<JsonNode> notOffered = checkoutIn(token, "Mumbai", "pest-control", "ps-cockroach");
    assertThat(notOffered.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    assertThat(notOffered.getBody().get("message").asText()).isEqualTo("Pest Control isn’t available in Mumbai yet");

    assertThat(checkoutIn(token, "Mumbai", "electrician", "el-fan").getStatusCode()).isEqualTo(HttpStatus.OK);
    // City names are matched case-insensitively.
    assertThat(checkoutIn(token, "solapur", "pest-control", "ps-cockroach").getStatusCode()).isEqualTo(HttpStatus.OK);
  }

  @Test
  void suggestionsOnlyIncludeVendorsInTheBookingsCity() {
    String token = customerToken(CUSTOMER_PHONE);
    String bookingId = checkoutIn(token, "Pune", "electrician", "el-fan").getBody().get(0).get("id").asText();
    JsonNode suggestions = exchange(HttpMethod.GET, "/api/v1/admin/bookings/" + bookingId + "/suggestions", adminToken(), null, null).getBody();

    assertThat(suggestions.size()).isGreaterThan(0);
    List<String> cities = new ArrayList<>();
    suggestions.forEach(s -> cities.add(s.at("/vendor/city").asText()));
    assertThat(cities).containsOnly("Pune");
  }

  @Test
  void adminCreatesLaunchesAndRemovesCities() {
    String admin = adminToken();
    String customer = customerToken(CUSTOMER_PHONE);

    ResponseEntity<JsonNode> created = post("/api/v1/admin/cities", admin, city("Nashik", "coming_soon"));
    assertThat(created.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(created.getBody().get("areas").size()).isEqualTo(2); // trimmed and de-duplicated
    assertThat(publicCity("Nashik").get("status").asText()).isEqualTo("coming_soon");
    assertThat(post("/api/v1/admin/cities", admin, city("nashik", "live")).getBody().get("message").asText()).isEqualTo("nashik already exists");
    assertThat(checkoutIn(customer, "Nashik", "electrician", "el-fan").getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

    // Launch it, with plumbing not offered yet.
    Map<String, Object> live = city("Nashik", "live");
    live.put("disabledCategoryIds", List.of("plumber"));
    assertThat(exchange(HttpMethod.PUT, "/api/v1/admin/cities/Nashik", admin, live, null).getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(checkoutIn(customer, "Nashik", "electrician", "el-fan").getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(checkoutIn(customer, "Nashik", "plumber", "pl-tap").getBody().get("message").asText()).isEqualTo("Plumbing isn’t available in Nashik yet");

    // Renaming and bad input are refused.
    assertThat(exchange(HttpMethod.PUT, "/api/v1/admin/cities/Nashik", admin, city("Nasik", "live"), null).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    Map<String, Object> tooWide = city("Satara", "live");
    tooWide.put("radiusKm", 500);
    assertThat(post("/api/v1/admin/cities", admin, tooWide).getBody().get("message").asText()).isEqualTo("Service radius must be between 1 and 200 km");

    // A city with bookings can't be deleted; an unused one can.
    ResponseEntity<JsonNode> inUse = exchange(HttpMethod.DELETE, "/api/v1/admin/cities/Nashik", admin, null, null);
    assertThat(inUse.getBody().get("message").asText()).isEqualTo("Nashik has customers, vendors or bookings — pause it instead");
    post("/api/v1/admin/cities", admin, city("Testville", "coming_soon"));
    assertThat(exchange(HttpMethod.DELETE, "/api/v1/admin/cities/Testville", admin, null, null).getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    assertThat(publicCity("Testville")).isNull();

    // Only admins with the settings permission manage cities.
    assertThat(post("/api/v1/admin/cities", customer, city("Akola", "live")).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
  }

  @Test
  void vendorsCanJoinComingSoonCitiesButNotUnknownOnes() {
    String phone = "9876512345";
    JsonNode sent = post("/api/v1/auth/otp", null, Map.of("phone", phone)).getBody();
    String signup = post("/api/v1/auth/vendor/verify", null, Map.of("requestId", sent.get("requestId").asText(), "code", "123456")).getBody().get("signupToken").asText();

    Map<String, Object> form = new HashMap<>(Map.of("signupToken", signup, "name", "Test Partner", "city", "Atlantis", "categoryIds", List.of("electrician"), "serviceAreas", List.of()));
    assertThat(post("/api/v1/auth/vendor/register", null, form).getBody().get("message").asText()).isEqualTo("We aren’t accepting partners in that city right now");

    form.put("city", "kolhapur");
    ResponseEntity<JsonNode> ok = post("/api/v1/auth/vendor/register", null, form);
    assertThat(ok.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(ok.getBody().at("/vendor/city").asText()).isEqualTo("Kolhapur");
  }
}
