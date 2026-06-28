import { useState, useEffect, useRef } from "react";
import { useDebouncedValue } from "@/app/hooks/useDebouncedValue";
import {
  fetchMeasuringInstruments,
  fetchInstrumentHistoryCards,
  InstrumentCardRes,
} from "@/app/api/instrumentApi";

/**
 * 계측기 이력카드 화면의 검색 흐름을 담당하는 훅.
 * - 전체 계측기번호 목록 적재 및 입력어 기반 자동완성 후보 산출
 * - 자동완성 패널 표시/숨김(바깥 클릭 시 닫힘)
 * - 선택/검색 시 해당 계측기의 카드 데이터 조회
 */
export function useInstrumentCardSearch() {
  const [keyword, setKeyword] = useState("");
  const [card, setCard] = useState<InstrumentCardRes | null>(null);

  const [instrumentNoPool, setInstrumentNoPool] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // 입력어를 부분일치(대소문자 무시)로 걸러 후보 목록을 만든다
  const matchPool = (text: string): string[] => {
    if (!text) return instrumentNoPool;
    const lowered = text.toLowerCase();
    return instrumentNoPool.filter((no) => no.toLowerCase().includes(lowered));
  };

  // 최초 진입 시 선택 가능한 계측기번호 전체를 받아둔다
  useEffect(() => {
    (async () => {
      try {
        const list = await fetchMeasuringInstruments();
        const numbers = list.map((row: any) => row.instrumentNo).filter(Boolean);
        setInstrumentNoPool(numbers);
      } catch (err) {
        console.error("Failed to load instrument list:", err);
      }
    })();
  }, []);

  // 입력어나 원본 목록이 바뀌면 자동완성 후보와 패널 노출 여부를 갱신
  // (타이핑이 멈춘 뒤에만 후보를 다시 거른다 — 큰 목록 필터 반복 방지)
  const debouncedKeyword = useDebouncedValue(keyword, 200);
  useEffect(() => {
    const next = debouncedKeyword ? matchPool(debouncedKeyword) : instrumentNoPool;
    setSuggestions(next);
    setIsPanelOpen(next.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedKeyword, instrumentNoPool]);

  // 패널 외부를 누르면 자동완성 닫기
  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsPanelOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  // 지정한 번호로 카드 데이터를 조회해 상태에 반영
  const loadCard = async (no: string) => {
    if (!no) return;
    try {
      const result = await fetchInstrumentHistoryCards({ keyword: no });
      const hit = result.find((row) => row.instrumentNo === no);
      setCard(hit || null);
    } catch (err) {
      console.error("Failed to search instrument history card:", err);
    }
  };

  // 자동완성 항목 클릭: 입력어 채우고 패널 닫은 뒤 즉시 조회
  const pickSuggestion = (no: string) => {
    setKeyword(no);
    setIsPanelOpen(false);
    loadCard(no);
  };

  // 검색 버튼/엔터: 현재 입력어로 조회
  const runSearch = () => {
    loadCard(keyword);
  };

  // 초기화: 입력어와 카드 데이터를 비운다
  const clear = () => {
    setKeyword("");
    setCard(null);
  };

  // 입력창 포커스 시 현재 입력어 기준으로 후보 재계산 후 패널 노출
  const openPanelForFocus = () => {
    const next = matchPool(keyword);
    setSuggestions(next);
    setIsPanelOpen(next.length > 0);
  };

  // 엔터 입력 시 패널을 닫고 검색 실행
  const handleEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      setIsPanelOpen(false);
      runSearch();
    }
  };

  return {
    keyword,
    setKeyword,
    card,
    suggestions,
    isPanelOpen,
    setIsPanelOpen,
    panelRef,
    pickSuggestion,
    runSearch,
    clear,
    openPanelForFocus,
    handleEnter,
  };
}
