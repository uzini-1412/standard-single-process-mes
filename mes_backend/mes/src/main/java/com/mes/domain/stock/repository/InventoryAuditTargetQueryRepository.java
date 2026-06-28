package com.mes.domain.stock.repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import com.mes.domain.stock.dto.ProductStockDto;
import com.mes.global.response.PageResponse;

/**
 * JDBC read model behind the tablet stock-take screen.
 *
 * <p>Material and product stock are normalised into a common column set and stitched
 * together with UNION ALL (see {@link #unifiedTargets()}). Each candidate row then gets
 * today's most-recent measured value bolted on through a correlated sub-select, which is
 * what tells the UI whether the LOT has already been counted today.</p>
 */
@Repository
@RequiredArgsConstructor
public class InventoryAuditTargetQueryRepository {

  /** Column projection shared by the material and product legs of the UNION. */
  private static final String OUTPUT_COLUMNS =
      "stock_type, stock_sq, item_code, item_name, account_type, item_type, lot_no, "
      + "current_qty, unit, width, warehouse_loc, storage_loc";

  /** Material leg: kg-based remaining qty, item-spec fallback for width / warehouse. */
  private static final String MATERIAL_LEG = """
      SELECT 'MATERIAL' AS stock_type, s.stock_sq, i.item_cd AS item_code, i.item_nm AS item_name,
             i.account_type, i.item_type, s.lot_no, CAST(s.current_qty AS DECIMAL(20, 4)) AS current_qty,
             'kg' AS unit,
             COALESCE(i.width, (SELECT sp.width FROM mes_item_spec_tb sp
               WHERE sp.item_sq = i.item_sq ORDER BY sp.spec_order ASC, sp.item_spec_sq ASC LIMIT 1)) AS width,
             (SELECT sp.warehouse_loc FROM mes_item_spec_tb sp
               WHERE sp.item_sq = i.item_sq AND sp.warehouse_loc IS NOT NULL AND sp.warehouse_loc <> ''
               ORDER BY sp.spec_order ASC, sp.item_spec_sq ASC LIMIT 1) AS warehouse_loc,
             s.warehouse_loc AS storage_loc
      FROM mes_material_stock_tb s
      JOIN mes_item_tb i ON i.item_sq = s.item_sq
      WHERE s.current_qty > 0 AND i.use_yn = true
      """;

  /** Product leg: EA-based remaining qty, accepts either positive EA or positive m. */
  private static final String PRODUCT_LEG = """
      SELECT 'PRODUCT' AS stock_type, s.stock_sq, i.item_cd AS item_code, i.item_nm AS item_name,
             COALESCE(i.account_type, '완제품') AS account_type, i.item_type, s.lot_no,
             CAST(COALESCE(s.current_qty_ea, 0) AS DECIMAL(20, 4)) AS current_qty, 'ea' AS unit,
             COALESCE(s.width, i.width, (SELECT sp.width FROM mes_item_spec_tb sp
               WHERE sp.item_sq = i.item_sq ORDER BY sp.spec_order ASC, sp.item_spec_sq ASC LIMIT 1)) AS width,
             (SELECT sp.warehouse_loc FROM mes_item_spec_tb sp
               WHERE sp.item_sq = i.item_sq AND sp.warehouse_loc IS NOT NULL AND sp.warehouse_loc <> ''
               ORDER BY sp.spec_order ASC, sp.item_spec_sq ASC LIMIT 1) AS warehouse_loc,
             s.storage_loc
      FROM mes_product_stock_tb s
      JOIN mes_item_tb i ON i.item_sq = s.item_sq
      WHERE ((s.current_qty_ea IS NOT NULL AND s.current_qty_ea > 0)
        OR (s.current_qty_m IS NOT NULL AND s.current_qty_m > 0))
        AND i.use_yn = true
      """;

  /** Correlated sub-select that pulls today's latest measured_qty for the current row. */
  private static final String MEASURED_TODAY =
      ", (SELECT a.measured_qty FROM mes_inventory_audit_tb a "
      + "WHERE a.item_code = targets.item_code AND a.lot_no = targets.lot_no "
      + "AND a.reg_dt >= :startOfDay AND a.reg_dt < :endOfDay "
      + "ORDER BY a.reg_dt DESC, a.audit_sq DESC LIMIT 1) AS measured_qty";

  private static final String ROW_ORDER =
      " ORDER BY item_code ASC, lot_no ASC, stock_type ASC, stock_sq ASC";

  private final NamedParameterJdbcTemplate jdbcTemplate;

  public PageResponse<ProductStockDto.AuditTargetRes> findPage(int page, int size, String accountType) {
    boolean filtered = accountType != null && !accountType.isBlank();
    String where = filtered ? " WHERE account_type = :accountType" : "";

    MapSqlParameterSource params = todayWindow()
        .addValue("accountType", filtered ? accountType : null)
        .addValue("size", size)
        .addValue("offset", page * size);

    String fromTargets = " FROM (" + unifiedTargets() + ") targets";
    String contentSql = "SELECT targets.*" + MEASURED_TODAY + fromTargets + where
        + ROW_ORDER + " LIMIT :size OFFSET :offset";
    String countSql = "SELECT COUNT(*)" + fromTargets + where;

    List<ProductStockDto.AuditTargetRes> content = jdbcTemplate.query(contentSql, params, this::mapRow);
    Long total = jdbcTemplate.queryForObject(countSql, params, Long.class);
    return PageResponse.of(content, page, size, total == null ? 0L : total);
  }

  public List<ProductStockDto.AuditTargetRes> findByLotNo(String lotNo) {
    MapSqlParameterSource params = todayWindow().addValue("lotNo", lotNo);
    String sql = "SELECT targets.*" + MEASURED_TODAY
        + " FROM (" + unifiedTargets() + ") targets WHERE lot_no = :lotNo" + ROW_ORDER;
    return jdbcTemplate.query(sql, params, this::mapRow);
  }

  /** Builds the material+product UNION wrapped in the shared projection. */
  private static String unifiedTargets() {
    return "SELECT " + OUTPUT_COLUMNS + " FROM ("
        + MATERIAL_LEG + " UNION ALL " + PRODUCT_LEG
        + ") targets";
  }

  /** Param source pre-loaded with [today 00:00, tomorrow 00:00) for the measured sub-select. */
  private MapSqlParameterSource todayWindow() {
    LocalDate today = LocalDate.now();
    return new MapSqlParameterSource()
        .addValue("startOfDay", today.atStartOfDay())
        .addValue("endOfDay", today.plusDays(1).atStartOfDay());
  }

  private ProductStockDto.AuditTargetRes mapRow(ResultSet rs, int rowNum) throws SQLException {
    ProductStockDto.AuditTargetRes row = new ProductStockDto.AuditTargetRes();
    row.setStockType(rs.getString("stock_type"));
    row.setStockSq(rs.getLong("stock_sq"));
    row.setItemCode(rs.getString("item_code"));
    row.setItemName(rs.getString("item_name"));
    row.setAccountType(rs.getString("account_type"));
    row.setItemType(rs.getString("item_type"));
    row.setLotNo(rs.getString("lot_no"));
    row.setCurrentQty(rs.getDouble("current_qty"));
    row.setUnit(rs.getString("unit"));
    row.setWidth(nullableDouble(rs, "width"));
    row.setWarehouseLoc(rs.getString("warehouse_loc"));
    row.setStorageLoc(rs.getString("storage_loc"));

    Double measured = nullableDouble(rs, "measured_qty");
    row.setMeasuredQty(measured);
    row.setAuditedToday(measured != null);
    return row;
  }

  /** SQL NULL 을 자바 {@code null} 로 보존하면서 double 컬럼을 읽는다. */
  private static Double nullableDouble(ResultSet rs, String column) throws SQLException {
    double value = rs.getDouble(column);
    return rs.wasNull() ? null : value;
  }
}
