package com.mes.global.config;

import com.mes.global.security.jwt.JwtAuthenticationFilter;
import com.mes.global.security.jwt.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@org.springframework.context.annotation.EnableAspectJAutoProxy
@EnableConfigurationProperties(CorsProperties.class)
@RequiredArgsConstructor
public class SecurityConfig {

  private static final String[] OP_PUBLIC_API_ENDPOINTS = {
      "/api/dashboard/process/status",
      "/api/dashboard/shipment/monthly",
      "/api/dashboard/line-trend/monthly",
      "/api/dashboard/production/plan-vs-actual",
      "/api/dashboard/material/monthly",
      "/api/dashboard/facility/reliability",
      "/api/dashboard/weight-deviation",
      "/api/dashboard/inventory/turnover",
      "/api/dashboard/notice/list",
      "/api/dashboard/quality/customer-claim",
      "/api/dashboard/kpi",
      "/api/common-info/list",
      "/api/facility/check-item/list",
      "/api/facility/daily-check/list",
      "/api/facility/daily-check/save",
      "/api/facility/list",
      "/api/inspect/list",
      "/api/inspect/result/list",
      "/api/inspect/result/save",
      "/api/item/list",
      "/api/material/inbound/list",
      "/api/material/input/plc/ingest",
      "/api/material/input/plc/raw-list",
      "/api/material/stock/list",
      "/api/production/material-input/confirm",
      "/api/production/material-input/list",
      "/api/production/material-input/save",
      "/api/production/result/downtime/list",
      "/api/production/result/downtime/save",
      "/api/production/result/list",
      "/api/production/result/save",
      "/api/production/work-order/list",
      "/api/production/work-order/update-status",
      "/api/product-stock/audit/save",
      "/api/product-stock/audit/today",
      "/api/product-stock/lot-list",
      "/api/bom/list",
      "/api/shipment/order/list",
      "/api/shipment/result/save",
      "/api/shipment/result/scan",
      "/api/staff/list",
      "/api/system/config"
  };

  private final JwtTokenProvider jwtTokenProvider;
  private final CorsProperties corsProperties;

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        .cors(cors -> cors.configurationSource(corsConfigurationSource()))
        .csrf(AbstractHttpConfigurer::disable)
        .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(auth -> auth
            .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
            .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
            .requestMatchers("/files/**").permitAll()
            .requestMatchers("/api/auth/**").permitAll()
            .requestMatchers(OP_PUBLIC_API_ENDPOINTS).permitAll()
            .anyRequest().authenticated())
        .addFilterBefore(new JwtAuthenticationFilter(jwtTokenProvider), UsernamePasswordAuthenticationFilter.class);

    return http.build();
  }

  @Bean
  public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOriginPatterns(corsProperties.getAllowedOriginPatterns());
    config.setAllowedMethods(corsProperties.getAllowedMethods());
    config.setAllowedHeaders(corsProperties.getAllowedHeaders());
    config.setExposedHeaders(corsProperties.getExposedHeaders());
    config.setAllowCredentials(corsProperties.isAllowCredentials());
    config.setMaxAge(corsProperties.getMaxAge());

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
  }
}
