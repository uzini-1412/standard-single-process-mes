package com.mes.domain.customer.repository;

import com.mes.domain.customer.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {

    boolean existsByCustomerCode(String customerCode);

    Optional<Customer> findByCustomerCode(String customerCode);

    /**
     * 거래처 검색. 넘어온 파라미터가 null 이면 해당 조건을 건너뛰고, 값이 있는 것만 AND 로 묶는다.
     * keyword 는 거래처명/코드/사업자번호를 부분일치로 동시에 훑는다. 결과는 거래처명 오름차순.
     */
    @Query("""
            SELECT c FROM Customer c
            WHERE (:keyword IS NULL OR c.customerName LIKE %:keyword% OR c.customerCode LIKE %:keyword% OR c.businessNo LIKE %:keyword%)
              AND (:partnerKind IS NULL OR c.partnerKind = :partnerKind)
              AND (:activeYn IS NULL OR c.activeYn = :activeYn)
            ORDER BY c.customerName ASC
            """)
    List<Customer> findBySearchCondition(
            @Param("keyword") String keyword,
            @Param("partnerKind") String partnerKind,
            @Param("activeYn") Boolean activeYn);
}
