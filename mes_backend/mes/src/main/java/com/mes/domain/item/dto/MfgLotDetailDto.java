package com.mes.domain.item.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/**
 * 제조 LOT 상세 패널의 페이로드.
 *
 * <p>입력은 제조 LOT 번호({@link Req}) 한 건. 응답({@link Res})은 LOT 헤더에
 * 다섯 갈래의 하위 목록 — 롤별 제품중량, 투입 원소재, 자주검사, 출하 연계,
 * 공정 불량 — 을 덧붙여 한 번에 반환한다.
 *
 * <p>서비스가 빈을 무인자로 만든 뒤 setter 로 채우므로 모든 타입에 getter/setter 를 둔다.
 */
public final class MfgLotDetailDto {

    private MfgLotDetailDto() {
    }

    /** 제조 LOT 번호 입력 키. */
    @Getter
    @Setter
    @NoArgsConstructor
    public static class Req {
        private String lotNo;
    }

    /**
     * 제조 LOT 헤더와 하위 목록 묶음.
     * 헤더는 식별 → 규격/생산수치 → 수량/판정 순으로, 그 뒤에 목록들을 둔다.
     */
    @Getter
    @Setter
    @NoArgsConstructor
    public static class Res {
        // 식별
        private String lotNo;
        private String prodDate;
        private String itemCode;
        private String itemName;

        // 규격 및 생산 수치
        private String basisWeight;
        private String width;
        private String managedWeight;
        private String speed;
        private String lineTime;

        // 수량 및 양/불 판정
        private String orderedQty;
        private String actualQty;
        private String goodDefect;

        // 하위 목록
        private List<ProductWeightItem> productWeights;
        private List<MaterialItem> materials;
        private String qaLotNo;
        private List<QaItem> qaResults;
        private List<ShipLinkItem> shipLinks;
        private List<DefectItem> defects;
    }

    // ===== 하위 목록 행 정의 =====

    /**
     * 롤(또는 LOT) 단위 제품 중량 측정 한 줄.
     */
    @Getter
    @Setter
    @NoArgsConstructor
    public static class ProductWeightItem {
        private String lotNo;
        private Integer rollNo;
        private String prodWidth;
        private String prodLength;
        private String realBasisWeight;
        private String netWeight;
        private String grossWeight;
        private String judgeCode;
        private String workDate;
    }

    /**
     * 이 제조 LOT 에 투입된 원소재 한 줄. {@code over} 는 표준배합 대비 초과 여부 플래그.
     */
    @Getter
    @Setter
    @NoArgsConstructor
    public static class MaterialItem {
        private String purchaseLotNo;
        private String itemCode;
        private String materialType;
        private String standardRatio;
        private String inputQty;
        private String overRate;
        private boolean over;
    }

    /**
     * 자주검사 측정 한 줄. {@code pass} 는 규격 충족 여부.
     */
    @Getter
    @Setter
    @NoArgsConstructor
    public static class QaItem {
        private String inspectType;
        private String inspectTime;
        private String inspectItem;
        private String standard;
        private String measured;
        private boolean pass;
    }

    /**
     * 제조 LOT → 출하 LOT 연계 한 줄.
     */
    @Getter
    @Setter
    @NoArgsConstructor
    public static class ShipLinkItem {
        private String shipLotNo;
        private String shipDate;
        private String customerName;
        private String shippedQty;
        private String qaResult;
        private String salesOrderNo;
    }

    /**
     * 공정 중 발생 불량 한 줄.
     */
    @Getter
    @Setter
    @NoArgsConstructor
    public static class DefectItem {
        private String defectType;
        private String qty;
        private String occurTime;
        private String action;
    }
}
