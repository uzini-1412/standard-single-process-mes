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

  // mes_dashboard(관제판, 로그인 없음) / 부팅 시 기능플래그 / 외부 PLC 하드웨어처럼
  // 애초에 로그인 세션을 들고 올 수 없는 호출자만 공개한다.
  // mes_op, mes_tab, mes_fe가 쓰는 나머지 엔드포인트는 전부 JWT 인증을 요구한다.
  private static final String[] PUBLIC_API_ENDPOINTS = {
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
      "/api/system/config",
      "/api/material/input/plc/ingest"
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
            .requestMatchers(PUBLIC_API_ENDPOINTS).permitAll()
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
