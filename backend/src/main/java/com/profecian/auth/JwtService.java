package com.profecian.auth;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import com.profecian.common.ApiException;
import com.profecian.config.AppProperties;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.stereotype.Service;

/**
 * HS256 JWTs. Access tokens carry `role` (customer | vendor | admin) and, for admins, `adminRole`.
 * Signup tokens prove a verified phone number for 15 minutes so a new user can create a profile.
 */
@Service
public class JwtService {
  private final AppProperties props;
  private final Clock clock;
  private final JwtEncoder encoder;
  private final JwtDecoder decoder;

  public JwtService(AppProperties props, Clock clock) {
    this.props = props;
    this.clock = clock;
    byte[] secret = props.jwt().secret().getBytes(StandardCharsets.UTF_8);
    if (secret.length < 32) throw new IllegalStateException("profecian.jwt.secret must be at least 32 bytes");
    SecretKey key = new SecretKeySpec(secret, "HmacSHA256");
    this.encoder = new NimbusJwtEncoder(new ImmutableSecret<>(key));
    this.decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
  }

  public JwtDecoder decoder() {
    return decoder;
  }

  public String accessToken(String role, String subjectId, String adminRole) {
    Instant now = clock.instant();
    JwtClaimsSet.Builder claims = JwtClaimsSet.builder()
        .issuer("profecian").subject(subjectId).issuedAt(now).expiresAt(now.plus(props.jwt().accessTtl()))
        .claim("role", role).claim("typ", "access");
    if (adminRole != null) claims.claim("adminRole", adminRole);
    return encode(claims.build());
  }

  public String signupToken(String audience, String phone) {
    Instant now = clock.instant();
    return encode(JwtClaimsSet.builder()
        .issuer("profecian").subject(phone).issuedAt(now).expiresAt(now.plus(props.jwt().signupTtl()))
        .claim("typ", "signup").claim("aud_role", audience).build());
  }

  /** Returns the verified phone number in a signup token issued for `audience`. */
  public String verifySignup(String token, String audience) {
    try {
      Jwt jwt = decoder.decode(token);
      if (!"signup".equals(jwt.getClaimAsString("typ")) || !audience.equals(jwt.getClaimAsString("aud_role"))) throw ApiException.unauthorized("OTP expired, please request a new one");
      return jwt.getSubject();
    } catch (JwtException e) {
      throw ApiException.unauthorized("OTP expired, please request a new one");
    }
  }

  private String encode(JwtClaimsSet claims) {
    return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
  }

  public Map<String, Object> describe() {
    return Map.of("accessTtlSeconds", props.jwt().accessTtl().toSeconds());
  }
}
