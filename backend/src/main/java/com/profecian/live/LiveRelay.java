package com.profecian.live;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.messaging.simp.SimpMessagingTemplate;

/** Subscribes to the Redis channel and forwards each event to this server's STOMP clients. */
@Configuration
public class LiveRelay {
  private static final Logger log = LoggerFactory.getLogger(LiveRelay.class);

  @Bean
  RedisMessageListenerContainer liveListener(RedisConnectionFactory factory, SimpMessagingTemplate stomp, ObjectMapper json) {
    RedisMessageListenerContainer container = new RedisMessageListenerContainer();
    container.setConnectionFactory(factory);
    container.addMessageListener((message, pattern) -> {
      try {
        LiveEvents.Event e = json.readValue(new String(message.getBody(), StandardCharsets.UTF_8), LiveEvents.Event.class);
        Map<String, Object> payload = e.bookingId() != null ? Map.of("type", "changed", "bookingId", e.bookingId()) : Map.of("type", "changed");
        switch (e.audience()) {
          case "admin" -> stomp.convertAndSend("/topic/admin", payload);
          case "public" -> stomp.convertAndSend("/topic/public", payload);
          default -> stomp.convertAndSendToUser(e.audience() + ":" + e.recipientId(), "/queue/events", payload);
        }
      } catch (Exception ex) {
        log.warn("Bad live event: {}", ex.getMessage());
      }
    }, new ChannelTopic(LiveEvents.CHANNEL));
    return container;
  }
}
