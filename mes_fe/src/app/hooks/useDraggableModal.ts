import { useRef, useState } from "react";
import type { MouseEvent } from "react";

/**
 * 모달을 마우스로 끌어 위치를 옮길 수 있게 해주는 공용 훅.
 *
 * 컨테이너에 `onMouseMove={whileDrag}` / `onMouseUp={endDrag}` 를,
 * 끌 손잡이(헤더 등)에 `onMouseDown={beginDrag}` 를 연결하고
 * 모달 위치 계산에 `offset.x/offset.y` 를 쓰면 된다. `reset()` 으로 위치를 원점으로 되돌린다.
 */
export function useDraggableModal() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const grabPoint = useRef({ x: 0, y: 0 });

  // 드래그 시작: 클릭 지점과 현재 위치의 차이를 기억해 둔다.
  const beginDrag = (e: MouseEvent) => {
    setIsDragging(true);
    grabPoint.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  // 드래그 중: 마우스 이동량만큼 모달 위치를 갱신한다.
  const whileDrag = (e: MouseEvent) => {
    if (!isDragging) return;
    setOffset({ x: e.clientX - grabPoint.current.x, y: e.clientY - grabPoint.current.y });
  };

  const endDrag = () => setIsDragging(false);

  // 위치를 원점(0,0)으로 되돌린다(모달 재오픈 시 사용).
  const reset = () => setOffset({ x: 0, y: 0 });

  return { offset, isDragging, beginDrag, whileDrag, endDrag, reset };
}
