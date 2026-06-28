package com.mes.domain.dashboard.service;

import java.time.LocalDate;

/** 판정 표 스테이징 — 정렬 후 DTO로 매핑하기 위한 임시 구조. */
final class JudgementStage {
  Long resultDtlSq;
  LocalDate workDate;
  String lineName;
  String itemCode;
  String itemName;
  String lotNo;
  Integer rollNo;
  double basisWeight;
  double realBasisWeight;
  double deviationRate;
  double absDeviationRate;
  String judgement;
}
