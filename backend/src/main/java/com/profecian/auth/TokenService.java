package com.profecian.auth;

import com.profecian.common.ApiException;
import com.profecian.common.Ids;
import com.profecian.config.AppProperties;
import java.time.Clock;
import java.time.Instant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Issues access + refresh token pairs and rotates refresh tokens on use. */
@Service
public class TokenService {
  private final JwtService jwt;
  private final RefreshToken.Repository refreshTokens;
  private final AppProperties props;
  private final Clock clock;

  public TokenService(JwtService jwt, RefreshToken.Repository refreshTokens, AppProperties props, Clock clock) {
    this.jwt = jwt;
    this.refreshTokens = refreshTokens;
    this.props = props;
    this.clock = clock;
  }

  public record Tokens(String accessToken, String refreshToken, long expiresIn) {}

  @Transactional
  public Tokens issue(String role, String subjectId, String adminRole) {
    String raw = Ids.random(48);
    RefreshToken t = new RefreshToken();
    t.id = Ids.newId("rt");
    t.role = role;
    t.subjectId = subjectId;
    t.tokenHash = OtpService.hash(raw);
    t.expiresAt = clock.instant().plus(props.jwt().refreshTtl());
    refreshTokens.save(t);
    return new Tokens(jwt.accessToken(role, subjectId, adminRole), t.id + "." + raw, props.jwt().accessTtl().toSeconds());
  }

  public interface AdminRoleLookup {
    String adminRole(String adminId);
  }

  /** Exchanges a refresh token for a new pair; the old one is revoked (rotation). */
  @Transactional
  public Tokens refresh(String token, AdminRoleLookup admins) {
    if (token == null || !token.contains(".")) throw ApiException.unauthorized("Please log in again");
    String raw = token.substring(token.indexOf('.') + 1);
    RefreshToken t = refreshTokens.findByTokenHash(OtpService.hash(raw)).orElseThrow(() -> ApiException.unauthorized("Please log in again"));
    Instant now = clock.instant();
    if (t.revokedAt != null) {
      // Re-use of a rotated token: assume it leaked and log the subject out everywhere.
      refreshTokens.revokeAll(t.role, t.subjectId, now);
      throw ApiException.unauthorized("Please log in again");
    }
    if (t.expiresAt.isBefore(now)) throw ApiException.unauthorized("Please log in again");
    t.revokedAt = now;
    return issue(t.role, t.subjectId, "admin".equals(t.role) ? admins.adminRole(t.subjectId) : null);
  }

  @Transactional
  public void revoke(String token) {
    if (token == null || !token.contains(".")) return;
    refreshTokens.findByTokenHash(OtpService.hash(token.substring(token.indexOf('.') + 1))).ifPresent(t -> t.revokedAt = clock.instant());
  }
}
