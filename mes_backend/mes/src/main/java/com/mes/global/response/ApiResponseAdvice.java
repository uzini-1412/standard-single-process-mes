package com.mes.global.response;

import org.springframework.core.MethodParameter;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

/**
 * com.mes.domain 의 컨트롤러가 반환한 raw 객체를 {@link ApiCommonResponse} 로 자동 래핑한다.
 *
 * <p>덕분에 컨트롤러는 {@code return service.getList(req);} 처럼 도메인 객체를 그대로 반환하면 되고,
 * 매번 {@code ApiCommonResponse.success(...)} 로 감쌀 필요가 없다.
 *
 * <p>래핑 규칙
 * <ul>
 *   <li>이미 {@code ApiCommonResponse} 면 그대로 통과 — 이중 래핑 방지. (커스텀 메시지를 담은
 *       {@code success("...", data)} 응답과 GlobalExceptionHandler 의 에러 응답이 그대로 보존된다.)</li>
 *   <li>파일 다운로드용 {@code Resource}, {@code byte[]}, {@code String} 은 래핑하지 않는다.</li>
 *   <li>그 외 일반 객체/컬렉션/{@code null} 은 {@code success(data)} 로 감싼다.</li>
 * </ul>
 *
 * <p>{@code basePackages} 로 우리 도메인 컨트롤러에만 적용한다. 이렇게 하지 않으면 springdoc(Swagger)의
 * {@code /v3/api-docs}, actuator 응답까지 래핑되어 깨진다.
 */
@RestControllerAdvice(basePackages = "com.mes.domain")
public class ApiResponseAdvice implements ResponseBodyAdvice<Object> {

  @Override
  public boolean supports(MethodParameter returnType,
      Class<? extends HttpMessageConverter<?>> converterType) {
    // 이미 ApiCommonResponse 를 반환하도록 선언된 메서드는 래핑 대상에서 제외한다.
    return !ApiCommonResponse.class.isAssignableFrom(returnType.getParameterType());
  }

  @Override
  public Object beforeBodyWrite(Object body, MethodParameter returnType,
      MediaType selectedContentType,
      Class<? extends HttpMessageConverter<?>> selectedConverterType,
      ServerHttpRequest request, ServerHttpResponse response) {
    // 래핑하면 안 되는 타입은 원본 그대로 반환한다.
    if (body instanceof ApiCommonResponse) return body;   // supports 에서 걸러지지만 방어적으로 한 번 더
    if (body instanceof Resource) return body;             // 파일/이미지 다운로드 (ResponseEntity<Resource>)
    if (body instanceof byte[]) return body;
    if (body instanceof String) return body;               // String 컨버터에서의 ClassCastException 방지
    return ApiCommonResponse.success(body);
  }
}
