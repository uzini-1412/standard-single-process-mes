package com.mes.global.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerConfig {

  @Bean
  public OpenAPI openAPI() {
    // 보안 스키마 이름 설정
    String jwt = "JWT";

    // 1. 보안 요구사항 설정 (모든 API에 적용)
    SecurityRequirement securityRequirement = new SecurityRequirement().addList(jwt);

    // 2. 보안 스키마 정의 (JWT Bearer Token 방식)
    Components components = new Components().addSecuritySchemes(jwt, new SecurityScheme()
        .name(jwt)
        .type(SecurityScheme.Type.HTTP)
        .scheme("bearer")
        .bearerFormat("JWT"));

    return new OpenAPI()
        .components(components)
        .addSecurityItem(securityRequirement)
        .info(new Info()
            .title("MES 관리자 MES API 문서")
            .description("관리자용 웹플랫폼 API 명세서")
            .version("1.0.0"));
  }
}