package com.mes.domain.dashboard.service;

/** 평균/표준편차/min/max 누적기 */
final class Accumulator {
  int count = 0;
  double sum = 0.0;
  double sumSq = 0.0;
  double min = Double.POSITIVE_INFINITY;
  double max = Double.NEGATIVE_INFINITY;
  void add(double v) {
    count += 1;
    sum += v;
    sumSq += v * v;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  double mean() { return count == 0 ? 0.0 : sum / count; }
  double stddev() {
    if (count < 2) return 0.0;
    double m = mean();
    double variance = (sumSq - count * m * m) / (count - 1);
    return variance > 0 ? Math.sqrt(variance) : 0.0;
  }
  double cv() {
    double m = mean();
    return m == 0 ? 0.0 : (stddev() / Math.abs(m)) * 100.0;
  }
}
