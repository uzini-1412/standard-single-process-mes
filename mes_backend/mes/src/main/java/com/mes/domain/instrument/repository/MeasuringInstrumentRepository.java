package com.mes.domain.instrument.repository;

import com.mes.domain.instrument.entity.MeasuringInstrument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MeasuringInstrumentRepository extends JpaRepository<MeasuringInstrument, Long> {

    // 관리번호(유니크)로 마스터 단건 조회.
    Optional<MeasuringInstrument> findByManageNo(String manageNo);

    // 관리번호 기준으로 이미지 경로 JSON 컬럼만 부분 업데이트.
    @Modifying
    @Query("UPDATE MeasuringInstrument mi SET mi.imgPaths = :imgPaths WHERE mi.manageNo = :manageNo")
    int updateImgPathsByManageNo(@Param("manageNo") String manageNo, @Param("imgPaths") String imgPaths);

    // 통합 키워드 검색: 하나의 키워드를 관리번호/기기명/기기번호 어디에든 부분 일치시킨다.
    // 사용중 행만 PK 역순(최근 등록 우선)으로 반환.
    @Query("""
            SELECT mi FROM MeasuringInstrument mi
            WHERE mi.useYn = true
              AND ( :keyword IS NULL
                    OR mi.manageNo     LIKE %:keyword%
                    OR mi.instrumentNm LIKE %:keyword%
                    OR mi.instrumentNo LIKE %:keyword% )
            ORDER BY mi.instrumentSq DESC
            """)
    List<MeasuringInstrument> findByKeyword(@Param("keyword") String keyword);

    // 항목별 검색: useYn=true 행만 대상으로, null 인 파라미터는 조건에서 제외한다.
    // 정렬 기준은 관리번호 오름차순.
    @Query("""
            SELECT mi FROM MeasuringInstrument mi
            WHERE mi.useYn = true
              AND (:instrumentType IS NULL OR mi.instrumentType = :instrumentType)
              AND (:manageNo       IS NULL OR mi.manageNo     LIKE %:manageNo%)
              AND (:instrumentNm   IS NULL OR mi.instrumentNm LIKE %:instrumentNm%)
              AND (:instrumentNo   IS NULL OR mi.instrumentNo LIKE %:instrumentNo%)
            ORDER BY mi.manageNo ASC
            """)
    List<MeasuringInstrument> findBySearchCondition(@Param("instrumentType") String instrumentType,
                                                    @Param("manageNo") String manageNo,
                                                    @Param("instrumentNm") String instrumentNm,
                                                    @Param("instrumentNo") String instrumentNo);
}
