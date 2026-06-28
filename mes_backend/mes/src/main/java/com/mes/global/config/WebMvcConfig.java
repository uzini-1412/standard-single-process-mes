package com.mes.global.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * 업로드 디렉터리를 {@code /files/**} 정적 리소스 경로로 노출하는 MVC 설정.
 */
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

  @Value("${app.upload.dir}")
  private String uploadDir;

  @Override
  public void addResourceHandlers(ResourceHandlerRegistry registry) {
    registry.addResourceHandler("/files/**")
        .addResourceLocations(uploadLocation());
  }

  /** 업로드 경로를 절대경로 file URI 로 바꾸고 끝에 슬래시를 보장한다. */
  private String uploadLocation() {
    Path dir = Paths.get(uploadDir).toAbsolutePath().normalize();
    String uri = dir.toUri().toString();
    return uri.endsWith("/") ? uri : uri + "/";
  }
}
