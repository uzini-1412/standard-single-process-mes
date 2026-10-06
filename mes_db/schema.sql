SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ============================================================
-- 시스템 설정 (기능 플래그) — STANDARDIZATION.md §10
--   부팅 시 /api/system/config 로 프론트에 전달되어 메뉴/화면 구성을 분기한다.
-- ============================================================
CREATE TABLE IF NOT EXISTS mes_system_config_tb (
  config_key   varchar(100) NOT NULL COMMENT '설정 키',
  config_value varchar(255) NULL     COMMENT '설정 값',
  description  varchar(255) NULL     COMMENT '설명',
  PRIMARY KEY (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO mes_system_config_tb (config_key, config_value, description) VALUES
  ('bom.mode',              'ASSEMBLY', 'BOM 유형: ASSEMBLY | RECIPE'),
  ('material.consume.mode', 'MANUAL',   '자재투입: MANUAL | BACKFLUSH'),
  ('module.equipment',      'Y',        '설비관리 모듈 표시: Y | N'),
  ('module.instrument',     'Y',        '계측기관리 모듈 표시: Y | N'),
  ('module.erp',            'SELF',     'ERP: SELF | EXTERNAL | OFF'),
  ('erp.external.url',      '',         'module.erp=EXTERNAL 일 때 연결할 외부 ERP URL');

-- MES_DB.MES_CUSTOMER_TB definition (Spring Boot 관리 테이블 - ddl-auto=update로 자동 생성)

CREATE TABLE IF NOT EXISTS `mes_customer_tb` (
  `customer_sq` bigint NOT NULL AUTO_INCREMENT COMMENT '거래처 PK',
  `customer_cd` varchar(50) NOT NULL UNIQUE COMMENT '거래처번호',
  `customer_nm` varchar(50) NOT NULL COMMENT '거래처명',
  `owner_nm` varchar(50) DEFAULT NULL COMMENT '대표자명',
  `biz_no` varchar(50) DEFAULT NULL COMMENT '사업자번호',
  `customer_type` varchar(30) DEFAULT NULL COMMENT '거래처구분',
  `reg_date` date DEFAULT NULL COMMENT '등록일자',
  `manager_nm` varchar(50) DEFAULT NULL COMMENT '담당자명',
  `tel` varchar(20) DEFAULT NULL COMMENT '전화번호',
  `email` varchar(100) DEFAULT NULL COMMENT '이메일',
  `fax` varchar(20) DEFAULT NULL COMMENT '팩스번호',
  `address` varchar(200) DEFAULT NULL COMMENT '주소',
  `remark` varchar(500) DEFAULT NULL COMMENT '비고',
  `file_paths` longtext DEFAULT NULL COMMENT '첨부파일 경로 JSON (최대 3개)',
  `use_yn` tinyint(1) DEFAULT '1' COMMENT '사용유무',
  `reg_dt` datetime DEFAULT NULL COMMENT '등록일자',
  `mod_dt` datetime DEFAULT NULL COMMENT '수정일시',
  PRIMARY KEY (`customer_sq`),
  KEY `idx_customer_cd` (`customer_cd`),
  KEY `idx_customer_nm` (`customer_nm`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ============================================================
-- 품목구성(BOM) — 레시피정보관리를 일반화 (STANDARDIZATION.md §6)
--   bom.mode=ASSEMBLY 면 quantity/unit/seq, RECIPE 면 ratio/평량/PLC호기/소재구분 사용.
--   line.component_item_sq 가 또 자기 header 를 가지면 다단계 전개.
-- ============================================================
CREATE TABLE IF NOT EXISTS `mes_bom_header_tb` (
  `bom_sq` bigint NOT NULL AUTO_INCREMENT COMMENT 'BOM PK',
  `bom_no` varchar(20) DEFAULT NULL COMMENT 'BOM 번호 ({itemTypeCode}-YYYYMM-001)',
  `product_item_sq` bigint NOT NULL COMMENT '완제품 품목 FK',
  `use_yn` tinyint(1) DEFAULT 1 COMMENT '사용여부',
  `reg_dt` datetime DEFAULT NULL COMMENT '등록일시',
  `mod_dt` datetime DEFAULT NULL COMMENT '수정일시',
  PRIMARY KEY (`bom_sq`),
  UNIQUE KEY `uk_bom_product` (`product_item_sq`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `mes_bom_line_tb` (
  `bom_line_sq` bigint NOT NULL AUTO_INCREMENT COMMENT 'BOM 라인 PK',
  `bom_sq` bigint NOT NULL COMMENT 'BOM 헤더 FK',
  `component_item_sq` bigint NOT NULL COMMENT '구성품(원료/부품) 품목 FK',
  `quantity` double DEFAULT NULL COMMENT '소요량 (코어)',
  `unit` varchar(20) DEFAULT NULL COMMENT '단위 (코어)',
  `seq` int DEFAULT NULL COMMENT '순번 (코어)',
  `ratio` double DEFAULT NULL COMMENT '비중(%) (배합형)',
  `basis_weight` double DEFAULT NULL COMMENT '평량(g/m²) (배합형)',
  `plc_machine_no` varchar(20) DEFAULT NULL COMMENT 'PLC 호기 (배합형)',
  `material_type` varchar(50) DEFAULT NULL COMMENT '소재구분 (배합형)',
  `remark` varchar(500) DEFAULT NULL COMMENT '비고',
  `reg_dt` datetime DEFAULT NULL COMMENT '등록일시',
  `mod_dt` datetime DEFAULT NULL COMMENT '수정일시',
  PRIMARY KEY (`bom_line_sq`),
  UNIQUE KEY `uk_bom_line_component` (`bom_sq`, `component_item_sq`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- MES_DB.MES_FACILITY_HISTORY_TB definition

CREATE TABLE `mes_facility_history_tb` (
  `facilityhis_sq` int(11) NOT NULL AUTO_INCREMENT COMMENT '설비이력 PK',
  `facility_sq` int(11) NOT NULL COMMENT '설비 FK',
  `his_gb` varchar(10) DEFAULT '' COMMENT '이력구분',
  `his_content` varchar(100) DEFAULT '' COMMENT '이력 내용',
  `his_customer` varchar(30) DEFAULT '' COMMENT '이력 거래처',
  `his_tel` varchar(30) DEFAULT '' COMMENT '이력 연락처',
  `his_money` varchar(15) DEFAULT '' COMMENT '이력 금액',
  `his_dt` date DEFAULT NULL COMMENT '이력일시',
  `occur_date` date DEFAULT NULL COMMENT '발생일자',
  `occur_content` varchar(255) DEFAULT NULL COMMENT '발생내용',
  `action_type` varchar(255) DEFAULT NULL COMMENT '조치구분',
  `action_date` date DEFAULT NULL COMMENT '조치일자',
  `action_time` varchar(255) DEFAULT NULL COMMENT '조치시간',
  `action_content` varchar(255) DEFAULT NULL COMMENT '조치내용',
  `action_manager` varchar(255) DEFAULT NULL COMMENT '조치책임자',
  `action_cost` decimal(15,2) DEFAULT NULL COMMENT '조치비용',
  `remark` varchar(255) DEFAULT NULL COMMENT '비고',
  `history_no` varchar(255) DEFAULT NULL COMMENT '관리번호',
  `use_yn` tinyint(1) DEFAULT NULL COMMENT '사용유무',
  `reg_dt` datetime(6) DEFAULT NULL COMMENT '등록일자',
  `mod_dt` datetime(6) DEFAULT NULL COMMENT '수정일시',
  PRIMARY KEY (`facilityhis_sq`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8;

-- MES_DB.MES_FACILITY_TB definition

CREATE TABLE `mes_facility_tb` (
  `facility_sq` int(11) NOT NULL AUTO_INCREMENT COMMENT '설비 PK',
  `manage_no` varchar(255) NOT NULL COMMENT '설비번호',
  `facility_name` varchar(255) NOT NULL COMMENT '설비명',
  `facility_type` varchar(255) DEFAULT NULL COMMENT '제품구분',
  `model_nm` varchar(255) DEFAULT NULL COMMENT '모델명',
  `spec` varchar(255) DEFAULT NULL COMMENT '규격',
  `maker_nm` varchar(255) DEFAULT NULL COMMENT '제작사',
  `manufacture_date` date DEFAULT NULL COMMENT '제작일자',
  `supplier_nm` varchar(255) DEFAULT NULL COMMENT '구입처',
  `purchase_date` date DEFAULT NULL COMMENT '구입일자',
  `purchase_price` decimal(15,2) DEFAULT NULL COMMENT '구입금액',
  `purchase_manager` varchar(255) DEFAULT NULL COMMENT '구입 담당자',
  `purchase_tel` varchar(255) DEFAULT NULL COMMENT '구입처 연락처',
  `manage_dept` varchar(255) DEFAULT NULL COMMENT '관리부서',
  `manager_nm` varchar(255) DEFAULT NULL COMMENT '담당자명',
  `manager_tel` varchar(255) DEFAULT NULL COMMENT '담당자 연락처',
  `as_company` varchar(255) DEFAULT NULL COMMENT 'AS업체명',
  `as_manager` varchar(255) DEFAULT NULL COMMENT 'AS 담당자',
  `as_tel` varchar(255) DEFAULT NULL COMMENT 'AS 연락처',
  `line_sq` bigint DEFAULT NULL COMMENT '라인 FK',
  `process_sq` bigint DEFAULT NULL COMMENT '공정 FK',
  `install_place` varchar(255) DEFAULT NULL COMMENT '설치 장소',
  `remark` varchar(255) DEFAULT NULL COMMENT '비고',
  `img_paths` longtext DEFAULT NULL COMMENT '이미지 경로',
  `purpose` varchar(255) DEFAULT NULL COMMENT '용도',
  `dispose_date` date DEFAULT NULL COMMENT '폐기일자',
  `attach_file_nm` varchar(255) DEFAULT NULL COMMENT '첨부',
  `attach_file_content` longtext DEFAULT NULL COMMENT '첨부파일 내용',
  `line_nm` varchar(255) DEFAULT NULL COMMENT '라인구분',
  `process_nm` varchar(255) DEFAULT NULL COMMENT '사용공정',
  `use_yn` tinyint(1) DEFAULT NULL COMMENT '사용유무',
  `reg_dt` datetime(6) DEFAULT NULL COMMENT '등록일자',
  `mod_dt` datetime(6) DEFAULT NULL COMMENT '수정일시',
  PRIMARY KEY (`facility_sq`),
  UNIQUE KEY `uk_mes_facility_tb_manage_no` (`manage_no`)
) ENGINE=InnoDB AUTO_INCREMENT=64 DEFAULT CHARSET=utf8;

-- MES_DB.MES_ITEM_TB definition (Spring Boot 관리 테이블 - ddl-auto=update로 자동 생성)

CREATE TABLE IF NOT EXISTS `mes_item_tb` (
  `item_sq` bigint NOT NULL AUTO_INCREMENT COMMENT '품목 PK',
  `item_cd` varchar(50) NOT NULL UNIQUE COMMENT '품번',
  `item_nm` varchar(100) NOT NULL COMMENT '품명',
  `item_type` varchar(50) DEFAULT NULL COMMENT '제품구분',
  `item_type_code` varchar(20) DEFAULT NULL COMMENT '제품구분 코드 - 등록 시 공통정보 detailCode 확정 저장',
  `customer_sq` bigint DEFAULT NULL COMMENT '거래처 FK',
  `customer_nm` varchar(100) DEFAULT NULL COMMENT '거래처명',
  `account_type` varchar(50) DEFAULT NULL COMMENT '계정구분',
  `packing_unit` varchar(50) DEFAULT NULL COMMENT '포장단위',
  `item_spec` varchar(100) DEFAULT NULL COMMENT '규격',
  `basis_weight` double DEFAULT NULL COMMENT '평량',
  `width` double DEFAULT NULL COMMENT '폭',
  `width_unit` varchar(20) DEFAULT NULL COMMENT '폭단위',
  `length` double DEFAULT NULL COMMENT '길이',
  `weight` double DEFAULT NULL COMMENT '중량',
  `color` varchar(50) DEFAULT NULL COMMENT '색상',
  `production_speed` double DEFAULT NULL COMMENT '생산속도',
  `safety_stock` int DEFAULT NULL COMMENT '적정재고량',
  `optimal_stock` int DEFAULT NULL COMMENT '최적재고량',
  `import_insp_gb` tinyint(1) DEFAULT NULL COMMENT '수입검사유무',
  `remark` varchar(500) DEFAULT NULL COMMENT '비고',
  `img_paths` longtext DEFAULT NULL COMMENT '이미지 경로 JSON',
  `use_yn` tinyint(1) DEFAULT '1' COMMENT '사용유무',
  `reg_dt` datetime DEFAULT NULL COMMENT '등록일자',
  `mod_dt` datetime DEFAULT NULL COMMENT '수정일시',
  PRIMARY KEY (`item_sq`),
  KEY `idx_item_cd` (`item_cd`),
  KEY `idx_item_nm` (`item_nm`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- MES_DB.MES_NOTICE_TB definition

CREATE TABLE `mes_notice_tb` (
  `notice_sq` int(11) NOT NULL AUTO_INCREMENT COMMENT '공지 PK',
  `notice_tle` varchar(100) DEFAULT NULL COMMENT '제목',
  `notice_ctt` varchar(500) DEFAULT NULL COMMENT '내용',
  `notice_st` tinyint(1) DEFAULT '0' COMMENT '상태',
  `reg_dt` date DEFAULT NULL COMMENT '등록일자',
  PRIMARY KEY (`notice_sq`)
) ENGINE=InnoDB AUTO_INCREMENT=775 DEFAULT CHARSET=utf8;

-- MES_DB.MES_STAFFINFO_TB definition

CREATE TABLE `mes_staffinfo_tb` (
  `staff_sq` int(11) NOT NULL AUTO_INCREMENT COMMENT '사원 ID',
  `user_id` varchar(30) DEFAULT NULL COMMENT '아이디',
  `user_pw` varchar(255) DEFAULT NULL COMMENT '비밀번호',
  `role` varchar(20) DEFAULT NULL COMMENT '권한',
  `staff_no` varchar(45) DEFAULT NULL COMMENT '사원번호',
  `staff_nm` varchar(20) NOT NULL COMMENT '성명',
  `jobtype_no` varchar(20) DEFAULT NULL COMMENT '직종',
  `dept_no` varchar(20) DEFAULT NULL COMMENT '부서',
  `rank_no` varchar(20) DEFAULT NULL COMMENT '직급',
  `nation_no` varchar(20) DEFAULT NULL COMMENT '국적',
  `companyjoin_dt` date DEFAULT NULL COMMENT '입사일자',
  `mobile_no` varchar(20) DEFAULT NULL COMMENT '연락처',
  `address` varchar(200) DEFAULT NULL COMMENT '주소',
  `address_detail` varchar(200) DEFAULT NULL COMMENT '상세주소',
  `gender` varchar(10) DEFAULT NULL COMMENT '성별',
  `leave_dt` date DEFAULT NULL COMMENT '퇴사일자',
  `staff_sign` mediumblob COMMENT '사원 서명',
  `qc_gb` tinyint(1) NOT NULL DEFAULT '0' COMMENT '품질 구분',
  `eval_path` varchar(100) DEFAULT NULL COMMENT '평가표 경로',
  `etc` varchar(200) DEFAULT NULL COMMENT '비고',
  `staff_pic` mediumblob COMMENT '사원 사진',
  `use_gb` tinyint(1) DEFAULT NULL COMMENT '사용(재직) 유무',
  `eval_gb` tinyint(1) DEFAULT NULL COMMENT '평가 유무',
  `cert_gb` tinyint(1) DEFAULT NULL COMMENT '자격인증 여부 (신규 추가)',
  PRIMARY KEY (`staff_sq`)
) ENGINE=InnoDB AUTO_INCREMENT=65 DEFAULT CHARSET=utf8;

-- MES_DB.MES_MENU_TB definition

CREATE TABLE `mes_menu_tb` (
  `menu_sq` int(11) NOT NULL AUTO_INCREMENT COMMENT '메뉴 PK',
  `menu_code` varchar(50) NOT NULL COMMENT '메뉴코드',
  `menu_name` varchar(100) NOT NULL COMMENT '메뉴명',
  `parent_menu_sq` int(11) DEFAULT NULL COMMENT '상위 메뉴 FK',
  `sort_order` int(11) DEFAULT NULL COMMENT '정렬 순서',
  `use_yn` varchar(1) DEFAULT 'Y' COMMENT '사용유무',
  PRIMARY KEY (`menu_sq`),
  UNIQUE KEY `uk_menu_code` (`menu_code`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

-- MES_DB.MES_MENU_TB data (matches MENU_STRUCTURE in frontend)
-- 대분류 메뉴 (parent_menu_sq = NULL)
INSERT INTO `mes_menu_tb` (`menu_sq`, `menu_code`, `menu_name`, `parent_menu_sq`, `sort_order`, `use_yn`) VALUES
(1,  'sales',        '고객주문관리',        NULL, 10, 'Y'),
(2,  'material',     '자재관리',           NULL, 20, 'Y'),
(3,  'production',   '생산관리',           NULL, 30, 'Y'),
(4,  'quality',      '품질관리',           NULL, 40, 'Y'),
(5,  'shipping',     '출하관리',           NULL, 50, 'Y'),
(6,  'equipment',    '설비관리',           NULL, 60, 'Y'),
(7,  'measuring',    '계측기관리',          NULL, 70, 'Y'),
(8,  'company-info', '기업자원관리(ERP)',   NULL, 80, 'Y'),
(9,  'master',       '기준정보관리',        NULL, 90, 'Y');

-- 세부 메뉴 (고객주문관리)
INSERT INTO `mes_menu_tb` (`menu_sq`, `menu_code`, `menu_name`, `parent_menu_sq`, `sort_order`, `use_yn`) VALUES
(10, 'order',                    '수주정보',          1, 101, 'Y');

-- 세부 메뉴 (자재관리)
INSERT INTO `mes_menu_tb` (`menu_sq`, `menu_code`, `menu_name`, `parent_menu_sq`, `sort_order`, `use_yn`) VALUES
(11, 'purchase-order-status',    '발주관리',          2, 201, 'Y'),
(12, 'pre-receiving-status',     '가입고관리',         2, 202, 'Y'),
(13, 'receiving-status',         '입고현황',          2, 203, 'Y'),
(14, 'material-inventory-status','자재재고현황',       2, 204, 'Y'),
(15, 'material-defect-status',   '자재불량현황',       2, 205, 'Y'),
(16, 'raw-material-usage',       '원소재사용현황',      2, 206, 'Y');

-- 세부 메뉴 (생산관리)
INSERT INTO `mes_menu_tb` (`menu_sq`, `menu_code`, `menu_name`, `parent_menu_sq`, `sort_order`, `use_yn`) VALUES
(17, 'production-requirement',   '생산소요량산출',      3, 301, 'Y'),
(18, 'production-plan',          '생산계획',           3, 302, 'Y'),
(19, 'work-order',               '작업지시등록',        3, 303, 'Y'),
(20, 'work-performance-status',  '생산일보',           3, 304, 'Y'),
(21, 'product-defect-status',    '기간별불량현황',      3, 305, 'Y'),
(22, 'non-operation-status',     '기간별비가동현황',     3, 306, 'Y'),
(59, 'facility-operation',       '설비가동관리',        3, 309, 'Y'),
(60, 'production-trend',         '생산추이도',          3, 310, 'Y');

-- 세부 메뉴 (품질관리)
INSERT INTO `mes_menu_tb` (`menu_sq`, `menu_code`, `menu_name`, `parent_menu_sq`, `sort_order`, `use_yn`) VALUES
(24, 'incoming-inspection',      '입고검사',           4, 401, 'Y'),
(25, 'self-inspection',          '공정검사현황',        4, 402, 'Y'),
(26, 'shipping-inspection',      '출하검사',           4, 403, 'Y'),
(27, 'non-conformance',          '부적합관리',          4, 404, 'Y');

-- 세부 메뉴 (출하관리)
INSERT INTO `mes_menu_tb` (`menu_sq`, `menu_code`, `menu_name`, `parent_menu_sq`, `sort_order`, `use_yn`) VALUES
(28, 'shipping-plan',            '출하계획',           5, 501, 'Y'),
(29, 'shipping-order',           '출하지시관리',        5, 502, 'Y'),
(30, 'shipping-performance',     '출하관리',           5, 503, 'Y'),
(31, 'product-inventory',        '제품재고현황',        5, 504, 'Y'),
(32, 'product-inventory-analysis','제품재고분석',        5, 505, 'Y'),
(33, 'product-location',         '제품창고입고현황',     5, 506, 'Y');

-- 세부 메뉴 (설비관리)
INSERT INTO `mes_menu_tb` (`menu_sq`, `menu_code`, `menu_name`, `parent_menu_sq`, `sort_order`, `use_yn`) VALUES
(34, 'equipment-info',           '설비정보관리',        6, 601, 'Y'),
(35, 'daily-inspection',         '일상점검정의서',      6, 602, 'Y'),
(36, 'daily-inspection-result',  '일상점검현황',        6, 603, 'Y'),
(37, 'periodic-inspection',      '정기점검',           6, 604, 'Y'),
(38, 'equipment-history',        '설비이력관리',        6, 605, 'Y'),
(39, 'equipment-history-card',   '설비이력카드',        6, 606, 'Y'),
(40, 'spare-parts',              '설비예비품관리',      6, 607, 'Y');

-- 세부 메뉴 (계측기관리)
INSERT INTO `mes_menu_tb` (`menu_sq`, `menu_code`, `menu_name`, `parent_menu_sq`, `sort_order`, `use_yn`) VALUES
(41, 'instrument-management',        '계측기등록',        7, 701, 'Y'),
(42, 'instrument-history-management','검교정이력등록',     7, 702, 'Y'),
(43, 'instrument-history-card',      '계측기이력카드',     7, 703, 'Y');

-- 세부 메뉴 (기업자원관리(ERP))
INSERT INTO `mes_menu_tb` (`menu_sq`, `menu_code`, `menu_name`, `parent_menu_sq`, `sort_order`, `use_yn`) VALUES
(44, 'sales-management',         '매출관리',           8, 801, 'Y'),
(45, 'purchase-management',      '거래처원장',          8, 802, 'Y'),
(46, 'collection-management',    '자금관리',           8, 803, 'Y'),
(56, 'unit-price-standard',      '단가기준정보',        8, 804, 'Y');

-- 세부 메뉴 (기준정보관리)
INSERT INTO `mes_menu_tb` (`menu_sq`, `menu_code`, `menu_name`, `parent_menu_sq`, `sort_order`, `use_yn`) VALUES
(47, 'common-info',              '공통정보관리',        9, 901, 'Y'),
(48, 'employee-info',            '직원정보관리',        9, 902, 'Y'),
(49, 'user-authority-info',      '사용자정보관리',      9, 903, 'Y'),
(50, 'item-info',                '품목정보관리',        9, 904, 'Y'),
(51, 'client-info',              '거래처정보관리',      9, 905, 'Y'),
(52, 'bom-info',                '품목구성(BOM)관리',    9, 906, 'Y'),
(54, 'inventory-adjustment',     '재고조정관리',        9, 908, 'Y'),
(55, 'inspection-standard',      '검사표준관리',        9, 909, 'Y'),
(57, 'notice',                   '공지사항관리',        9, 911, 'Y');

-- MES_DB.MES_STAFF_MENU_AUTH_TB definition

CREATE TABLE `mes_staff_menu_auth_tb` (
  `auth_sq` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '권한 PK',
  `staff_sq` bigint(20) NOT NULL COMMENT '사원 ID',
  `menu_sq` int(11) NOT NULL COMMENT '메뉴 FK',
  `create_auth` tinyint(1) DEFAULT '0' COMMENT '등록',
  `read_auth` tinyint(1) DEFAULT '0' COMMENT '읽기',
  `update_auth` tinyint(1) DEFAULT '0' COMMENT '수정',
  `delete_auth` tinyint(1) DEFAULT '0' COMMENT '삭제',
  PRIMARY KEY (`auth_sq`),
  UNIQUE KEY `uk_staff_menu` (`staff_sq`, `menu_sq`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

-- MES_DB.MES_USER_ACTIVITY_LOG_TB definition
-- 사용자 활동 이력 (로그인/로그아웃/메뉴접근/CRUD/상세조회)
-- AOP 자동 캡처 + FE 라우팅 가드 + AuthService 수동 기록
CREATE TABLE `mes_user_activity_log_tb` (
  `activity_log_sq` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '활동 이력 PK',
  `staff_sq` bigint(20) DEFAULT NULL COMMENT '직원 FK (로그인 실패 시 NULL 가능)',
  `user_id` varchar(50) DEFAULT NULL COMMENT '로그인 ID 스냅샷',
  `staff_name` varchar(50) DEFAULT NULL COMMENT '직원명 스냅샷',
  `action_type` varchar(20) NOT NULL COMMENT 'LOGIN/LOGIN_FAIL/LOGOUT/MENU_ACCESS/CREATE/UPDATE/DELETE/READ_DETAIL',
  `menu_sq` int(11) DEFAULT NULL COMMENT '메뉴 FK',
  `menu_code` varchar(50) DEFAULT NULL COMMENT '메뉴 코드(슬러그) 스냅샷',
  `menu_name` varchar(100) DEFAULT NULL COMMENT '메뉴명 스냅샷',
  `target_id` varchar(100) DEFAULT NULL COMMENT '대상 식별자 (PK 또는 비즈니스 키)',
  `request_uri` varchar(255) DEFAULT NULL COMMENT '호출 URL',
  `http_method` varchar(10) DEFAULT NULL COMMENT 'GET/POST/PUT/DELETE',
  `detail` varchar(500) DEFAULT NULL COMMENT '실패사유/요청 요약 등 부가정보',
  `ip_address` varchar(45) DEFAULT NULL COMMENT '클라이언트 IP (IPv6 대응)',
  `user_agent` varchar(255) DEFAULT NULL COMMENT '브라우저/디바이스',
  `reg_dt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '활동 일시',
  PRIMARY KEY (`activity_log_sq`),
  KEY `idx_uact_staff_dt` (`staff_sq`, `reg_dt`),
  KEY `idx_uact_dt` (`reg_dt`),
  KEY `idx_uact_action_dt` (`action_type`, `reg_dt`),
  KEY `idx_uact_menu` (`menu_sq`),
  KEY `idx_uact_user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT='사용자 활동 이력';

-- =============================================================
-- mes_material_inbound_tb (Spring Boot JPA 관리 - ddl-auto=update 자동 생성)
-- =============================================================
CREATE TABLE IF NOT EXISTS `mes_material_inbound_tb` (
  `inbound_sq` bigint NOT NULL AUTO_INCREMENT COMMENT '입고 PK',
  `order_dtl_sq` bigint NOT NULL COMMENT '발주상세 FK',
  `item_sq` bigint NOT NULL COMMENT '품목 FK',
  `inbound_date` date NOT NULL COMMENT '가입고일자',
  `inbound_qty` double DEFAULT NULL COMMENT '가입고수량 (Kg, 셋째 자리)',
  `inspect_qty` int DEFAULT NULL COMMENT '검사수량',
  `lot_no` varchar(50) NOT NULL COMMENT 'LOT번호',
  `purchase_lot_no` varchar(50) DEFAULT NULL COMMENT '구매LOT-No',
  `inbound_type` varchar(20) DEFAULT NULL COMMENT 'REGISTER/ADJUST',
  `production_lot_no` varchar(50) DEFAULT NULL COMMENT '생산LOT번호',
  `inspect_status` varchar(20) DEFAULT 'WAIT' COMMENT '검사상태(WAIT/PASS/REJECT)',
  `passed_qty` double DEFAULT NULL COMMENT '합격수량 (Kg, 셋째 자리)',
  `rejected_qty` double DEFAULT NULL COMMENT '불합격수량 (Kg, 셋째 자리)',
  `stock_status` varchar(20) DEFAULT NULL COMMENT '재고반영여부(AVAILABLE/INSPECTING/REJECTED)',
  `inspect_lot_no` varchar(50) DEFAULT NULL COMMENT '입고검사 LOT번호 (IS-yyyyMMdd-XX)',
  `inspect_no` varchar(20) DEFAULT NULL COMMENT '입고검사번호',
  `inspector_name` varchar(50) DEFAULT NULL COMMENT '검사자명',
  `inspect_date` date DEFAULT NULL COMMENT '입고검사일자',
  `packing_qty` int DEFAULT NULL COMMENT '포장단위수량',
  `packing_unit` varchar(20) DEFAULT NULL COMMENT '포장단위',
  `lot_qty` int DEFAULT NULL COMMENT '로트수량',
  `file_name` varchar(255) DEFAULT NULL COMMENT '첨부파일명',
  `file_path` varchar(500) DEFAULT NULL COMMENT '첨부파일경로',
  `remark` text DEFAULT NULL COMMENT '비고란',
  `use_yn` tinyint(1) NOT NULL DEFAULT '1' COMMENT '사용유무',
  `reg_dt` datetime DEFAULT NULL COMMENT '등록일자',
  `mod_dt` datetime DEFAULT NULL COMMENT '수정일시',
  PRIMARY KEY (`inbound_sq`),
  KEY idx_mi_item (`item_sq`),
  KEY idx_mi_date (`inbound_date`),
  KEY idx_mi_order_dtl (`order_dtl_sq`),
  KEY idx_mi_inspect_status (`inspect_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- =============================================================
-- mes_material_inspect_lot_tb (Spring Boot JPA 관리 - ddl-auto=update 자동 생성)
-- 한 가입고(부모 LOT IS-yyyyMMdd-NN)에 대해 포장단위로 분리된 자식 LOT (IS-yyyyMMdd-NN-mm)
-- 검사자/합불은 부모(MaterialInbound) 공통, 자식은 수량과 재고 단위만 분리
-- =============================================================
CREATE TABLE IF NOT EXISTS `mes_material_inspect_lot_tb` (
  `inspect_lot_sq` bigint NOT NULL AUTO_INCREMENT COMMENT '검사로트 PK',
  `inbound_sq` bigint NOT NULL COMMENT '가입고 FK (부모 LOT)',
  `lot_seq` int NOT NULL COMMENT '자식 순번 (1부터)',
  `inspect_lot_no` varchar(50) NOT NULL COMMENT 'IS-yyyyMMdd-NN (단일) / IS-yyyyMMdd-NN-mm (복수)',
  `lot_qty` int DEFAULT NULL COMMENT '자식 LOT 수량 (포장단위 또는 잔여)',
  `stock_status` varchar(20) DEFAULT 'INSPECTING' COMMENT '재고반영여부(AVAILABLE/INSPECTING/REJECTED)',
  `reg_dt` datetime DEFAULT NULL COMMENT '등록일자',
  `mod_dt` datetime DEFAULT NULL COMMENT '수정일시',
  PRIMARY KEY (`inspect_lot_sq`),
  KEY `idx_mil_inbound_sq` (`inbound_sq`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- =============================================================
-- mes_inbound_inspect_result_tb (Spring Boot JPA 관리 - ddl-auto=update 자동 생성)
-- =============================================================
CREATE TABLE IF NOT EXISTS `mes_inbound_inspect_result_tb` (
  `result_sq` bigint NOT NULL AUTO_INCREMENT COMMENT '결과 PK',
  `inbound_sq` bigint NOT NULL COMMENT '가입고 FK',
  `item_dtl_sq` bigint NOT NULL COMMENT '기준서항목 FK',
  `measure_val` varchar(100) DEFAULT NULL COMMENT '측정값',
  `result_yn` varchar(10) DEFAULT NULL COMMENT '항목판정 (OK/NG)',
  `sample_cnt` int DEFAULT NULL COMMENT '시료수',
  -- 검사 시점 기준 스냅샷 (등록 후 기준서 변경되어도 과거 결과는 등록 시점 기준 유지)
  `inspect_item_nm` varchar(200) DEFAULT NULL COMMENT '스냅샷: 검사항목명',
  `inspect_criteria` varchar(500) DEFAULT NULL COMMENT '스냅샷: 검사기준',
  `measure_type` varchar(20) DEFAULT NULL COMMENT '스냅샷: 정성/정량',
  `inspect_method` varchar(100) DEFAULT NULL COMMENT '스냅샷: 검사방법',
  `inspect_cycle` varchar(50) DEFAULT NULL COMMENT '스냅샷: 검사주기',
  `base_val` varchar(50) DEFAULT NULL COMMENT '스냅샷: 기준치',
  `max_val` varchar(50) DEFAULT NULL COMMENT '스냅샷: 상한치',
  `min_val` varchar(50) DEFAULT NULL COMMENT '스냅샷: 하한치',
  `x1` varchar(10) DEFAULT NULL COMMENT '측정값 1',
  `x2` varchar(10) DEFAULT NULL COMMENT '측정값 2',
  `x3` varchar(10) DEFAULT NULL COMMENT '측정값 3',
  `x4` varchar(10) DEFAULT NULL COMMENT '측정값 4',
  `x5` varchar(10) DEFAULT NULL COMMENT '측정값 5',
  `x6` varchar(10) DEFAULT NULL COMMENT '측정값 6',
  `x7` varchar(10) DEFAULT NULL COMMENT '측정값 7',
  `x8` varchar(10) DEFAULT NULL COMMENT '측정값 8',
  `x9` varchar(10) DEFAULT NULL COMMENT '측정값 9',
  `x10` varchar(10) DEFAULT NULL COMMENT '측정값 10',
  `x11` varchar(10) DEFAULT NULL COMMENT '측정값 11',
  `x12` varchar(10) DEFAULT NULL COMMENT '측정값 12',
  `x13` varchar(10) DEFAULT NULL COMMENT '측정값 13',
  `x14` varchar(10) DEFAULT NULL COMMENT '측정값 14',
  `x15` varchar(10) DEFAULT NULL COMMENT '측정값 15',
  `remark` varchar(500) DEFAULT NULL COMMENT '비고',
  PRIMARY KEY (`result_sq`),
  KEY `idx_inbound_sq` (`inbound_sq`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ============================================================
-- 공통정보 테이블 (JPA 엔티티 기반 - data_standard.sql INSERT용)
-- ============================================================
CREATE TABLE IF NOT EXISTS `tb_common_group` (
  `group_sq` bigint NOT NULL AUTO_INCREMENT COMMENT '그룹 PK',
  `group_code` varchar(20) NOT NULL COMMENT '항목코드',
  `group_name` varchar(50) NOT NULL COMMENT '항목',
  PRIMARY KEY (`group_sq`),
  UNIQUE KEY `uk_group_code` (`group_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `tb_common_detail` (
  `detail_sq` bigint NOT NULL AUTO_INCREMENT COMMENT '세부 PK',
  `group_sq` bigint NOT NULL COMMENT '그룹 FK',
  `detail_code` varchar(20) NOT NULL COMMENT '세부항목코드',
  `detail_name` varchar(50) NOT NULL COMMENT '세부항목',
  `use_yn` tinyint(1) NOT NULL DEFAULT 1 COMMENT '사용유무',
  `reg_dt` datetime DEFAULT NULL COMMENT '등록일자',
  `mod_dt` datetime DEFAULT NULL COMMENT '수정일시',
  PRIMARY KEY (`detail_sq`),
  KEY `fk_detail_group` (`group_sq`),
  CONSTRAINT `fk_detail_group` FOREIGN KEY (`group_sq`) REFERENCES `tb_common_group` (`group_sq`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `tb_common_value` (
  `value_sq` bigint NOT NULL AUTO_INCREMENT COMMENT '값 PK',
  `detail_sq` bigint NOT NULL COMMENT '세부 FK',
  `value_content` varchar(100) NOT NULL COMMENT '값 내용',
  `attr_code` varchar(20) DEFAULT NULL COMMENT '값 부가 분류 코드(예: 라인구분 값의 표시그룹 코드 - 같은 코드끼리 대시보드 한 카드로 병합)',
  `sort_order` int DEFAULT NULL COMMENT '정렬 순서',
  PRIMARY KEY (`value_sq`),
  KEY `fk_value_detail` (`detail_sq`),
  CONSTRAINT `fk_value_detail` FOREIGN KEY (`detail_sq`) REFERENCES `tb_common_detail` (`detail_sq`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `mes_item_spec_tb` (
  `item_spec_sq` bigint NOT NULL AUTO_INCREMENT COMMENT '품목규격 PK',
  `item_sq` bigint NOT NULL COMMENT '품목 FK',
  `width` double DEFAULT NULL COMMENT '폭(mm)',
  `length` double DEFAULT NULL COMMENT '길이(m)',
  `basis_weight` double DEFAULT NULL COMMENT '평량\n(g/m²)',
  `weight` double DEFAULT NULL COMMENT '중량',
  `safety_stock` int DEFAULT NULL COMMENT '안전재고량',
  `spec_order` int DEFAULT NULL COMMENT '규격 정렬',
  `warehouse_loc` varchar(100) DEFAULT NULL COMMENT '창고위치 (공통코드: 창고구분)',
  `storage_loc` varchar(100) DEFAULT NULL COMMENT '보관위치 (규격별 세부 위치)',
  `reg_dt` datetime(6) DEFAULT NULL COMMENT '등록일자',
  PRIMARY KEY (`item_spec_sq`),
  KEY `fk_spec_item` (`item_sq`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `mes_unit_price_tb` (
  `unit_price_sq` bigint NOT NULL AUTO_INCREMENT COMMENT '단가 PK',
  `item_sq` bigint NOT NULL COMMENT '품목 FK',
  `customer_sq` bigint DEFAULT NULL COMMENT '거래처 FK',
  `width` double DEFAULT NULL COMMENT '폭(mm)',
  `length` double DEFAULT NULL COMMENT '길이(m)',
  `price_type` varchar(255) NOT NULL COMMENT '단가구분',
  `unit_price` decimal(15,2) NOT NULL COMMENT '단가',
  `price_unit` varchar(20) DEFAULT NULL COMMENT 'm2/ea/kg - 단위당 단가 기준',
  `start_date` date NOT NULL COMMENT '적용일자',
  `end_date` date DEFAULT NULL COMMENT '종료일자',
  `change_date` datetime(6) DEFAULT NULL COMMENT '변경일자',
  `remark` varchar(255) DEFAULT NULL COMMENT '비고',
  `use_yn` tinyint(1) DEFAULT 1 COMMENT '사용유무',
  `reg_dt` datetime(6) DEFAULT NULL COMMENT '등록일자',
  `mod_dt` datetime(6) DEFAULT NULL COMMENT '수정일시',
  PRIMARY KEY (`unit_price_sq`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================
-- mes_sales_order_tb (수주정보 - SalesOrder 엔티티 기반)
-- =============================================================
CREATE TABLE IF NOT EXISTS `mes_sales_order_tb` (
  `order_sq` bigint NOT NULL AUTO_INCREMENT COMMENT '발주 PK',
  `order_no` varchar(20) NOT NULL COMMENT '수주번호',
  `customer_sq` bigint NOT NULL COMMENT '거래처 FK',
  `order_date` date NOT NULL COMMENT '수주일자',
  `delivery_req_date` date DEFAULT NULL COMMENT '납품요청일',
  `delivery_place` varchar(255) DEFAULT NULL COMMENT '납품장소',
  `total_order_amt` decimal(15,2) DEFAULT NULL COMMENT '총 발주금액',
  `payment_terms` varchar(50) DEFAULT NULL COMMENT '결제조건',
  `order_status` varchar(20) DEFAULT NULL COMMENT 'ORDERED/SHIPPING/COMPLETED',
  `remark` varchar(255) DEFAULT NULL COMMENT '비고',
  `tax_apply_yn` tinyint(1) DEFAULT 1 COMMENT '부가세 적용 여부',
  `tax_rate` decimal(5,2) DEFAULT 10.00 COMMENT '부가세율(%)',
  `use_yn` tinyint(1) DEFAULT 1 COMMENT '사용유무',
  `reg_dt` datetime DEFAULT NULL COMMENT '등록일자',
  `mod_dt` datetime DEFAULT NULL COMMENT '수정일시',
  PRIMARY KEY (`order_sq`),
  UNIQUE KEY `uk_order_no` (`order_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================
-- mes_sales_order_dtl_tb (수주상세 - SalesOrderDetail 엔티티 기반)
-- =============================================================
CREATE TABLE IF NOT EXISTS `mes_sales_order_dtl_tb` (
  `order_dtl_sq` bigint NOT NULL AUTO_INCREMENT COMMENT '발주상세 PK',
  `order_sq` bigint NOT NULL COMMENT '발주 FK',
  `item_sq` bigint NOT NULL COMMENT '품목 FK',
  `order_qty` int DEFAULT NULL COMMENT '수량',
  `order_unit` varchar(10) DEFAULT NULL COMMENT '단위',
  `unit_price` decimal(15,2) DEFAULT NULL COMMENT '단가',
  `unit_vat_amt` decimal(15,2) DEFAULT 0.00 COMMENT 'm2당 부가세 금액',
  `supply_amt` decimal(15,2) DEFAULT NULL COMMENT '공급가액',
  `vat_amt` decimal(15,2) DEFAULT NULL COMMENT '부가세',
  `total_amt` decimal(15,2) DEFAULT NULL COMMENT '금액',
  `spec` varchar(100) DEFAULT NULL COMMENT '규격',
  `basis_weight` double DEFAULT NULL COMMENT '평량\n(g/m²)',
  `width` double DEFAULT NULL COMMENT '폭(mm)',
  `length` double DEFAULT NULL COMMENT '길이(m)',
  `weight` double DEFAULT NULL COMMENT '중량',
  `order_qty_ea` int DEFAULT NULL COMMENT '수주량(EA)',
  `order_qty_m2` double DEFAULT NULL COMMENT '발주수량(m²)',
  `remark` varchar(255) DEFAULT NULL COMMENT '비고',
  PRIMARY KEY (`order_dtl_sq`),
  KEY `fk_sales_dtl_order` (`order_sq`),
  CONSTRAINT `fk_sales_dtl_order` FOREIGN KEY (`order_sq`) REFERENCES `mes_sales_order_tb` (`order_sq`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================
-- mes_inspect_std_tb (검사표준 - InspectStandard 엔티티 기반)
-- =============================================================
CREATE TABLE IF NOT EXISTS `mes_inspect_std_tb` (
  `inspect_std_sq` bigint NOT NULL AUTO_INCREMENT COMMENT '검사기준 PK',
  `inspect_type` varchar(20) NOT NULL COMMENT 'INCOMING/PROCESS/SHIPPING',
  `std_no` varchar(50) NOT NULL COMMENT '입고검사표준번호',
  `item_sq` bigint NOT NULL COMMENT '품목 FK',
  `remark` varchar(500) DEFAULT NULL COMMENT '비고',
  `img_paths` longtext DEFAULT NULL COMMENT '이미지 경로',
  `use_yn` tinyint(1) DEFAULT 1 COMMENT '사용유무',
  `reg_dt` datetime DEFAULT NULL COMMENT '등록일자',
  `mod_dt` datetime DEFAULT NULL COMMENT '수정일시',
  PRIMARY KEY (`inspect_std_sq`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================
-- mes_inspect_item_tb (검사항목 - InspectItem 엔티티 기반)
-- =============================================================
CREATE TABLE IF NOT EXISTS `mes_inspect_item_tb` (
  `item_dtl_sq` bigint NOT NULL AUTO_INCREMENT COMMENT '검사항목 PK',
  `inspect_std_sq` bigint NOT NULL COMMENT '검사기준 FK',
  `sort_no` int DEFAULT NULL COMMENT '정렬 번호',
  `inspect_item_nm` varchar(100) DEFAULT NULL COMMENT '검사항목',
  `inspect_criteria` varchar(255) DEFAULT NULL COMMENT '검사기준',
  `measure_type` varchar(20) DEFAULT NULL COMMENT '정성/정량',
  `inspect_method` varchar(50) DEFAULT NULL COMMENT '육안/치수',
  `inspect_cycle` varchar(50) DEFAULT NULL COMMENT '검사주기',
  `sample_cnt` varchar(20) DEFAULT NULL COMMENT '시료수',
  `base_val` varchar(50) DEFAULT NULL COMMENT '기준치',
  `max_val` varchar(50) DEFAULT NULL COMMENT '상한치',
  `min_val` varchar(50) DEFAULT NULL COMMENT '하한치',
  `remark` varchar(500) DEFAULT NULL COMMENT '비고',
  PRIMARY KEY (`item_dtl_sq`),
  KEY `fk_inspect_item_std` (`inspect_std_sq`),
  CONSTRAINT `fk_inspect_item_std` FOREIGN KEY (`inspect_std_sq`) REFERENCES `mes_inspect_std_tb` (`inspect_std_sq`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================
-- mes_inspect_rev_tb (검사개정이력 - InspectRevision 엔티티 기반)
-- =============================================================
CREATE TABLE IF NOT EXISTS `mes_inspect_rev_tb` (
  `rev_sq` bigint NOT NULL AUTO_INCREMENT COMMENT '개정 PK',
  `inspect_std_sq` bigint NOT NULL COMMENT '검사기준 FK',
  `rev_no` int DEFAULT NULL COMMENT '개정번호',
  `rev_dt` date DEFAULT NULL COMMENT '개정일자',
  `rev_content` varchar(500) DEFAULT NULL COMMENT '개정내용',
  `writer_nm` varchar(50) DEFAULT NULL COMMENT '등록자',
  `remark` varchar(500) DEFAULT NULL COMMENT '비고',
  PRIMARY KEY (`rev_sq`),
  KEY `fk_inspect_rev_std` (`inspect_std_sq`),
  CONSTRAINT `fk_inspect_rev_std` FOREIGN KEY (`inspect_std_sq`) REFERENCES `mes_inspect_std_tb` (`inspect_std_sq`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================
-- mes_purchase_order_tb (발주정보)
-- =============================================================
CREATE TABLE IF NOT EXISTS `mes_purchase_order_tb` (
  `order_sq` bigint NOT NULL AUTO_INCREMENT COMMENT '발주 PK',
  `order_no` varchar(20) NOT NULL COMMENT '수주번호',
  `customer_sq` bigint NOT NULL COMMENT '거래처 FK',
  `order_date` date NOT NULL COMMENT '수주일자',
  `in_req_date` date DEFAULT NULL COMMENT '입고요청일',
  `payment_terms` varchar(255) DEFAULT NULL COMMENT '결제조건',
  `total_order_amt` decimal(15,2) DEFAULT NULL COMMENT '총 발주금액',
  `order_status` varchar(255) DEFAULT NULL COMMENT '발주 상태',
  `remark` varchar(255) DEFAULT NULL COMMENT '비고',
  `submit_doc` varchar(255) DEFAULT NULL COMMENT '제출 서류',
  `tax_apply_yn` tinyint(1) DEFAULT 1 COMMENT '부가세 적용 여부',
  `tax_rate` decimal(5,2) DEFAULT 10.00 COMMENT '부가세율(%)',
  `req_material_cert_yn` tinyint(1) DEFAULT NULL COMMENT '원자재 시험성적서 요청 여부',
  `req_trans_spec_yn` tinyint(1) DEFAULT NULL COMMENT '출하 시험성적서 요청 여부',
  `material_cert_file_path` varchar(255) DEFAULT NULL COMMENT '원자재 시험성적서 파일 경로',
  `material_cert_file_nm` varchar(255) DEFAULT NULL COMMENT '원자재 시험성적서 파일명',
  `trans_spec_file_path` varchar(255) DEFAULT NULL COMMENT '출하 시험성적서 파일 경로',
  `trans_spec_file_nm` varchar(255) DEFAULT NULL COMMENT '출하 시험성적서 파일명',
  `use_yn` tinyint(1) DEFAULT '1' COMMENT '사용유무',
  `reg_dt` datetime DEFAULT NULL COMMENT '등록일자',
  `mod_dt` datetime DEFAULT NULL COMMENT '수정일시',
  PRIMARY KEY (`order_sq`),
  UNIQUE KEY `uk_order_no` (`order_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================
-- mes_purchase_order_dtl_tb (발주상세)
-- =============================================================
CREATE TABLE IF NOT EXISTS `mes_purchase_order_dtl_tb` (
  `order_dtl_sq` bigint NOT NULL AUTO_INCREMENT COMMENT '발주상세 PK',
  `order_sq` bigint DEFAULT NULL COMMENT '발주 FK',
  `item_sq` bigint NOT NULL COMMENT '품목 FK',
  `order_qty` int DEFAULT NULL COMMENT '수량',
  `order_unit` varchar(255) DEFAULT NULL COMMENT '단위',
  `unit_price` decimal(15,2) DEFAULT NULL COMMENT '단가',
  `supply_amt` decimal(15,2) DEFAULT NULL COMMENT '공급가액',
  `vat_amt` decimal(15,2) DEFAULT NULL COMMENT '부가세',
  `total_amt` decimal(15,2) DEFAULT NULL COMMENT '금액',
  `spec` varchar(255) DEFAULT NULL COMMENT '규격',
  `remark` varchar(255) DEFAULT NULL COMMENT '비고',
  PRIMARY KEY (`order_dtl_sq`),
  KEY `fk_po_dtl_order` (`order_sq`),
  CONSTRAINT `fk_po_dtl_order` FOREIGN KEY (`order_sq`) REFERENCES `mes_purchase_order_tb` (`order_sq`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================
-- JPA 엔티티 기반 신규 테이블 (37개)
-- Hibernate ddl-auto=update로 자동 생성되지만
-- Docker 초기화 시 순서 보장을 위해 명시적으로 정의
-- =============================================================

CREATE TABLE IF NOT EXISTS mes_work_order_tb (
  work_order_sq bigint       NOT NULL AUTO_INCREMENT COMMENT '작업지시 PK',
  work_order_date date         NOT NULL COMMENT '작업지시일',
  line_sq bigint       NULL COMMENT '라인 FK',
  line_name varchar(255) NOT NULL COMMENT '라인',
  priority varchar(255) NOT NULL COMMENT '우선순위',
  item_sq bigint       NOT NULL COMMENT '품목 FK',
  recipe_sq bigint       NULL COMMENT '레시피 FK',
  target_qty int          NULL COMMENT '생산량',
  prod_speed double NULL COMMENT '생산속도',
  basis_weight double NULL COMMENT '평량\n(g/m²)',
  manage_weight double NOT NULL DEFAULT 0 COMMENT '관리중량',
  plc_weight double NOT NULL DEFAULT 0 COMMENT 'PLC 표준중량(g) — 생산관리자 입력. 분석상세 표준중량 산출 기준',
  total_width double NULL COMMENT '전체 폭',
  total_weight double NULL COMMENT '총중량',
  effective_width double NULL COMMENT '유효 폭',
  estimated_production_time double NULL COMMENT '예상생산소요시간(분)',
  lot_no varchar(255) NULL COMMENT '출하 Lot-No',
  recipe varchar(255) NULL COMMENT '레시피',
  production_lot_no varchar(255) NULL COMMENT '생산 로트번호',
  work_start_time datetime     NULL COMMENT '작업 시작시각',
  work_end_time datetime     NULL COMMENT '작업 종료시각',
  work_status varchar(255) NULL COMMENT '기본값 대기',
  remark varchar(255) NULL COMMENT '비고',
  use_yn tinyint(1)   NULL COMMENT '사용유무',
  reg_dt datetime     NULL COMMENT '등록일자',
  mod_dt datetime     NULL COMMENT '수정일시',
  PRIMARY KEY (work_order_sq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mes_work_order_dtl_tb (
  wo_dtl_sq bigint       NOT NULL AUTO_INCREMENT COMMENT '작업지시상세 PK',
  work_order_sq bigint       NOT NULL COMMENT '작업지시 FK',
  item_sq bigint       NOT NULL COMMENT '품목 FK',
  lot_no varchar(255) NOT NULL COMMENT '출하 Lot-No',
  order_qty int          NULL COMMENT '수량',
  width double NULL COMMENT '폭(mm)',
  length double NULL COMMENT '길이(m)',
  effective_width double NULL COMMENT '유효 폭',
  remark varchar(255) NULL COMMENT '비고',
  PRIMARY KEY (wo_dtl_sq),
  CONSTRAINT fk_wo_dtl_work_order FOREIGN KEY (work_order_sq) REFERENCES mes_work_order_tb(work_order_sq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mes_work_result_tb (
  result_sq bigint       NOT NULL AUTO_INCREMENT COMMENT '결과 PK',
  work_order_sq bigint       NOT NULL COMMENT '작업지시 FK',
  work_date date         NOT NULL COMMENT '생산일',
  line_sq bigint       NULL COMMENT '라인 FK',
  line_name varchar(255) NULL COMMENT '라인',
  item_sq bigint       NOT NULL COMMENT '품목 FK',
  total_prod_qty int          NULL COMMENT '총 생산수량',
  total_good_qty int          NULL COMMENT '총 양품수량',
  total_bad_qty int          NULL COMMENT '총 불량수량',
  appearance_defect varchar(255) NULL COMMENT '외관 불량',
  dimension_defect varchar(255) NULL COMMENT '치수 불량',
  start_time datetime     NULL COMMENT '시작시간',
  end_time datetime     NULL COMMENT '종료시간',
  reg_dt datetime     NULL COMMENT '등록일자',
  mod_dt datetime     NULL COMMENT '수정일시',
  PRIMARY KEY (result_sq),
  KEY idx_wr_work_order (work_order_sq),
  KEY idx_wr_work_date (work_date),
  KEY idx_wr_item (item_sq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mes_work_result_dtl_tb (
  result_dtl_sq bigint       NOT NULL AUTO_INCREMENT COMMENT '결과상세 PK',
  result_sq bigint       NOT NULL COMMENT '결과 FK',
  lot_no varchar(255) NOT NULL COMMENT '출하 Lot-No',
  roll_no int          NULL COMMENT '롤 번호',
  prod_width double NULL COMMENT '생산 폭',
  prod_length double NULL COMMENT '생산 길이',
  real_basis_weight double NULL COMMENT '실측평량',
  net_weight double NULL COMMENT '정미중량',
  gross_weight double NULL COMMENT '총중량',
  work_start_dt datetime     NULL COMMENT '작업 시작일시',
  work_end_dt datetime     NULL COMMENT '작업 종료일시',
  judge_code varchar(255) NULL COMMENT '합부판정',
  defect_type varchar(255) NULL COMMENT '결함 유형',
  remark varchar(255) NULL COMMENT '비고',
  PRIMARY KEY (result_dtl_sq),
  KEY idx_wrd_lot (lot_no),
  CONSTRAINT fk_wr_dtl_result FOREIGN KEY (result_sq) REFERENCES mes_work_result_tb(result_sq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mes_production_plan_tb (
  plan_sq bigint       NOT NULL AUTO_INCREMENT COMMENT '계획 PK',
  plan_date date         NOT NULL COMMENT '계획일자',
  line_sq bigint       NULL COMMENT '라인 FK',
  line_name varchar(255) NULL COMMENT '라인',
  item_sq bigint       NOT NULL COMMENT '품목 FK',
  req_sq bigint       NULL COMMENT '요청 FK',
  plan_qty int          NULL COMMENT '계획수량',
  weight double NULL COMMENT '중량',
  production_speed double NULL COMMENT '분당생산량',
  estimated_production_time double NULL COMMENT '예상생산소요시간(분)',
  current_stock int          NULL COMMENT '현재고량',
  start_time time         NULL COMMENT '시작시간',
  end_time time         NULL COMMENT '종료시간',
  plan_status varchar(255) NULL COMMENT '계획 상태',
  remark varchar(255) NULL COMMENT '비고',
  reg_dt datetime     NULL COMMENT '등록일자',
  mod_dt datetime     NULL COMMENT '수정일시',
  PRIMARY KEY (plan_sq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mes_production_req_tb (
  req_sq bigint       NOT NULL AUTO_INCREMENT COMMENT '요청 PK',
  order_dtl_sq bigint       NOT NULL COMMENT '발주상세 FK',
  item_sq bigint       NOT NULL COMMENT '품목 FK',
  order_qty int          NULL COMMENT '수량',
  current_stock int          NULL COMMENT '현재고량',
  safety_stock int          NULL COMMENT '안전재고량',
  shortage_qty int          NULL COMMENT '부족수량',
  delivery_planned_qty int       NULL COMMENT '납기예정수량',
  production_req_qty int         NULL COMMENT '생산요청수량',
  production_speed double NULL COMMENT '분당생산량',
  production_per_hour_m2 double NULL COMMENT '시간당 생산량(m²)',
  estimated_production_time double NULL COMMENT '예상생산소요시간(분)',
  plan_qty int          NULL COMMENT '계획수량',
  req_date date         NULL COMMENT '요청일자',
  remark varchar(255) NULL COMMENT '비고',
  reg_dt datetime     NULL COMMENT '등록일자',
  mod_dt datetime     NULL COMMENT '수정일시',
  PRIMARY KEY (req_sq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mes_material_input_tb (
  input_sq bigint       NOT NULL AUTO_INCREMENT COMMENT '투입 PK',
  work_order_sq bigint       NOT NULL COMMENT '작업지시 FK',
  work_date date         NULL COMMENT '생산일',
  line_sq bigint       NULL COMMENT '라인번호 (1, 2, 3...)',
  item_sq bigint       NULL COMMENT '품목 FK',
  facility_name varchar(255) NULL COMMENT '설비명',
  total_target_weight double NULL COMMENT '관리자가 셋팅한 목표 중량',
  total_actual_weight double NULL COMMENT 'PLC에서 올라온 실제 총 중량',
  error_rate double NULL COMMENT '오차율',
  production_lot_no varchar(255) NULL COMMENT '생산 로트번호',
  line_name varchar(255) NULL COMMENT '라인',
  product_item_code varchar(255) NULL COMMENT '완제품 품번',
  product_item_name varchar(255) NULL COMMENT '완제품 품명',
  material_stock_sq bigint       NULL COMMENT '원자재재고 FK',
  material_item_sq bigint       NULL COMMENT '원자재 품목 FK',
  material_item_code varchar(255) NULL COMMENT '원자재 품번',
  material_item_name varchar(255) NULL COMMENT '원자재 품명',
  purchase_lot_no varchar(255) NULL COMMENT '구매 Lot-No',
  stock_lot_no varchar(255) NULL COMMENT '재고 로트번호',
  calculated_qty double NULL COMMENT '산출수량 (Kg, 셋째 자리)',
  input_qty double NULL COMMENT '투입수량 (Kg, 셋째 자리, PLC g 합계 ÷ 1000)',
  input_status varchar(255) NULL COMMENT '투입 상태 (RESERVED / CONFIRMED / PLC_AUTO)',
  plc_raw_g double NULL COMMENT 'PLC raw 합계 원본 (g, audit)',
  reg_dt datetime     NULL COMMENT '등록일자',
  PRIMARY KEY (input_sq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mes_material_input_dtl_tb (
  input_dtl_sq bigint       NOT NULL AUTO_INCREMENT COMMENT '투입상세 PK',
  input_sq bigint       NOT NULL COMMENT '투입 FK',
  work_time_range varchar(255) NULL COMMENT '작업 시간대',
  mat_a_usage double NULL COMMENT '원료 A 사용량',
  mat_b_usage double NULL COMMENT '원료 B 사용량',
  mat_c_usage double NULL COMMENT '원료 C 사용량',
  mat_d_usage double NULL COMMENT '원료 D 사용량',
  row_total_usage double NULL COMMENT '행 합계 사용량',
  PRIMARY KEY (input_dtl_sq),
  CONSTRAINT fk_mat_input_dtl FOREIGN KEY (input_sq) REFERENCES mes_material_input_tb(input_sq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- PLC 외주업체에서 호기 열림 이벤트마다 push 하는 원본 로그
-- 자재/lot 매핑은 별도 테이블에서 join 처리 (이 테이블은 가공 X)
CREATE TABLE IF NOT EXISTS mes_plc_raw_log_tb (
  log_sq bigint       NOT NULL AUTO_INCREMENT COMMENT '로그 PK',
  collected_dt datetime     NULL COMMENT '측정시간',  -- PLC payload 의 datetime
  device_code varchar(20)  NULL COMMENT '디바이스 코드',  -- 원본 디바이스 코드 (예: "P1F1")
  line_code varchar(10)  NULL COMMENT '라인 코드',  -- 파싱된 라인 코드 (예: "P1")
  feeder_no varchar(10)  NULL COMMENT '피더 번호',  -- 파싱된 호기 (예: "F1")
  value double       NULL COMMENT '값',  -- 토출량
  unit varchar(10)  NULL COMMENT '단위',  -- 단위 (외주 페이로드 unit, 현재 항상 "g")
  raw_payload text         NULL COMMENT '원본 페이로드',  -- 원본 페이로드 (감사/디버깅용)
  reg_dt datetime     NULL COMMENT '등록일자',
  PRIMARY KEY (log_sq),
  KEY idx_plc_collected_dt (collected_dt),
  KEY idx_plc_line_feeder (line_code, feeder_no, collected_dt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mes_material_stock_tb (
  stock_sq bigint       NOT NULL AUTO_INCREMENT COMMENT '재고 PK',
  item_sq bigint       NOT NULL COMMENT '품목 FK',
  item_weight double NULL COMMENT '사용자 입력 중량',
  lot_no varchar(255) NOT NULL COMMENT '출하 Lot-No',
  current_qty double NULL COMMENT '재고 (Kg, 셋째 자리)',
  reserved_qty double NULL COMMENT '예약수량 (Kg, 셋째 자리)',
  warehouse_loc varchar(255) NULL COMMENT '창고위치',
  stock_status varchar(255) NULL COMMENT '재고상태',
  last_in_date date         NULL COMMENT '최종입고일자',
  remark varchar(255) NULL COMMENT '비고',
  writer_id varchar(255) NULL COMMENT '조정책임자',
  reg_dt datetime     NULL COMMENT '등록일자',
  mod_dt datetime     NULL COMMENT '수정일시',
  PRIMARY KEY (stock_sq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mes_material_stock_history_tb (
  history_sq bigint       NOT NULL AUTO_INCREMENT COMMENT '이력 PK',
  stock_sq bigint       NULL COMMENT '재고 FK',
  warehouse_loc varchar(255) NULL COMMENT '이력 발생 당시의 보관위치',
  change_type varchar(255) NULL COMMENT '입출고구분',
  prev_qty double NULL COMMENT '조정 전 (Kg, 셋째 자리)',
  change_qty double NULL COMMENT '입출고수량 (Kg, 셋째 자리)',
  curr_qty double NULL COMMENT '재고량 (Kg, 셋째 자리)',
  worker_id varchar(255) NULL COMMENT '작업자 ID',
  reason varchar(255) NULL COMMENT '사유',
  reg_dt datetime     NULL COMMENT '등록일자',
  PRIMARY KEY (history_sq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mes_product_stock_tb (
  stock_sq bigint       NOT NULL AUTO_INCREMENT COMMENT '재고 PK',
  item_sq bigint       NOT NULL COMMENT '품목 FK',
  lot_no varchar(255) NOT NULL COMMENT '출하 Lot-No',
  width double       NULL COMMENT '폭(mm)',
  `length` double       NULL COMMENT '길이(m)',
  current_qty_m double NULL COMMENT '현재 수량(m)',
  current_qty_ea int          NULL COMMENT '현재 수량(ea)',
  storage_loc varchar(255) NULL COMMENT '보관위치',
  stock_status varchar(255) NULL COMMENT '재고상태',
  last_in_date date         NULL COMMENT '최종입고일자',
  last_out_date date         NULL COMMENT '최종출고일자',
  remark varchar(255) NULL COMMENT '비고',
  reg_dt datetime     NULL COMMENT '등록일자',
  PRIMARY KEY (stock_sq),
  KEY idx_ps_item (item_sq),
  KEY idx_ps_lot (lot_no),
  KEY idx_ps_item_lot (item_sq, lot_no),
  KEY idx_ps_date (last_in_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mes_product_stock_history_tb (
  history_sq bigint       NOT NULL AUTO_INCREMENT COMMENT '이력 PK',
  stock_sq bigint       NOT NULL COMMENT '재고 FK',
  item_sq bigint       NOT NULL COMMENT '품목 FK',
  lot_no varchar(255) NULL COMMENT '출하 Lot-No',
  change_type varchar(32)  NULL COMMENT '입출고구분',
  prev_qty_m double NULL COMMENT '이전 수량(m)',
  change_qty_m double NULL COMMENT '변동 수량(m)',
  curr_qty_m double NULL COMMENT '현재 수량(m)',
  prev_qty_ea int          NULL COMMENT '이전 수량(ea)',
  change_qty_ea int          NULL COMMENT '변동 수량(ea)',
  curr_qty_ea int          NULL COMMENT '현재 수량(ea)',
  ref_sq bigint       NULL COMMENT '연관 문서 PK (출하실적 sq 등)',
  ref_type varchar(32)  NULL COMMENT 'SHIPMENT_RESULT 등',
  worker_id varchar(255) NULL COMMENT '작업자 ID',
  reason varchar(255) NULL COMMENT '사유',
  reg_dt datetime     NULL COMMENT '등록일자',
  PRIMARY KEY (history_sq),
  KEY idx_pshist_stock (stock_sq),
  KEY idx_pshist_item_date (item_sq, reg_dt),
  KEY idx_pshist_date (reg_dt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mes_shipment_plan_tb (
  plan_sq bigint       NOT NULL AUTO_INCREMENT COMMENT '계획 PK',
  sales_order_dtl_sq bigint       NULL COMMENT '수주상세 FK',
  customer_sq bigint       NULL COMMENT '거래처 FK',
  item_sq bigint       NULL COMMENT '품목 FK',
  plan_date date         NULL COMMENT '계획일자',
  expected_ship_date date         NULL COMMENT '출하일',
  plan_qty double NULL COMMENT '계획수량',
  plan_qty_ea int          NULL COMMENT '생산계획량(EA)',
  lot_no varchar(255) NULL COMMENT '출하 Lot-No',
  customer_code varchar(255) NULL COMMENT '거래처번호',
  customer_name varchar(255) NULL COMMENT '거래처명',
  item_code varchar(255) NULL COMMENT '품번',
  item_name varchar(255) NULL COMMENT '품명',
  basis_weight double NULL COMMENT '평량\n(g/m²)',
  width double NULL COMMENT '폭(mm)',
  `length` double NULL COMMENT '길이(m)',
  sales_order_qty double NULL COMMENT '수주수량',
  current_stock double NULL COMMENT '현재고량',
  storage_location varchar(255) NULL COMMENT '보관위치',
  order_no varchar(255) NULL COMMENT '수주번호',
  plan_status varchar(255) NULL COMMENT '계획 상태',
  remark varchar(255) NULL COMMENT '비고',
  reg_dt datetime     NULL COMMENT '등록일자',
  mod_dt datetime     NULL COMMENT '수정일시',
  PRIMARY KEY (plan_sq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mes_shipment_order_tb (
  ship_order_sq bigint       NOT NULL AUTO_INCREMENT COMMENT '출하지시 PK',
  customer_sq bigint       NULL COMMENT '거래처 FK',
  expected_ship_date date        NULL COMMENT '출하일',
  expected_ship_time time        NULL COMMENT '출하예정시간',
  destination varchar(255) NULL COMMENT '도착지',
  customer_req varchar(255) NULL COMMENT '거래처요청사항',
  order_status      varchar(20)  NULL COMMENT 'READY/COMPLETED',
  use_yn tinyint(1)   NULL COMMENT '사용유무',
  reg_dt datetime     NULL COMMENT '등록일자',
  mod_dt datetime     NULL COMMENT '수정일시',
  PRIMARY KEY (ship_order_sq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mes_shipment_order_dtl_tb (
  ship_dtl_sq bigint       NOT NULL AUTO_INCREMENT COMMENT '출하상세 PK',
  ship_order_sq bigint       NULL COMMENT '출하지시 FK',
  plan_sq bigint       NULL COMMENT '계획 FK',
  item_sq bigint       NULL COMMENT '품목 FK',
  product_lot_no varchar(255) NULL COMMENT '제품LOT',
  order_qty double NULL COMMENT '수량',
  order_qty_ea int          NULL COMMENT '수주량(EA)',
  customer_code varchar(255) NULL COMMENT '거래처번호',
  customer_name varchar(255) NULL COMMENT '거래처명',
  item_code varchar(255) NULL COMMENT '품번',
  item_name varchar(255) NULL COMMENT '품명',
  basis_weight double NULL COMMENT '평량\n(g/m²)',
  width double NULL COMMENT '폭(mm)',
  `length` double NULL COMMENT '길이(m)',
  sales_order_qty double NULL COMMENT '수주수량',
  current_stock double NULL COMMENT '현재고량',
  storage_location varchar(255) NULL COMMENT '보관위치',
  ship_status       varchar(20)  NULL COMMENT 'WAIT/SHIPPED',
  PRIMARY KEY (ship_dtl_sq),
  CONSTRAINT fk_ship_order_dtl FOREIGN KEY (ship_order_sq) REFERENCES mes_shipment_order_tb(ship_order_sq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mes_shipment_result_tb (
  ship_result_sq bigint       NOT NULL AUTO_INCREMENT COMMENT '출하실적 PK',
  ship_dtl_sq bigint       NOT NULL COMMENT '출하상세 FK',
  customer_sq bigint       NOT NULL COMMENT '거래처 FK',
  item_sq bigint       NOT NULL COMMENT '품목 FK',
  lot_no varchar(50)  NOT NULL COMMENT '출하 Lot-No',
  shipped_qty double NULL COMMENT '출하량\n(m)',
  shipped_qty_ea int          NULL COMMENT '출하량\n(EA)',
  ship_date date         NOT NULL COMMENT '일자',
  remark varchar(255) NULL COMMENT '비고',
  reg_dt datetime     NULL COMMENT '등록일자',
  mod_dt datetime     NULL COMMENT '수정일시',
  PRIMARY KEY (ship_result_sq),
  KEY idx_sr_dtl (ship_dtl_sq),
  KEY idx_sr_date (ship_date),
  KEY idx_sr_item (item_sq),
  KEY idx_sr_customer (customer_sq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mes_shipment_inspect_tb (
  ship_inspect_sq bigint       NOT NULL AUTO_INCREMENT COMMENT '출하검사 PK',
  ship_dtl_sq bigint       NOT NULL COMMENT '출하상세 FK',
  lot_no varchar(255) NULL COMMENT '출하 Lot-No',
  inspect_qty double NULL COMMENT '검사수량',
  real_weight double NULL COMMENT '실측중량',
  judge_code varchar(255) NULL COMMENT '합부판정',
  inspect_date date         NULL COMMENT '검사일자',
  inspector_nm varchar(255) NULL COMMENT '검사자명',
  report_file_path varchar(255) NULL COMMENT '검교정성적서',
  report_file_name varchar(255) NULL COMMENT '보고서 파일명',
  remark varchar(255) NULL COMMENT '비고',
  item_code varchar(255) NULL COMMENT '품번',
  item_name varchar(255) NULL COMMENT '품명',
  basis_weight double NULL COMMENT '평량\n(g/m²)',
  width double NULL COMMENT '폭(mm)',
  `length` double NULL COMMENT '길이(m)',
  weight double NULL COMMENT '중량',
  max_val double NULL COMMENT '상한치',
  min_val double NULL COMMENT '하한치',
  -- 검사 시점 기준 스냅샷 (등록 후 기준서 변경되어도 과거 결과는 등록 시점 기준 유지)
  inspect_item_nm   varchar(200) NULL COMMENT '스냅샷: 검사항목명',
  inspect_criteria  varchar(500) NULL COMMENT '스냅샷: 검사기준',
  measure_type      varchar(20)  NULL COMMENT '스냅샷: 정성/정량',
  inspect_method    varchar(100) NULL COMMENT '스냅샷: 검사방법',
  inspect_cycle     varchar(50)  NULL COMMENT '스냅샷: 검사주기',
  base_val          varchar(50)  NULL COMMENT '스냅샷: 기준치',
  sample_cnt int          NULL DEFAULT 1 COMMENT '시료수 (한 제품 LOT = 한 롤이므로 항상 1)',
  x1 double         NULL COMMENT '측정값 (시료수 1 → x1만 사용)',
  reg_dt datetime     NULL COMMENT '등록일자',
  mod_dt datetime     NULL COMMENT '수정일시',
  PRIMARY KEY (ship_inspect_sq),
  KEY idx_si_dtl (ship_dtl_sq),
  KEY idx_si_date (inspect_date),
  KEY idx_si_lot (lot_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mes_trade_statement_tb (
  statement_sq bigint       NOT NULL AUTO_INCREMENT COMMENT '거래명세서 PK',
  ship_order_sq bigint       NULL COMMENT '출하지시 FK',
  statement_date date         NULL COMMENT '거래명세서 일자',
  supplier_reg_no varchar(255) NULL COMMENT '공급자 사업자등록번호',
  supplier_company varchar(255) NULL COMMENT '공급자 회사명',
  supplier_ceo varchar(255) NULL COMMENT '공급자 대표자',
  supplier_address varchar(255) NULL COMMENT '공급자 주소',
  supplier_biz_type varchar(255) NULL COMMENT '공급자 업태',
  supplier_biz_item varchar(255) NULL COMMENT '공급자 종목',
  buyer_reg_no varchar(255) NULL COMMENT '공급받는자 사업자등록번호',
  buyer_company varchar(255) NULL COMMENT '공급받는자 회사명',
  buyer_ceo varchar(255) NULL COMMENT '공급받는자 대표자',
  buyer_address varchar(255) NULL COMMENT '공급받는자 주소',
  buyer_biz_type varchar(255) NULL COMMENT '공급받는자 업태',
  buyer_biz_item varchar(255) NULL COMMENT '공급받는자 종목',
  prev_balance varchar(255) NULL COMMENT '전 잔액',
  ship_amount varchar(255) NULL COMMENT '출하금액',
  deposit_amount varchar(255) NULL COMMENT '입금금액',
  curr_balance varchar(255) NULL COMMENT '현 잔액',
  receiver_name varchar(255) NULL COMMENT '인수자명',
  remark varchar(255) NULL COMMENT '비고',
  source_type varchar(255) NULL COMMENT '소스 구분',
  source_key varchar(255) NULL COMMENT '소스 키',
  reg_dt datetime     NULL COMMENT '등록일자',
  mod_dt datetime     NULL COMMENT '수정일시',
  PRIMARY KEY (statement_sq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mes_trade_statement_item_tb (
  item_sq bigint       NOT NULL AUTO_INCREMENT COMMENT '품목 PK',
  statement_sq bigint       NULL COMMENT '거래명세서 FK',
  row_no int          NULL COMMENT '행 번호',
  product_name varchar(255) NULL COMMENT '품명',
  spec varchar(255) NULL COMMENT '규격',
  qty int           NULL COMMENT '수량',
  unit_price decimal(15,2) NULL COMMENT '단가',
  supply_price decimal(15,2) NULL COMMENT '공급가액',
  tax decimal(15,2) NULL COMMENT '세액',
  PRIMARY KEY (item_sq),
  CONSTRAINT fk_trade_stmt_item FOREIGN KEY (statement_sq) REFERENCES mes_trade_statement_tb(statement_sq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 출하성적서(NEEDLE 공정 자주검사표) 마스터. 출하지시 1건당 1성적서.
CREATE TABLE IF NOT EXISTS mes_shipment_report_tb (
  ship_report_sq bigint       NOT NULL AUTO_INCREMENT COMMENT '출하보고서 PK',
  ship_order_sq bigint       NULL COMMENT '출하지시 FK',
  report_date_from date         NULL COMMENT '보고서 시작일자',
  report_date_to date         NULL COMMENT '보고서 종료일자',
  title varchar(255) NULL COMMENT '제목',
  work_type varchar(100) NULL COMMENT '작업 구분',
  color varchar(100) NULL COMMENT '색상',
  header_label1 varchar(50)  NULL COMMENT '헤더 라벨 1',
  header_label2 varchar(50)  NULL COMMENT '헤더 라벨 2',
  header_label3 varchar(50)  NULL COMMENT '헤더 라벨 3',
  item_code varchar(255) NULL COMMENT '품번',
  item_name varchar(255) NULL COMMENT '품명',
  source_type varchar(50)  NULL COMMENT '소스 구분',
  source_key varchar(255) NULL COMMENT '소스 키',
  reg_dt datetime     NULL COMMENT '등록일자',
  mod_dt datetime     NULL COMMENT '수정일시',
  PRIMARY KEY (ship_report_sq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 출하성적서 ROLL 단위 디테일.
CREATE TABLE IF NOT EXISTS mes_shipment_report_item_tb (
  item_sq bigint       NOT NULL AUTO_INCREMENT COMMENT '품목 PK',
  ship_report_sq bigint       NULL COMMENT '출하보고서 FK',
  row_no int          NULL COMMENT '행 번호',
  roll_no varchar(50)  NULL COMMENT '롤 번호',
  width double       NULL COMMENT '폭(mm)',
  `length` double       NULL COMMENT '길이(m)',
  roll_weight double       NULL COMMENT '롤 중량',
  roll_basis double       NULL COMMENT '롤 평량',
  weight_left double       NULL COMMENT '좌측 중량',
  weight_center double       NULL COMMENT '중앙 중량',
  weight_right double       NULL COMMENT '우측 중량',
  PRIMARY KEY (item_sq),
  CONSTRAINT fk_ship_report_item FOREIGN KEY (ship_report_sq) REFERENCES mes_shipment_report_tb(ship_report_sq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mes_collection_tb (
  collection_sq bigint       NOT NULL AUTO_INCREMENT COMMENT '수금 PK',
  customer_sq bigint       NOT NULL COMMENT '거래처 FK',
  customer_code varchar(255) NULL COMMENT '거래처번호',
  customer_name varchar(255) NULL COMMENT '거래처명',
  collection_date date         NULL COMMENT '수금일자',
  payment_terms varchar(255) NULL COMMENT '결제조건',
  supply_amt decimal(15,2) NULL COMMENT '공급가액',
  vat_amt decimal(15,2) NULL COMMENT '부가세',
  total_amt decimal(15,2) NULL COMMENT '금액',
  total_collection_amt decimal(15,2) NULL COMMENT '수금액',
  balance decimal(15,2) NULL COMMENT '잔액',
  registrant varchar(255) NULL COMMENT '등록자',
  remark varchar(255) NULL COMMENT '비고',
  reg_dt datetime     NULL COMMENT '등록일자',
  mod_dt datetime     NULL COMMENT '수정일시',
  PRIMARY KEY (collection_sq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mes_collection_dtl_tb (
  collection_dtl_sq bigint       NOT NULL AUTO_INCREMENT COMMENT '수금상세 PK',
  collection_sq bigint       NULL COMMENT '수금 FK',
  ship_result_sq bigint       NULL COMMENT '출하실적 FK',
  lot_no varchar(255) NULL COMMENT '출하 Lot-No',
  ship_date date         NULL COMMENT '일자',
  sales_amt decimal(15,2) NULL COMMENT '매출액\n(출하금액)',
  sales_accum decimal(15,2) NULL COMMENT '매출누계',
  collection_amt decimal(15,2) NULL COMMENT '수금액',
  collection_accum decimal(15,2) NULL COMMENT '수금누계',
  balance decimal(15,2) NULL COMMENT '잔액',
  remark varchar(255) NULL COMMENT '비고',
  PRIMARY KEY (collection_dtl_sq),
  CONSTRAINT fk_collection_dtl FOREIGN KEY (collection_sq) REFERENCES mes_collection_tb(collection_sq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mes_ncr_tb (
  ncr_sq bigint       NOT NULL AUTO_INCREMENT COMMENT '부적합보고서 PK',
  occur_type varchar(255) NOT NULL COMMENT '발생 유형',
  occur_date date         NOT NULL COMMENT '발생일자',
  occur_place varchar(255) NULL COMMENT '발생 장소',
  item_sq bigint       NOT NULL COMMENT '품목 FK',
  lot_no varchar(255) NULL COMMENT '출하 Lot-No',
  bad_qty int          NOT NULL COMMENT '불량수량',
  defect_type varchar(255) NULL COMMENT '결함 유형',
  finder_nm varchar(255) NOT NULL COMMENT '발견자명',
  action_date date         NULL COMMENT '조치일자',
  action_content varchar(255) NULL COMMENT '조치내용',
  manager_nm varchar(255) NULL COMMENT '담당자명',
  action_status     varchar(20)  NOT NULL DEFAULT 'WAIT' COMMENT 'WAIT/DONE',
  reg_dt datetime     NULL COMMENT '등록일자',
  mod_dt datetime     NULL COMMENT '수정일시',
  PRIMARY KEY (ncr_sq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mes_downtime_tb (
  downtime_sq bigint       NOT NULL AUTO_INCREMENT COMMENT '비가동 PK',
  work_order_sq bigint       NULL COMMENT '작업지시 FK',
  work_date date         NOT NULL COMMENT '생산일',
  line_sq bigint       NOT NULL COMMENT '라인 FK',
  start_dt datetime     NOT NULL COMMENT '시작일시',
  end_dt datetime     NULL COMMENT '종료일시',
  downtime_min int          NULL COMMENT '비가동(분)',
  downtime_code varchar(255) NULL COMMENT '비가동 코드',
  fault_equipment varchar(255) NULL COMMENT '고장 설비',
  action_content varchar(255) NULL COMMENT '조치내용',
  action_responsible varchar(255) NULL COMMENT '조치 책임자',
  remark varchar(255) NULL COMMENT '비고',
  reg_dt datetime     NULL COMMENT '등록일자',
  mod_dt datetime     NULL COMMENT '수정일시',
  PRIMARY KEY (downtime_sq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mes_facility_check_item_tb (
  check_item_sq bigint       NOT NULL AUTO_INCREMENT COMMENT '점검항목 PK',
  facility_sq bigint       NOT NULL COMMENT '설비 FK',
  check_item_nm varchar(255) NOT NULL COMMENT '점검항목',
  check_criteria varchar(255) NULL COMMENT '기준치',
  check_method varchar(255) NULL COMMENT '점검방법',
  check_cycle varchar(255) NULL COMMENT '점검주기',
  min_val varchar(255) NULL COMMENT '하한치',
  max_val varchar(255) NULL COMMENT '상한치',
  remark varchar(255) NULL COMMENT '비고',
  unit varchar(255) NULL COMMENT '단위',
  check_item_img longtext     NULL COMMENT '점검항목 이미지',
  sort_order int          NULL COMMENT '정렬 순서',
  use_yn tinyint(1)   NULL COMMENT '사용유무',
  reg_dt datetime     NULL COMMENT '등록일자',
  mod_dt datetime     NULL COMMENT '수정일시',
  PRIMARY KEY (check_item_sq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mes_facility_daily_check_tb (
  result_sq bigint       NOT NULL AUTO_INCREMENT COMMENT '결과 PK',
  facility_sq bigint       NOT NULL COMMENT '설비 FK',
  check_item_sq bigint       NOT NULL COMMENT '점검항목 FK',
  check_date date         NOT NULL COMMENT '생산일자',
  check_time time         NULL COMMENT '점검시각',
  check_val double NULL COMMENT '점검값',
  check_result varchar(10)  NOT NULL COMMENT '점검 결과',  -- 점검 결과 (OK/NG)
  action_content varchar(255) NULL COMMENT '조치내용',
  remark varchar(255) NULL COMMENT '비고',
  checker_id varchar(255) NULL COMMENT '점검자 ID',
  reg_dt datetime     NULL COMMENT '등록일자',
  mod_dt datetime     NULL COMMENT '수정일시',
  PRIMARY KEY (result_sq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mes_facility_regular_check_tb (
  regular_check_sq bigint       NOT NULL AUTO_INCREMENT COMMENT '정기점검 PK',
  facility_sq bigint       NOT NULL COMMENT '설비 FK',
  check_type varchar(255) NULL COMMENT '구분',
  checker_nm varchar(255) NULL COMMENT '점검자',
  plan_date date         NULL COMMENT '계획일자',
  plan_content varchar(255) NULL COMMENT '계획내용',
  exec_date date         NULL COMMENT '실시일자',
  exec_content varchar(255) NULL COMMENT '실시내용',
  exec_result varchar(255) NULL COMMENT '수행 결과',
  current_status varchar(255) NULL COMMENT '현재상태',
  remark varchar(255) NULL COMMENT '비고',
  use_yn tinyint(1)   NULL COMMENT '사용유무',
  reg_dt datetime     NULL COMMENT '등록일자',
  mod_dt datetime     NULL COMMENT '수정일시',
  PRIMARY KEY (regular_check_sq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mes_facility_spare_part_tb (
  spare_part_sq bigint       NOT NULL AUTO_INCREMENT COMMENT '예비부품 PK',
  part_no varchar(255) NOT NULL COMMENT '예비품번호',
  part_nm varchar(255) NOT NULL COMMENT '예비품명',
  spec varchar(255) NULL COMMENT '규격',
  supplier_nm varchar(255) NULL COMMENT '구입처',
  purchase_date date         NULL COMMENT '구입일자',
  purchase_price decimal(15,2) NULL COMMENT '구입금액',
  safety_stock double NULL COMMENT '안전재고량',
  current_stock double NULL COMMENT '현재고량',
  storage_loc varchar(255) NULL COMMENT '보관위치',
  use_facility varchar(255) NULL COMMENT '사용설비',
  img_paths longtext     NULL COMMENT '이미지 경로',
  remark varchar(255) NULL COMMENT '비고',
  use_yn tinyint(1)   NULL COMMENT '사용유무',
  reg_dt datetime     NULL COMMENT '등록일자',
  mod_dt datetime     NULL COMMENT '수정일시',
  PRIMARY KEY (spare_part_sq),
  UNIQUE KEY uk_spare_part_no (part_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mes_measuring_instrument_tb (
  instrument_sq bigint       NOT NULL AUTO_INCREMENT COMMENT '측정기기 PK',
  manage_no varchar(255) NOT NULL COMMENT '설비번호',
  instrument_type varchar(255) NULL COMMENT '구분',
  instrument_nm varchar(255) NOT NULL COMMENT '기기명',
  model_nm varchar(255) NULL COMMENT '모델명',
  instrument_no varchar(255) NULL COMMENT '기기번호',
  spec varchar(255) NULL COMMENT '규격',
  maker_nm varchar(255) NULL COMMENT '제작사',
  purchase_date date         NULL COMMENT '구입일자',
  purchase_price decimal(15,2) NULL COMMENT '구입금액',
  calib_cycle varchar(255) NULL COMMENT '교정주기',
  calib_agency varchar(255) NULL COMMENT '교정기관',
  last_calib_date date         NULL COMMENT '교정일자',
  next_calib_date date         NULL COMMENT '차기교정일자',
  remark varchar(255) NULL COMMENT '비고',
  img_paths longtext     NULL COMMENT '이미지 경로',
  use_yn tinyint(1)   NULL COMMENT '사용유무',
  reg_dt datetime     NULL COMMENT '등록일자',
  mod_dt datetime     NULL COMMENT '수정일시',
  PRIMARY KEY (instrument_sq),
  UNIQUE KEY uk_manage_no (manage_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mes_instrument_history_tb (
  history_sq bigint       NOT NULL AUTO_INCREMENT COMMENT '이력 PK',
  instrument_sq bigint       NOT NULL COMMENT '측정기기 FK',
  history_type varchar(255) NULL COMMENT '이력구분',
  occur_date date         NOT NULL COMMENT '발생일자',
  agency_nm varchar(255) NULL COMMENT '교정기관',
  action_content varchar(255) NULL COMMENT '조치내용',
  action_cost decimal(15,2) NULL COMMENT '조치비용',
  worker_nm varchar(255) NULL COMMENT '작업자명',
  report_file_path longtext     NULL COMMENT '검교정성적서',
  report_file_nm varchar(255) NULL COMMENT '보고서 파일명',
  remark varchar(255) NULL COMMENT '비고',
  use_yn tinyint(1)   NULL COMMENT '사용유무',
  reg_dt datetime     NULL COMMENT '등록일자',
  mod_dt datetime     NULL COMMENT '수정일시',
  PRIMARY KEY (history_sq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mes_inventory_audit_tb (
  audit_sq bigint       NOT NULL AUTO_INCREMENT COMMENT '감사 PK',
  item_code varchar(255) NOT NULL COMMENT '품번',
  item_name varchar(255) NULL COMMENT '품명',
  lot_no varchar(255) NULL COMMENT '출하 Lot-No',
  account_label varchar(255) NULL COMMENT '계정구분',
  current_qty double NULL COMMENT '재고',
  measured_qty double NULL COMMENT '측정재고',
  diff_qty double NULL COMMENT '차이',
  warehouse_loc varchar(255) NULL COMMENT '창고위치',
  storage_loc varchar(255) NULL COMMENT '보관위치',
  applied_yn varchar(1)   NULL COMMENT 'Y: 관리자 재고조정으로 반영됨, N/null: 미반영',
  applied_dt datetime     NULL COMMENT '조정일자',
  applied_writer_id varchar(255) NULL COMMENT '적용 작성자 ID',
  applied_remark varchar(255) NULL COMMENT '적용 비고',
  reg_dt datetime     NULL COMMENT '등록일자',
  mod_dt datetime     NULL COMMENT '수정일시',
  PRIMARY KEY (audit_sq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mes_process_inspect_result_tb (
  result_sq bigint       NOT NULL AUTO_INCREMENT COMMENT '결과 PK',
  work_order_sq bigint       NOT NULL COMMENT '작업지시 FK',
  inspect_std_sq bigint       NOT NULL COMMENT '검사기준 FK',
  item_dtl_sq bigint       NOT NULL COMMENT '검사항목 FK',
  inspect_date date         NULL COMMENT '검사일자',
  inspector varchar(255) NULL COMMENT '검사자',
  first_val varchar(255) NULL COMMENT '초품',
  last_val varchar(255) NULL COMMENT '종품',
  pass_fail varchar(255) NULL COMMENT '합부',
  inspect_phase varchar(255) NULL COMMENT '검사 단계',
  -- 검사 시점 기준 스냅샷 (등록 후 기준서 변경되어도 과거 결과는 등록 시점 기준 유지)
  inspect_item_nm   varchar(200) NULL COMMENT '스냅샷: 검사항목명',
  inspect_criteria  varchar(500) NULL COMMENT '스냅샷: 검사기준',
  measure_type      varchar(20)  NULL COMMENT '스냅샷: 정성/정량',
  inspect_method    varchar(100) NULL COMMENT '스냅샷: 검사방법',
  inspect_cycle     varchar(50)  NULL COMMENT '스냅샷: 검사주기',
  sample_cnt        varchar(20)  NULL COMMENT '스냅샷: 시료수',
  base_val          varchar(50)  NULL COMMENT '스냅샷: 기준치',
  max_val           varchar(50)  NULL COMMENT '스냅샷: 상한치',
  min_val           varchar(50)  NULL COMMENT '스냅샷: 하한치',
  reg_dt datetime     NULL COMMENT '등록일자',
  mod_dt datetime     NULL COMMENT '수정일시',
  PRIMARY KEY (result_sq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 성능 인덱스
-- ============================================================
CREATE INDEX idx_work_order_date ON mes_work_order_tb (work_order_date);
CREATE INDEX idx_work_order_item ON mes_work_order_tb (item_sq);
CREATE INDEX idx_work_result_date ON mes_work_result_tb (work_date);
CREATE INDEX idx_work_result_order ON mes_work_result_tb (work_order_sq);
CREATE INDEX idx_ship_order_date ON mes_shipment_order_tb (expected_ship_date);
CREATE INDEX idx_ship_order_dtl_order ON mes_shipment_order_dtl_tb (ship_order_sq);
CREATE INDEX idx_ship_order_dtl_item ON mes_shipment_order_dtl_tb (item_sq);
CREATE INDEX idx_ship_inspect_date ON mes_shipment_inspect_tb (inspect_date);
CREATE INDEX idx_ship_inspect_dtl ON mes_shipment_inspect_tb (ship_dtl_sq);
CREATE INDEX idx_ncr_date ON mes_ncr_tb (occur_date);
CREATE INDEX idx_ncr_item ON mes_ncr_tb (item_sq);
CREATE INDEX idx_product_stock_item ON mes_product_stock_tb (item_sq);
CREATE INDEX idx_product_stock_lot ON mes_product_stock_tb (lot_no);
CREATE INDEX idx_work_result_dtl_result ON mes_work_result_dtl_tb (result_sq);
CREATE INDEX idx_facility_check_item_fac ON mes_facility_check_item_tb (facility_sq);
CREATE INDEX idx_daily_check_date ON mes_facility_daily_check_tb (check_date);
CREATE INDEX idx_daily_check_facility ON mes_facility_daily_check_tb (facility_sq);
CREATE INDEX idx_instrument_history ON mes_instrument_history_tb (instrument_sq);

-- LOT 추적/조회 성능 인덱스 (findByLotNo 대응)
CREATE INDEX idx_work_result_dtl_lot ON mes_work_result_dtl_tb (lot_no);
CREATE INDEX idx_shipment_plan_lot ON mes_shipment_plan_tb (lot_no);
CREATE INDEX idx_shipment_result_lot ON mes_shipment_result_tb (lot_no);
CREATE INDEX idx_shipment_inspect_lot ON mes_shipment_inspect_tb (lot_no);

-- 출하실적 연관 조회 인덱스 (findByShipDtlSqIn, findByItemSqIn)
CREATE INDEX idx_shipment_result_dtl ON mes_shipment_result_tb (ship_dtl_sq);
CREATE INDEX idx_shipment_result_item ON mes_shipment_result_tb (item_sq);

-- 출하실적 날짜별 조회 인덱스 (출하관리 화면 검색용)
CREATE INDEX idx_shipment_result_date ON mes_shipment_result_tb (ship_date);

-- 출하지시상세 연관 조회 인덱스 (findByPlanSqIn)
CREATE INDEX idx_ship_order_dtl_plan ON mes_shipment_order_dtl_tb (plan_sq);

-- 출하검사 등록 대상 조회 인덱스 (findInspectionTargets - shipStatus = WAIT 필터)
CREATE INDEX idx_ship_order_dtl_status ON mes_shipment_order_dtl_tb (ship_status);

-- 자재 입고 품목별 조회 인덱스 (findByItemSq - LOT 추적용)
CREATE INDEX idx_material_inbound_item ON mes_material_inbound_tb (item_sq);

-- 공정검사 결과 작업지시별 조회 인덱스 (findByWorkOrderSqIn)
CREATE INDEX idx_process_inspect_result_wo ON mes_process_inspect_result_tb (work_order_sq);

-- 작업지시상세 LOT 조회 인덱스 (findByLotNoIn — 태블릿 재고실사 lot-list, LOT 추적 등)
CREATE INDEX idx_work_order_dtl_lot ON mes_work_order_dtl_tb (lot_no);

-- 재고실사 등록일자 범위 조회 인덱스 (getTodayInventoryAudit — reg_dt range)
CREATE INDEX idx_inventory_audit_reg_dt ON mes_inventory_audit_tb (reg_dt);

-- 자재입고 입고일자 범위 조회 인덱스 (findBySearchCondition — 입고현황/검사/재고현황 공통)
CREATE INDEX idx_material_inbound_date ON mes_material_inbound_tb (inbound_date);

-- ============================================================
-- missing_index_audit.md 후속 — P1 + 영향 큰 P2 인덱스 추가
-- ============================================================

-- P1: NCR LOT별 자동삭제 가드 (출하/생산 취소 시마다 호출)
CREATE INDEX idx_ncr_lot ON mes_ncr_tb (lot_no);

-- P1: 단가 키 매칭 (매 출하/매출 등록마다 lookup; project_unit_price_key 정의)
CREATE INDEX idx_unit_price_key ON mes_unit_price_tb (item_sq, customer_sq, price_type);

-- P1: 검사표준 품목 lookup (입고/공정/출하검사 등록 시점)
CREATE INDEX idx_inspect_std_item ON mes_inspect_std_tb (item_sq);

-- P2: 비가동 작업지시별 조회 (WorkResult 가드 컨텍스트)
CREATE INDEX idx_downtime_work_order ON mes_downtime_tb (work_order_sq);

-- P2: 거래명세서 출하지시별 자동조회 (UNIQUE 후보)
CREATE INDEX idx_trade_stmt_ship_order ON mes_trade_statement_tb (ship_order_sq);

-- P2: 거래명세서 소스 역참조 (매출현황/거래처원장)
CREATE INDEX idx_trade_stmt_source ON mes_trade_statement_tb (source_type, source_key);

-- P2: 출하성적서 출하지시별 자동조회 (UNIQUE 후보)
CREATE INDEX idx_ship_report_ship_order ON mes_shipment_report_tb (ship_order_sq);

-- P2: 출하성적서 소스 역참조 (외부 발행 경로 대비)
CREATE INDEX idx_ship_report_source ON mes_shipment_report_tb (source_type, source_key);

-- P2: 자재재고 upsert key (입고마다 race-safe lookup)
CREATE UNIQUE INDEX uk_material_stock_item_lot ON mes_material_stock_tb (item_sq, lot_no);

-- P2: 자재재고 이력 history 조회 (latest qty as-of)
CREATE INDEX idx_mat_hist_stock_date ON mes_material_stock_history_tb (stock_sq, reg_dt);

-- P2: 출하계획 기간 조회 + 재고 계산 + 대시보드
CREATE INDEX idx_shipment_plan_date ON mes_shipment_plan_tb (expected_ship_date);
CREATE INDEX idx_shipment_plan_sodtl ON mes_shipment_plan_tb (sales_order_dtl_sq);

-- P2: 출하지시 상세 제품LOT별 예약수량 (가용재고 계산)
CREATE INDEX idx_ship_order_dtl_prod_lot ON mes_shipment_order_dtl_tb (product_lot_no);

-- P2: 수주/발주 거래처별 기간 조회
CREATE INDEX idx_sales_order_customer_date ON mes_sales_order_tb (customer_sq, order_date);
CREATE INDEX idx_purchase_order_customer_date ON mes_purchase_order_tb (customer_sq, order_date);

-- P2: 설비점검 이력 (facility_sq + occur_date)
CREATE INDEX idx_facility_hist_fac_date ON mes_facility_history_tb (facility_sq, occur_date);

SET FOREIGN_KEY_CHECKS = 1;
