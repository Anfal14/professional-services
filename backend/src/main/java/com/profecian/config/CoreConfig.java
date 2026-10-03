package com.profecian.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.security.crypto.encrypt.Encryptors;
import org.springframework.security.crypto.encrypt.TextEncryptor;

@Configuration
// Repositories live next to their entity (nested interfaces), so nested scanning is enabled.
@EnableJpaRepositories(basePackages = "com.profecian", considerNestedRepositories = true)
@OpenAPIDefinition(info = @Info(title = "Profecian API", version = "v1",
    description = "Customer, vendor and admin API. Behaviour mirrors packages/shared/src/mock.ts."))
@SecurityScheme(name = "bearer", type = SecuritySchemeType.HTTP, scheme = "bearer", bearerFormat = "JWT")
public class CoreConfig {

  @Bean
  Clock clock() {
    return Clock.systemUTC();
  }

  /** Encrypts full bank account numbers at rest (AES-256/GCM). */
  @Bean
  TextEncryptor bankEncryptor(AppProperties props) {
    return Encryptors.delux(props.bankEncryption().password(), props.bankEncryption().salt());
  }
}
