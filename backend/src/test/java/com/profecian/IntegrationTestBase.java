package com.profecian;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

/**
 * Boots the whole app against real Postgres+PostGIS and Redis containers with the dev seed
 * (same demo data as the apps). Skipped automatically when Docker is not available.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("dev")
@Testcontainers(disabledWithoutDocker = true)
public abstract class IntegrationTestBase {
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>(
      DockerImageName.parse("postgis/postgis:16-3.4").asCompatibleSubstituteFor("postgres"));
  static final GenericContainer<?> REDIS = new GenericContainer<>(DockerImageName.parse("redis:7-alpine")).withExposedPorts(6379);

  static {
    // Shared by every integration test class (started once per JVM).
    if (org.testcontainers.DockerClientFactory.instance().isDockerAvailable()) {
      POSTGRES.start();
      REDIS.start();
    }
  }

  @DynamicPropertySource
  static void props(DynamicPropertyRegistry r) {
    r.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    r.add("spring.datasource.username", POSTGRES::getUsername);
    r.add("spring.datasource.password", POSTGRES::getPassword);
    r.add("spring.data.redis.host", REDIS::getHost);
    r.add("spring.data.redis.port", () -> REDIS.getMappedPort(6379));
    r.add("profecian.outbox.poll-interval-ms", () -> "3600000"); // tests drive the worker directly
    r.add("profecian.otp.max-sends-per-window", () -> "1000");
  }

  @Autowired
  protected TestRestTemplate http;

  @Autowired
  protected ObjectMapper json;

  protected static final String CUSTOMER_PHONE = "9876500001";
  protected static final String VENDOR_PHONE = "9876500101";

  protected String customerToken(String phone) {
    return otpLogin("customer", phone);
  }

  protected String vendorToken(String phone) {
    return otpLogin("vendor", phone);
  }

  private String otpLogin(String role, String phone) {
    JsonNode sent = post("/api/v1/auth/otp", null, Map.of("phone", phone)).getBody();
    JsonNode verified = post("/api/v1/auth/" + role + "/verify", null, Map.of("requestId", sent.get("requestId").asText(), "code", "123456")).getBody();
    return verified.at("/tokens/accessToken").asText();
  }

  protected String adminToken() {
    return post("/api/v1/auth/admin/login", null, Map.of("email", "admin@profecian.app", "password", "Admin@123")).getBody().at("/tokens/accessToken").asText();
  }

  protected ResponseEntity<JsonNode> post(String path, String token, Object body) {
    return exchange(HttpMethod.POST, path, token, body, null);
  }

  protected ResponseEntity<JsonNode> exchange(HttpMethod method, String path, String token, Object body, HttpHeaders extra) {
    HttpHeaders h = new HttpHeaders();
    h.setContentType(MediaType.APPLICATION_JSON);
    if (token != null) h.setBearerAuth(token);
    if (extra != null) h.addAll(extra);
    return http.exchange(path, method, new HttpEntity<>(body, h), JsonNode.class);
  }

  protected JsonNode sync(String token) {
    return exchange(HttpMethod.GET, "/api/v1/sync", token, null, null).getBody();
  }
}
