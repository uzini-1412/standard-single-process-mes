-- ============================================================
-- 데모 시드 데이터 (opt-in, 수동 실행)
--
-- 클론 직후 DB가 비어 있으면 모든 화면이 빈 목록만 보여준다.
-- 기준정보 → 수주/발주 → 생산/가입고 → 재고 → 출하 순서로
-- 실제 업무 흐름을 그대로 따라가며 조회할 수 있도록 최소 데이터를 채운다.
-- schema.sql 과 달리 docker-entrypoint-initdb.d 에 자동 연결하지 않는다
-- (기존 데이터를 덮어쓰면 안 되므로 필요할 때만 수동으로 실행).
--
-- 실행:
--   docker exec -i mes-db mysql -u root -p<DB_PASSWORD> mes_db < mes_db/seed-demo.sql
--
-- 주의: item_cd / customer_cd / order_no 가 전부 UNIQUE라 재실행하면
-- 중복키 오류가 난다. 다시 채우려면 아래 표의 코드로 생성된 행을 먼저
-- 지우거나 테스트용 DB에서만 실행할 것.
-- ============================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ============================================================
-- 1. 기준정보 — 공통코드
-- ============================================================
-- 수동 테스트로 이미 같은 그룹코드가 들어있을 수 있어 IGNORE로 건너뛴다
-- (이미 있으면 이후 SELECT 서브쿼리가 기존 group_sq를 그대로 찾아 쓴다)
INSERT IGNORE INTO tb_common_group (group_code, group_name) VALUES
  ('제품구분', '제품구분'),
  ('계정구분', '계정구분'),
  ('창고구분', '창고구분'),
  ('포장분류', '포장분류'),
  ('부서분류', '부서분류'),
  ('직종분류', '직종분류'),
  ('직급분류', '직급분류'),
  ('국적분류', '국적분류'),
  ('결제조건', '결제조건'),
  ('라인구분', '라인구분');

INSERT INTO tb_common_detail (group_sq, detail_code, detail_name, use_yn, reg_dt, mod_dt) VALUES
  ((SELECT group_sq FROM tb_common_group WHERE group_code='제품구분'), 'FG',  '완제품', 1, NOW(), NOW()),
  ((SELECT group_sq FROM tb_common_group WHERE group_code='제품구분'), 'RM',  '원자재', 1, NOW(), NOW()),
  ((SELECT group_sq FROM tb_common_group WHERE group_code='제품구분'), 'SUB', '부자재', 1, NOW(), NOW()),
  ((SELECT group_sq FROM tb_common_group WHERE group_code='계정구분'), 'PROD', '제품',   1, NOW(), NOW()),
  ((SELECT group_sq FROM tb_common_group WHERE group_code='계정구분'), 'RAW',  '원재료', 1, NOW(), NOW()),
  ((SELECT group_sq FROM tb_common_group WHERE group_code='계정구분'), 'SUPP', '부재료', 1, NOW(), NOW()),
  ((SELECT group_sq FROM tb_common_group WHERE group_code='창고구분'), 'FG_WH',  '완제품창고', 1, NOW(), NOW()),
  ((SELECT group_sq FROM tb_common_group WHERE group_code='창고구분'), 'RM_WH',  '원자재창고', 1, NOW(), NOW()),
  ((SELECT group_sq FROM tb_common_group WHERE group_code='창고구분'), 'SUB_WH', '부자재창고', 1, NOW(), NOW()),
  ((SELECT group_sq FROM tb_common_group WHERE group_code='포장분류'), 'ROLL', '롤',   1, NOW(), NOW()),
  ((SELECT group_sq FROM tb_common_group WHERE group_code='포장분류'), 'BOX',  '박스', 1, NOW(), NOW()),
  ((SELECT group_sq FROM tb_common_group WHERE group_code='포장분류'), 'PLT',  '파렛트', 1, NOW(), NOW()),
  ((SELECT group_sq FROM tb_common_group WHERE group_code='부서분류'), 'PROD',  '생산부', 1, NOW(), NOW()),
  ((SELECT group_sq FROM tb_common_group WHERE group_code='부서분류'), 'QC',    '품질부', 1, NOW(), NOW()),
  ((SELECT group_sq FROM tb_common_group WHERE group_code='부서분류'), 'SALES', '영업부', 1, NOW(), NOW()),
  ((SELECT group_sq FROM tb_common_group WHERE group_code='부서분류'), 'PUR',   '구매부', 1, NOW(), NOW()),
  ((SELECT group_sq FROM tb_common_group WHERE group_code='직종분류'), 'PRODJ',  '생산직', 1, NOW(), NOW()),
  ((SELECT group_sq FROM tb_common_group WHERE group_code='직종분류'), 'QCJ',    '품질직', 1, NOW(), NOW()),
  ((SELECT group_sq FROM tb_common_group WHERE group_code='직종분류'), 'SALESJ', '영업직', 1, NOW(), NOW()),
  ((SELECT group_sq FROM tb_common_group WHERE group_code='직종분류'), 'MGMT',   '관리직', 1, NOW(), NOW()),
  ((SELECT group_sq FROM tb_common_group WHERE group_code='직급분류'), 'STAFF', '사원', 1, NOW(), NOW()),
  ((SELECT group_sq FROM tb_common_group WHERE group_code='직급분류'), 'ASST',  '대리', 1, NOW(), NOW()),
  ((SELECT group_sq FROM tb_common_group WHERE group_code='직급분류'), 'MGR',   '과장', 1, NOW(), NOW()),
  ((SELECT group_sq FROM tb_common_group WHERE group_code='직급분류'), 'GM',    '부장', 1, NOW(), NOW()),
  ((SELECT group_sq FROM tb_common_group WHERE group_code='국적분류'), 'KR', '한국',   1, NOW(), NOW()),
  ((SELECT group_sq FROM tb_common_group WHERE group_code='국적분류'), 'CN', '중국',   1, NOW(), NOW()),
  ((SELECT group_sq FROM tb_common_group WHERE group_code='국적분류'), 'VN', '베트남', 1, NOW(), NOW()),
  ((SELECT group_sq FROM tb_common_group WHERE group_code='결제조건'), 'CASH',  '현금',     1, NOW(), NOW()),
  ((SELECT group_sq FROM tb_common_group WHERE group_code='결제조건'), 'EOM',   '월말결제', 1, NOW(), NOW()),
  ((SELECT group_sq FROM tb_common_group WHERE group_code='결제조건'), 'NET60', '60일어음', 1, NOW(), NOW()),
  ((SELECT group_sq FROM tb_common_group WHERE group_code='라인구분'), 'L1', '1라인', 1, NOW(), NOW()),
  ((SELECT group_sq FROM tb_common_group WHERE group_code='라인구분'), 'L2', '2라인', 1, NOW(), NOW());

-- ============================================================
-- 2. 기준정보 — 거래처 (고객사 2 / 공급사 2)
-- ============================================================
INSERT INTO mes_customer_tb
  (customer_cd, customer_nm, owner_nm, biz_no, customer_type, reg_date, manager_nm, tel, email, address, use_yn, reg_dt, mod_dt)
VALUES
  ('CUST-001', '(주)한국신소재', '김대표', '123-45-67890', '고객사', '2026-01-10', '박영업', '02-1111-2222', 'sales@kshin.example.com', '경기도 화성시 산업로 10', 1, NOW(), NOW()),
  ('CUST-002', '대한패키징',     '이대표', '234-56-78901', '고객사', '2026-02-15', '최영업', '02-2222-3333', 'order@daehan.example.com', '인천시 서구 포장로 20', 1, NOW(), NOW()),
  ('SUPL-001', '영진화학',       '정대표', '345-67-89012', '공급사', '2025-11-01', '한구매', '031-444-5555', 'sale@youngjin.example.com', '충남 아산시 화학단지 5', 1, NOW(), NOW()),
  ('SUPL-002', '삼화머티리얼',   '오대표', '456-78-90123', '공급사', '2025-12-05', '서구매', '031-666-7777', 'sale@samhwa.example.com', '충북 음성군 소재로 15', 1, NOW(), NOW());

-- ============================================================
-- 3. 기준정보 — 품목 (완제품 3 / 원자재 4 / 부자재 3)
-- ============================================================
INSERT INTO mes_item_tb
  (item_cd, item_nm, item_type, item_type_code, customer_sq, customer_nm, account_type, packing_unit,
   item_spec, basis_weight, width, width_unit, length, weight, production_speed, safety_stock, optimal_stock,
   import_insp_gb, use_yn, reg_dt, mod_dt)
VALUES
  ('FG-001', 'PE 필름 100um',     '완제품', 'FG', (SELECT customer_sq FROM mes_customer_tb WHERE customer_cd='CUST-001'), '(주)한국신소재', '제품', '롤',
   '1000mm x 500m', 92,  1000, 'mm', 500, 46.0, 120, 50, 100, 0, 1, NOW(), NOW()),
  ('FG-002', 'PP 시트 0.3T',      '완제품', 'FG', (SELECT customer_sq FROM mes_customer_tb WHERE customer_cd='CUST-002'), '대한패키징',     '제품', '롤',
   '1200mm x 300m', 300, 1200, 'mm', 300, 108.0, 90, 30, 60, 0, 1, NOW(), NOW()),
  ('FG-003', '복합 포장재 A타입', '완제품', 'FG', NULL, NULL, '제품', '롤',
   '800mm x 400m',  150, 800,  'mm', 400, 48.0, 100, 40, 80, 0, 1, NOW(), NOW()),
  ('RM-001', 'PE 레진',           '원자재', 'RM', NULL, NULL, '원재료', '파렛트',
   '25kg/포대', NULL, NULL, 'kg', NULL, NULL, NULL, 1000, 3000, 1, 1, NOW(), NOW()),
  ('RM-002', 'PP 레진',           '원자재', 'RM', NULL, NULL, '원재료', '파렛트',
   '25kg/포대', NULL, NULL, 'kg', NULL, NULL, NULL, 800, 2500, 1, 1, NOW(), NOW()),
  ('RM-003', '안료 마스터배치',   '원자재', 'RM', NULL, NULL, '원재료', '파렛트',
   '20kg/포대', NULL, NULL, 'kg', NULL, NULL, NULL, 200, 600, 0, 1, NOW(), NOW()),
  ('RM-004', '접착제',            '원자재', 'RM', NULL, NULL, '원재료', '박스',
   '18kg/통', NULL, NULL, 'kg', NULL, NULL, NULL, 150, 500, 0, 1, NOW(), NOW()),
  ('SUB-001', '코어지',           '부자재', 'SUB', NULL, NULL, '부재료', '박스',
   '지관 1EA', NULL, NULL, 'EA', NULL, NULL, NULL, 500, 1500, 0, 1, NOW(), NOW()),
  ('SUB-002', '포장용 테이프',    '부자재', 'SUB', NULL, NULL, '부재료', '박스',
   '48mm x 50m', NULL, NULL, 'EA', NULL, NULL, NULL, 300, 1000, 0, 1, NOW(), NOW()),
  ('SUB-003', '파렛트',           '부자재', 'SUB', NULL, NULL, '부재료', '파렛트',
   '1100x1100', NULL, NULL, 'EA', NULL, NULL, NULL, 100, 300, 0, 1, NOW(), NOW());

INSERT INTO mes_item_spec_tb (item_sq, width, length, basis_weight, weight, safety_stock, spec_order, warehouse_loc, storage_loc, reg_dt)
VALUES
  ((SELECT item_sq FROM mes_item_tb WHERE item_cd='FG-001'), 1000, 500, 92,  46.0,  50, 1, '완제품창고', 'A-01', NOW()),
  ((SELECT item_sq FROM mes_item_tb WHERE item_cd='FG-002'), 1200, 300, 300, 108.0, 30, 1, '완제품창고', 'A-02', NOW()),
  ((SELECT item_sq FROM mes_item_tb WHERE item_cd='FG-003'), 800,  400, 150, 48.0,  40, 1, '완제품창고', 'A-03', NOW());

-- ============================================================
-- 4. 기준정보 — BOM (완제품별 구성)
-- ============================================================
INSERT INTO mes_bom_header_tb (bom_no, product_item_sq, use_yn, reg_dt, mod_dt) VALUES
  ('FG-202610-001', (SELECT item_sq FROM mes_item_tb WHERE item_cd='FG-001'), 1, NOW(), NOW()),
  ('FG-202610-002', (SELECT item_sq FROM mes_item_tb WHERE item_cd='FG-002'), 1, NOW(), NOW()),
  ('FG-202610-003', (SELECT item_sq FROM mes_item_tb WHERE item_cd='FG-003'), 1, NOW(), NOW());

INSERT INTO mes_bom_line_tb (bom_sq, component_item_sq, quantity, unit, seq, reg_dt, mod_dt) VALUES
  ((SELECT bom_sq FROM mes_bom_header_tb WHERE product_item_sq=(SELECT item_sq FROM mes_item_tb WHERE item_cd='FG-001')),
   (SELECT item_sq FROM mes_item_tb WHERE item_cd='RM-001'), 0.70, 'KG', 1, NOW(), NOW()),
  ((SELECT bom_sq FROM mes_bom_header_tb WHERE product_item_sq=(SELECT item_sq FROM mes_item_tb WHERE item_cd='FG-001')),
   (SELECT item_sq FROM mes_item_tb WHERE item_cd='RM-003'), 0.05, 'KG', 2, NOW(), NOW()),
  ((SELECT bom_sq FROM mes_bom_header_tb WHERE product_item_sq=(SELECT item_sq FROM mes_item_tb WHERE item_cd='FG-001')),
   (SELECT item_sq FROM mes_item_tb WHERE item_cd='SUB-001'), 1, 'EA', 3, NOW(), NOW()),
  ((SELECT bom_sq FROM mes_bom_header_tb WHERE product_item_sq=(SELECT item_sq FROM mes_item_tb WHERE item_cd='FG-002')),
   (SELECT item_sq FROM mes_item_tb WHERE item_cd='RM-002'), 0.90, 'KG', 1, NOW(), NOW()),
  ((SELECT bom_sq FROM mes_bom_header_tb WHERE product_item_sq=(SELECT item_sq FROM mes_item_tb WHERE item_cd='FG-002')),
   (SELECT item_sq FROM mes_item_tb WHERE item_cd='SUB-002'), 1, 'EA', 2, NOW(), NOW()),
  ((SELECT bom_sq FROM mes_bom_header_tb WHERE product_item_sq=(SELECT item_sq FROM mes_item_tb WHERE item_cd='FG-003')),
   (SELECT item_sq FROM mes_item_tb WHERE item_cd='RM-001'), 0.50, 'KG', 1, NOW(), NOW()),
  ((SELECT bom_sq FROM mes_bom_header_tb WHERE product_item_sq=(SELECT item_sq FROM mes_item_tb WHERE item_cd='FG-003')),
   (SELECT item_sq FROM mes_item_tb WHERE item_cd='RM-004'), 0.10, 'KG', 2, NOW(), NOW()),
  ((SELECT bom_sq FROM mes_bom_header_tb WHERE product_item_sq=(SELECT item_sq FROM mes_item_tb WHERE item_cd='FG-003')),
   (SELECT item_sq FROM mes_item_tb WHERE item_cd='SUB-003'), 1, 'EA', 3, NOW(), NOW());

-- ============================================================
-- 5. 수주 → 생산계획 → 작업지시 → 완제품재고 → 출하계획/출하지시
-- ============================================================
INSERT INTO mes_sales_order_tb
  (order_no, customer_sq, order_date, delivery_req_date, delivery_place, total_order_amt, payment_terms, order_status, tax_apply_yn, tax_rate, use_yn, reg_dt, mod_dt)
VALUES
  ('SO-202610-001', (SELECT customer_sq FROM mes_customer_tb WHERE customer_cd='CUST-001'), '2026-10-05', '2026-10-22', '경기도 화성시 산업로 10', 3300000.00, '월말결제', 'ORDERED', 1, 10.00, 1, NOW(), NOW()),
  ('SO-202610-002', (SELECT customer_sq FROM mes_customer_tb WHERE customer_cd='CUST-002'), '2026-10-08', '2026-10-25', '인천시 서구 포장로 20', 2970000.00, '월말결제', 'ORDERED', 1, 10.00, 1, NOW(), NOW());

INSERT INTO mes_sales_order_dtl_tb
  (order_sq, item_sq, order_qty, order_unit, unit_price, supply_amt, vat_amt, total_amt, spec, basis_weight, width, length, order_qty_ea, remark)
VALUES
  ((SELECT order_sq FROM mes_sales_order_tb WHERE order_no='SO-202610-001'), (SELECT item_sq FROM mes_item_tb WHERE item_cd='FG-001'),
   200, 'EA', 15000.00, 3000000.00, 300000.00, 3300000.00, '1000mm x 500m', 92, 1000, 500, 200, NULL),
  ((SELECT order_sq FROM mes_sales_order_tb WHERE order_no='SO-202610-002'), (SELECT item_sq FROM mes_item_tb WHERE item_cd='FG-002'),
   150, 'EA', 18000.00, 2700000.00, 270000.00, 2970000.00, '1200mm x 300m', 300, 1200, 300, 150, NULL);

INSERT INTO mes_production_plan_tb
  (plan_date, line_name, item_sq, plan_qty, weight, production_speed, estimated_production_time, current_stock, start_time, end_time, plan_status, reg_dt, mod_dt)
VALUES
  ('2026-10-10', '1라인', (SELECT item_sq FROM mes_item_tb WHERE item_cd='FG-001'), 200, 9200,  120, 100.0, 0, '08:00:00', '10:00:00', 'CONFIRM', NOW(), NOW()),
  ('2026-10-11', '2라인', (SELECT item_sq FROM mes_item_tb WHERE item_cd='FG-002'), 150, 16200, 90,  150.0, 0, '08:00:00', '11:00:00', 'WAIT',    NOW(), NOW());

INSERT INTO mes_work_order_tb
  (work_order_date, line_name, priority, item_sq, target_qty, prod_speed, basis_weight, manage_weight, plc_weight,
   total_width, total_weight, effective_width, estimated_production_time, lot_no, recipe, production_lot_no,
   work_start_time, work_end_time, work_status, use_yn, reg_dt, mod_dt)
VALUES
  ('2026-10-12', '1라인', '1', (SELECT item_sq FROM mes_item_tb WHERE item_cd='FG-001'), 200, 120, 92, 9200, 9150,
   1000, 9200, 980, 100.0, 'P1-202610-001', 'PE 필름 표준레시피', 'PR-202610-001',
   '2026-10-12 08:00:00', '2026-10-12 10:00:00', 'COMPLETED', 1, NOW(), NOW()),
  ('2026-10-13', '2라인', '2', (SELECT item_sq FROM mes_item_tb WHERE item_cd='FG-002'), 150, 90, 300, 0, 0,
   1200, 0, 1150, 150.0, 'P2-202610-001', 'PP 시트 표준레시피', 'PR-202610-002',
   '2026-10-13 09:00:00', NULL, 'IN_PROGRESS', 1, NOW(), NOW());

INSERT INTO mes_work_order_dtl_tb (work_order_sq, item_sq, lot_no, order_qty, width, length, effective_width, remark)
VALUES
  ((SELECT work_order_sq FROM mes_work_order_tb WHERE lot_no='P1-202610-001'), (SELECT item_sq FROM mes_item_tb WHERE item_cd='FG-001'),
   'P1-202610-001', 200, 1000, 500, 980, NULL),
  ((SELECT work_order_sq FROM mes_work_order_tb WHERE lot_no='P2-202610-001'), (SELECT item_sq FROM mes_item_tb WHERE item_cd='FG-002'),
   'P2-202610-001', 150, 1200, 300, 1150, NULL);

INSERT INTO mes_product_stock_tb (item_sq, lot_no, width, length, current_qty_m, current_qty_ea, storage_loc, stock_status, last_in_date, reg_dt)
VALUES
  ((SELECT item_sq FROM mes_item_tb WHERE item_cd='FG-001'), 'P1-202610-001', 1000, 500, 100000, 200, '완제품창고', 'AVAILABLE', '2026-10-12', NOW());

INSERT INTO mes_shipment_plan_tb
  (sales_order_dtl_sq, customer_sq, item_sq, plan_date, expected_ship_date, plan_qty, plan_qty_ea, lot_no,
   customer_code, customer_name, item_code, item_name, basis_weight, width, length, sales_order_qty, current_stock,
   storage_location, order_no, plan_status, reg_dt, mod_dt)
VALUES
  ((SELECT order_dtl_sq FROM mes_sales_order_dtl_tb WHERE order_sq=(SELECT order_sq FROM mes_sales_order_tb WHERE order_no='SO-202610-001')),
   (SELECT customer_sq FROM mes_customer_tb WHERE customer_cd='CUST-001'), (SELECT item_sq FROM mes_item_tb WHERE item_cd='FG-001'),
   '2026-10-15', '2026-10-22', 200, 200, 'P1-202610-001', 'CUST-001', '(주)한국신소재', 'FG-001', 'PE 필름 100um',
   92, 1000, 500, 200, 200, '완제품창고', 'SO-202610-001', 'ORDERED', NOW(), NOW());

INSERT INTO mes_shipment_order_tb (customer_sq, expected_ship_date, expected_ship_time, destination, customer_req, order_status, use_yn, reg_dt, mod_dt)
VALUES
  ((SELECT customer_sq FROM mes_customer_tb WHERE customer_cd='CUST-001'), '2026-10-22', '09:00:00', '(주)한국신소재 물류센터', '파손주의', 'READY', 1, NOW(), NOW());

INSERT INTO mes_shipment_order_dtl_tb
  (ship_order_sq, plan_sq, item_sq, product_lot_no, order_qty, order_qty_ea,
   customer_code, customer_name, item_code, item_name, basis_weight, width, length, sales_order_qty, current_stock,
   storage_location, ship_status)
VALUES
  ((SELECT ship_order_sq FROM mes_shipment_order_tb WHERE destination='(주)한국신소재 물류센터' AND expected_ship_date='2026-10-22'),
   (SELECT plan_sq FROM mes_shipment_plan_tb WHERE order_no='SO-202610-001' AND item_sq=(SELECT item_sq FROM mes_item_tb WHERE item_cd='FG-001')),
   (SELECT item_sq FROM mes_item_tb WHERE item_cd='FG-001'), 'P1-202610-001', 200, 200,
   'CUST-001', '(주)한국신소재', 'FG-001', 'PE 필름 100um', 92, 1000, 500, 200, 200, '완제품창고', 'WAIT');

-- ============================================================
-- 6. 발주 → 가입고(수입검사 WAIT/PASS) → 자재재고
-- ============================================================
INSERT INTO mes_purchase_order_tb
  (order_no, customer_sq, order_date, in_req_date, payment_terms, total_order_amt, order_status,
   tax_apply_yn, tax_rate, req_material_cert_yn, req_trans_spec_yn, use_yn, reg_dt, mod_dt)
VALUES
  ('PO-202610-001', (SELECT customer_sq FROM mes_customer_tb WHERE customer_cd='SUPL-001'), '2026-10-01', '2026-10-06', '월말결제', 7040000.00, 'ORDERED', 1, 10.00, 1, 0, 1, NOW(), NOW()),
  ('PO-202610-002', (SELECT customer_sq FROM mes_customer_tb WHERE customer_cd='SUPL-002'), '2026-10-02', '2026-10-04', '월말결제', 4400000.00, 'ORDERED', 1, 10.00, 0, 0, 1, NOW(), NOW()),
  ('PO-202610-003', (SELECT customer_sq FROM mes_customer_tb WHERE customer_cd='SUPL-001'), '2026-10-05', '2026-10-09', '월말결제', 4785000.00, 'ORDERED', 1, 10.00, 1, 0, 1, NOW(), NOW());

INSERT INTO mes_purchase_order_dtl_tb (order_sq, item_sq, order_qty, order_unit, unit_price, supply_amt, vat_amt, total_amt, spec, remark)
VALUES
  ((SELECT order_sq FROM mes_purchase_order_tb WHERE order_no='PO-202610-001'), (SELECT item_sq FROM mes_item_tb WHERE item_cd='RM-001'),
   2000, 'KG', 3200.00, 6400000.00, 640000.00, 7040000.00, '25kg/포대', NULL),
  ((SELECT order_sq FROM mes_purchase_order_tb WHERE order_no='PO-202610-002'), (SELECT item_sq FROM mes_item_tb WHERE item_cd='RM-003'),
   500, 'KG', 8000.00, 4000000.00, 400000.00, 4400000.00, '20kg/포대', NULL),
  ((SELECT order_sq FROM mes_purchase_order_tb WHERE order_no='PO-202610-003'), (SELECT item_sq FROM mes_item_tb WHERE item_cd='RM-002'),
   1500, 'KG', 2900.00, 4350000.00, 435000.00, 4785000.00, '25kg/포대', NULL);

-- RM-001 (수입검사 대상): 가입고 등록 후 검사 대기중
INSERT INTO mes_material_inbound_tb
  (order_dtl_sq, item_sq, inbound_date, inbound_qty, inspect_qty, lot_no, purchase_lot_no, inbound_type,
   inspect_status, stock_status, inspect_lot_no, packing_qty, packing_unit, lot_qty, use_yn, reg_dt, mod_dt)
VALUES
  ((SELECT order_dtl_sq FROM mes_purchase_order_dtl_tb WHERE order_sq=(SELECT order_sq FROM mes_purchase_order_tb WHERE order_no='PO-202610-001')),
   (SELECT item_sq FROM mes_item_tb WHERE item_cd='RM-001'), '2026-10-06', 2000, 2000, 'LOT-20261006-001', 'RM-202610-영진화학-001', 'REGISTER',
   'WAIT', 'INSPECTING', 'IS-20261006-01', 80, '파렛트', 1, 1, NOW(), NOW());

-- RM-003 (무검사 품목): 즉시 가용재고로 전환
INSERT INTO mes_material_inbound_tb
  (order_dtl_sq, item_sq, inbound_date, inbound_qty, lot_no, purchase_lot_no, inbound_type,
   inspect_status, stock_status, passed_qty, rejected_qty, packing_qty, packing_unit, lot_qty, use_yn, reg_dt, mod_dt)
VALUES
  ((SELECT order_dtl_sq FROM mes_purchase_order_dtl_tb WHERE order_sq=(SELECT order_sq FROM mes_purchase_order_tb WHERE order_no='PO-202610-002')),
   (SELECT item_sq FROM mes_item_tb WHERE item_cd='RM-003'), '2026-10-04', 500, 'LOT-20261004-001', 'RM-202610-삼화머티리얼-001', 'REGISTER',
   'PASS', 'AVAILABLE', 500, 0, 25, '파렛트', 1, 1, NOW(), NOW());

-- RM-002 (수입검사 대상): 검사 완료 후 합격 처리된 사례
INSERT INTO mes_material_inbound_tb
  (order_dtl_sq, item_sq, inbound_date, inbound_qty, inspect_qty, lot_no, purchase_lot_no, inbound_type,
   inspect_status, stock_status, inspect_lot_no, inspect_no, inspector_name, inspect_date, passed_qty, rejected_qty,
   packing_qty, packing_unit, lot_qty, use_yn, reg_dt, mod_dt)
VALUES
  ((SELECT order_dtl_sq FROM mes_purchase_order_dtl_tb WHERE order_sq=(SELECT order_sq FROM mes_purchase_order_tb WHERE order_no='PO-202610-003')),
   (SELECT item_sq FROM mes_item_tb WHERE item_cd='RM-002'), '2026-10-09', 1500, 1500, 'LOT-20261009-001', 'RM-202610-영진화학-002', 'REGISTER',
   'PASS', 'AVAILABLE', 'IS-20261009-01', 'INSP-20261009-01', '김품질', '2026-10-10', 1500, 0, 60, '파렛트', 1, 1, NOW(), NOW());

-- 가용(AVAILABLE) 판정이 난 두 LOT만 자재재고로 실체화
INSERT INTO mes_material_stock_tb (item_sq, lot_no, current_qty, reserved_qty, warehouse_loc, stock_status, last_in_date, reg_dt, mod_dt)
VALUES
  ((SELECT item_sq FROM mes_item_tb WHERE item_cd='RM-002'), 'RM-202610-영진화학-002', 1500, 0, '원자재창고', 'AVAILABLE', '2026-10-09', NOW(), NOW()),
  ((SELECT item_sq FROM mes_item_tb WHERE item_cd='RM-003'), 'RM-202610-삼화머티리얼-001', 500, 0, '원자재창고', 'AVAILABLE', '2026-10-04', NOW(), NOW());
