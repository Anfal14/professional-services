package com.profecian.config;

import com.profecian.auth.JwtService;
import com.profecian.auth.Permissions;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Stateless JWT security. Authorities: ROLE_CUSTOMER / ROLE_VENDOR / ROLE_ADMIN, plus
 * PERM_<permission> for admins following ROLE_PERMISSIONS — checked with @PreAuthorize.
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

  @Bean
  SecurityFilterChain api(HttpSecurity http, JwtService jwt) throws Exception {
    http
        .csrf(c -> c.disable())
        .cors(c -> {})
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(a -> a
            .requestMatchers("/api/v1/auth/**", "/api/v1/sync", "/api/v1/payments/webhook/**", "/files/**", "/ws/**",
                "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html", "/actuator/health").permitAll()
            .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
            .requestMatchers("/api/v1/customer/**").hasRole("CUSTOMER")
            .requestMatchers("/api/v1/vendor/**").hasRole("VENDOR")
            .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
            .anyRequest().authenticated())
        .oauth2ResourceServer(o -> o.jwt(j -> j.decoder(jwt.decoder()).jwtAuthenticationConverter(converter())));
    return http.build();
  }

  @Bean
  JwtDecoder jwtDecoder(JwtService jwt) {
    return jwt.decoder();
  }

  static JwtAuthenticationConverter converter() {
    JwtAuthenticationConverter c = new JwtAuthenticationConverter();
    c.setJwtGrantedAuthoritiesConverter(SecurityConfig::authorities);
    return c;
  }

  public static Collection<GrantedAuthority> authorities(Jwt jwt) {
    List<GrantedAuthority> out = new ArrayList<>();
    if (!"access".equals(jwt.getClaimAsString("typ"))) return out;
    String role = jwt.getClaimAsString("role");
    if (role != null) out.add(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()));
    String adminRole = jwt.getClaimAsString("adminRole");
    if ("admin".equals(role) && adminRole != null) {
      Permissions.ROLE_PERMISSIONS.getOrDefault(adminRole, List.of()).forEach(p -> out.add(new SimpleGrantedAuthority("PERM_" + p)));
    }
    return out;
  }

  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  CorsConfigurationSource corsConfigurationSource(AppProperties props) {
    CorsConfiguration cfg = new CorsConfiguration();
    cfg.setAllowedOrigins(props.corsOrigins());
    cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    cfg.setAllowedHeaders(List.of("Authorization", "Content-Type", "Idempotency-Key"));
    cfg.setMaxAge(3600L);
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", cfg);
    return source;
  }
}
