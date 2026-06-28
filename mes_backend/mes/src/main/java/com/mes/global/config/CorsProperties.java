package com.mes.global.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@Getter
@Setter
@ConfigurationProperties(prefix = "app.cors")
public class CorsProperties {

  private List<String> allowedOriginPatterns = List.of(
      "http://localhost:*",
      "https://localhost:*",
      "http://127.0.0.1:*",
      "https://127.0.0.1:*"
  );

  private List<String> allowedMethods = List.of(
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS"
  );

  private List<String> allowedHeaders = List.of("*");

  private List<String> exposedHeaders = List.of("Authorization");

  private boolean allowCredentials = true;

  private long maxAge = 3600;
}
