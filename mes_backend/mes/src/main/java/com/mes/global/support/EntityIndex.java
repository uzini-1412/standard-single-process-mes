package com.mes.global.support;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * FK 일괄 조회를 거드는 정적 헬퍼 모음.
 *
 * <p>"연관 컬렉션에서 FK 키를 모아 한 번에 조회한 뒤 PK→엔티티 Map 으로 색인" 하는
 * N+1 회피 패턴을 한 곳으로 모은다. 여러 서비스가 같은 모양의 코드를 복제하던 것을
 * 두 메서드({@link #keys}, {@link #byId})로 통일한다.
 */
public final class EntityIndex {

    private EntityIndex() {
    }

    /** 소스 컬렉션에서 null 을 제외하고 중복을 제거한 FK 키 목록을 뽑는다. */
    public static <S> List<Long> keys(Collection<S> source, Function<S, Long> keyFn) {
        return source.stream()
                .map(keyFn)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());
    }

    /**
     * 키 목록을 한 번에 조회해 PK→엔티티 Map 으로 색인한다.
     * 키가 비어 있으면 조회 자체를 생략하고, 키가 겹치면 먼저 만난 엔티티를 유지한다.
     */
    public static <E> Map<Long, E> byId(List<Long> ids,
            Function<List<Long>, List<E>> loader, Function<E, Long> idFn) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        return loader.apply(ids).stream()
                .collect(Collectors.toMap(idFn, Function.identity(), (a, b) -> a));
    }
}
