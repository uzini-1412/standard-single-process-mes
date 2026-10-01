package com.mes.global.response;

import org.springframework.core.MethodParameter;
import org.springframework.core.ResolvableType;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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
 * <p>판정은 <b>실제 본문 인스턴스가 아니라 메서드가 선언한 본문 타입</b>으로 한다. 인스턴스로만
 * 보면 {@code ResponseEntity.notFound().build()} 처럼 <b>본문이 null 인 응답</b>이 래핑 대상이 되어
 * {@code ApiCommonResponse} 가 되는데, 메시지 컨버터는 선언 타입({@code Resource})을 보고 고른
 * {@code ResourceHttpMessageConverter} 라서 캐스팅에 실패한다. 그러면 다운로드 API 의 404/400 이
 * 전부 {@code ClassCastException} → 500 으로 바뀐다. (다운로드 컨트롤러 4개가 이 문제를 겪었다)
 *
 * <p>{@code basePackages} 로 우리 도메인 컨트롤러에만 적용한다. 이렇게 하지 않으면 springdoc(Swagger)의
 * {@code /v3/api-docs}, actuator 응답까지 래핑되어 깨진다.
 */
@RestControllerAdvice(basePackages = "com.mes.domain")
public class ApiResponseAdvice implements ResponseBodyAdvice<Object> {

  @Override
  public boolean supports(MethodParameter returnType,
      Class<? extends HttpMessageConverter<?>> converterType) {
    return !isPassThrough(declaredBodyType(returnType));
  }

  @Override
  public Object beforeBodyWrite(Object body, MethodParameter returnType,
      MediaType selectedContentType,
      Class<? extends HttpMessageConverter<?>> selectedConverterType,
      ServerHttpRequest request, ServerHttpResponse response) {
    // 래핑하면 안 되는 타입은 원본 그대로 반환한다. (supports 에서 걸러지지만 방어적으로 한 번 더)
    if (body != null && isPassThrough(body.getClass())) return body;
    // null 은 예전처럼 success(null) 로 감싼다. 여기까지 왔다는 건 선언 본문 타입이
    // 래핑 대상이라는 뜻이라(supports 통과) 컨버터 캐스팅 문제가 없다.
    return ApiCommonResponse.success(body);
  }

  /**
   * 메서드가 선언한 본문 타입. {@code ResponseEntity<T>} 면 {@code T} 를, 아니면 반환 타입 자체를 준다.
   * 제네릭을 못 풀면 {@code Object} 로 보아 평소대로 래핑한다.
   */
  private static Class<?> declaredBodyType(MethodParameter returnType) {
    Class<?> declared = returnType.getParameterType();
    if (!ResponseEntity.class.isAssignableFrom(declared)) {
      return declared;
    }
    Class<?> resolved = ResolvableType.forMethodParameter(returnType).getGeneric(0).resolve();
    return resolved != null ? resolved : Object.class;
  }

  /** 래핑 대상에서 제외할 타입인가. */
  private static boolean isPassThrough(Class<?> type) {
    return ApiCommonResponse.class.isAssignableFrom(type)
        || Resource.class.isAssignableFrom(type)
        || byte[].class.equals(type)
        || CharSequence.class.isAssignableFrom(type);
  }
}
