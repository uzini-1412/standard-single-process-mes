package com.mes.global.security.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtParser;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.security.Key;
import java.util.Date;
import java.util.List;

/**
 * HS256 액세스 토큰의 발급·검증·파싱을 담당하는 컴포넌트.
 */
@Slf4j
@Component
public class JwtTokenProvider {

  private static final String AUTH_HEADER = "Authorization";
  private static final String BEARER_PREFIX = "Bearer ";
  private static final String ROLE_CLAIM = "role";
  private static final int MIN_SECRET_BYTES = 32;
  private static final long TOKEN_TTL_MS = 1000L * 60 * 60 * 20; // 20시간

  private final Key key;

  public JwtTokenProvider(@Value("${jwt.secret:}") String secretKey) {
    this.key = buildSigningKey(secretKey);
  }

  private static Key buildSigningKey(String secretKey) {
    if (secretKey == null || secretKey.isBlank()) {
      throw new IllegalStateException(
          "JWT secret이 설정되지 않았습니다. 환경변수 JWT_SECRET 또는 jwt.secret 프로퍼티에 32자 이상의 강한 시크릿을 설정해야 합니다.");
    }
    byte[] raw = secretKey.getBytes();
    if (raw.length < MIN_SECRET_BYTES) {
      throw new IllegalStateException(
          "JWT secret 길이가 부족합니다 (최소 32 바이트 필요, 현재 " + raw.length + " 바이트).");
    }
    return Keys.hmacShaKeyFor(raw);
  }

  /** userId 를 subject, role 을 클레임으로 담아 20시간짜리 액세스 토큰을 발급한다. */
  public String createToken(String userId, String role) {
    long issuedAt = System.currentTimeMillis();
    return Jwts.builder()
        .setSubject(userId)
        .claim(ROLE_CLAIM, role)
        .setIssuedAt(new Date(issuedAt))
        .setExpiration(new Date(issuedAt + TOKEN_TTL_MS))
        .signWith(key, SignatureAlgorithm.HS256)
        .compact();
  }

  /** 토큰을 풀어 Spring Security 인증 객체로 변환한다(비밀번호는 빈 값). */
  public Authentication getAuthentication(String token) {
    Claims claims = parseClaims(token);
    String role = claims.get(ROLE_CLAIM, String.class);
    GrantedAuthority authority = () -> role;
    UserDetails principal = new User(claims.getSubject(), "", List.of(authority));
    return new UsernamePasswordAuthenticationToken(principal, token, principal.getAuthorities());
  }

  /** Authorization 헤더에서 Bearer 토큰만 떼어 돌려준다. 없으면 null. */
  public String resolveToken(HttpServletRequest request) {
    String header = request.getHeader(AUTH_HEADER);
    if (StringUtils.hasText(header) && header.startsWith(BEARER_PREFIX)) {
      return header.substring(BEARER_PREFIX.length());
    }
    return null;
  }

  /** 서명·만료·형식을 검사한다. 어떤 사유로든 통과 못 하면 false. */
  public boolean validateToken(String token) {
    try {
      parser().parseClaimsJws(token);
      return true;
    } catch (io.jsonwebtoken.security.SecurityException | MalformedJwtException e) {
      log.info("JWT 서명이 올바르지 않습니다.");
    } catch (ExpiredJwtException e) {
      log.info("JWT 토큰이 만료되었습니다.");
    } catch (UnsupportedJwtException e) {
      log.info("지원하지 않는 형식의 JWT 토큰입니다.");
    } catch (IllegalArgumentException e) {
      log.info("JWT 토큰 값이 비어 있거나 잘못되었습니다.");
    }
    return false;
  }

  /** 만료된 토큰이라도 클레임은 꺼내 반환한다(만료 클레임 활용 케이스). */
  private Claims parseClaims(String token) {
    try {
      return parser().parseClaimsJws(token).getBody();
    } catch (ExpiredJwtException e) {
      return e.getClaims();
    }
  }

  private JwtParser parser() {
    return Jwts.parserBuilder().setSigningKey(key).build();
  }
}
