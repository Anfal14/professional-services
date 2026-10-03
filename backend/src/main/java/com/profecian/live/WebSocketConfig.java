package com.profecian.live;

import com.profecian.auth.JwtService;
import com.profecian.config.SecurityConfig;
import java.security.Principal;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * STOMP over WebSocket at /ws. Clients send `Authorization: Bearer <token>` in the CONNECT frame
 * and subscribe to `/user/queue/events` (their own changes), `/topic/public` (catalogue/settings)
 * and, for admins, `/topic/admin`. Messages are tiny "changed" signals — the client re-syncs.
 */
@Configuration
@EnableWebSocketMessageBroker
@Order(Ordered.HIGHEST_PRECEDENCE + 99)
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
  private final JwtService jwt;

  public WebSocketConfig(JwtService jwt) {
    this.jwt = jwt;
  }

  @Override
  public void registerStompEndpoints(StompEndpointRegistry registry) {
    // Native apps send no Origin header; browsers are limited by the token, not the origin.
    registry.addEndpoint("/ws").setAllowedOriginPatterns("*");
  }

  @Override
  public void configureMessageBroker(MessageBrokerRegistry registry) {
    registry.enableSimpleBroker("/topic", "/queue").setHeartbeatValue(new long[] {20000, 20000}).setTaskScheduler(heartbeatScheduler());
    registry.setUserDestinationPrefix("/user");
  }

  private org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler heartbeatScheduler() {
    var scheduler = new org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler();
    scheduler.setPoolSize(1);
    scheduler.setThreadNamePrefix("ws-heartbeat-");
    scheduler.initialize();
    return scheduler;
  }

  @Override
  public void configureClientInboundChannel(ChannelRegistration registration) {
    registration.interceptors(new ChannelInterceptor() {
      @Override
      public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor acc = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (acc == null) return message;
        if (StompCommand.CONNECT.equals(acc.getCommand())) {
          String header = acc.getFirstNativeHeader("Authorization");
          if (header != null && header.startsWith("Bearer ")) {
            try {
              Jwt token = jwt.decoder().decode(header.substring(7));
              String name = token.getClaimAsString("role") + ":" + token.getSubject();
              acc.setUser(new UsernamePasswordAuthenticationToken(name, null, SecurityConfig.authorities(token)));
            } catch (JwtException e) {
              throw new IllegalArgumentException("Invalid token");
            }
          }
        } else if (StompCommand.SUBSCRIBE.equals(acc.getCommand())) {
          String dest = acc.getDestination();
          Principal user = acc.getUser();
          boolean ok = "/topic/public".equals(dest)
              || (user != null && "/user/queue/events".equals(dest))
              || (user != null && "/topic/admin".equals(dest) && user.getName().startsWith("admin:"));
          if (!ok) throw new IllegalArgumentException("Subscription not allowed: " + dest);
        }
        return message;
      }
    });
  }
}
