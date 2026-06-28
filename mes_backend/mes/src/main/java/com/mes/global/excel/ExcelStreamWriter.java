package com.mes.global.excel;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.xssf.streaming.SXSSFSheet;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;

import java.io.IOException;
import java.io.OutputStream;
import java.util.List;

/**
 * SXSSF 기반 스트리밍 .xlsx 작성기.
 *
 * <p>수만~수십만 row 를 메모리에 한꺼번에 올리지 않고, 일정 행만 메모리에 두고 나머지는 임시 파일로
 * 흘리며 기록한다. 호출 측은 {@link #writeRows(Iterable)} / {@link #writeRow(Object)} 로 행을 채운 뒤
 * {@link #writeTo(OutputStream)} 로 HTTP 응답 스트림에 바로 내보낸다.
 *
 * <p>임시 파일·메모리 정리를 위해 사용 후 반드시 {@link #close()} 한다(try-with-resources 권장).
 *
 * @param <T> 한 행을 표현하는 객체 타입
 */
public final class ExcelStreamWriter<T> implements AutoCloseable {

  /** 메모리에 유지할 행 수. 이 수를 넘어선 행은 디스크 임시 파일로 flush 된다. */
  private static final int IN_MEMORY_ROWS = 100;

  private final SXSSFWorkbook workbook;
  private final SXSSFSheet sheet;
  private final List<ExcelColumn<T>> columns;
  private final CellStyle headerStyle;
  private int nextRow;

  public ExcelStreamWriter(String sheetName, List<ExcelColumn<T>> columns) {
    if (columns == null || columns.isEmpty()) {
      throw new IllegalArgumentException("columns must not be empty");
    }
    this.columns = columns;
    this.workbook = new SXSSFWorkbook(IN_MEMORY_ROWS);
    this.workbook.setCompressTempFiles(true);
    this.sheet = workbook.createSheet(sheetName);
    this.headerStyle = buildHeaderStyle();
    appendHeaderRow();
  }

  public void writeRows(Iterable<T> rows) {
    rows.forEach(this::writeRow);
  }

  public void writeRow(T item) {
    Row row = sheet.createRow(nextRow++);
    for (int col = 0; col < columns.size(); col++) {
      fillCell(row.createCell(col), columns.get(col).getter().apply(item));
    }
  }

  public void writeTo(OutputStream out) throws IOException {
    workbook.write(out);
    out.flush();
  }

  @Override
  public void close() throws IOException {
    try {
      workbook.dispose(); // SXSSF 임시 파일 제거
    } finally {
      workbook.close();
    }
  }

  private void appendHeaderRow() {
    Row header = sheet.createRow(nextRow++);
    for (int col = 0; col < columns.size(); col++) {
      Cell cell = header.createCell(col);
      cell.setCellValue(columns.get(col).header());
      cell.setCellStyle(headerStyle);
    }
  }

  private CellStyle buildHeaderStyle() {
    Font font = workbook.createFont();
    font.setBold(true);
    font.setColor(IndexedColors.WHITE.getIndex());

    CellStyle style = workbook.createCellStyle();
    style.setFont(font);
    style.setAlignment(HorizontalAlignment.CENTER);
    style.setFillForegroundColor(IndexedColors.GREY_50_PERCENT.getIndex());
    style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
    return style;
  }

  /**
   * 값 타입에 맞춰 셀에 기록한다. 숫자류(BigDecimal 포함)는 double 로, boolean 은 그대로,
   * 그 외(날짜·문자열 등)는 {@code toString()} 으로 적는다. null 이면 빈 칸.
   */
  private void fillCell(Cell cell, Object value) {
    if (value == null) {
      cell.setBlank();
    } else if (value instanceof Number number) {
      cell.setCellValue(number.doubleValue());
    } else if (value instanceof Boolean flag) {
      cell.setCellValue(flag);
    } else {
      cell.setCellValue(value.toString());
    }
  }
}
