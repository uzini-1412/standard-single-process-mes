import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';

const DEFAULT_DRAWER_WIDTH = 392;
const EDGE_HOTSPOT_PX = 84;
const OPEN_COMMIT_RATIO = 0.5;
const AXIS_LOCK_THRESHOLD_PX = 12;

type DragAxis = 'pending' | 'horizontal' | 'vertical';

interface UseSlidingSidebarOptions {
  disabled?: boolean;
}

// Squeeze a translateX value back into the legal [0, width] travel range.
function clampToTravel(translate: number, width: number): number {
  return Math.max(0, Math.min(width, translate));
}

// Translate a pixel offset into a normalized openness in [0, 1]; 1 means wide open.
function computeOpenness(translate: number, width: number): number {
  if (width <= 0) return 0;
  return Math.max(0, Math.min(1, 1 - translate / width));
}

// Detect whether a modal-style overlay is currently blocking the screen.
function overlayPresent(): boolean {
  return document.querySelector('.modal-bg, .lot-input-overlay') !== null;
}

export function useSlidingSidebar({ disabled = false }: UseSlidingSidebarOptions = {}) {
  // The rendered drawer node plus scratch values that live only for one gesture.
  const sidebarRef = useRef<HTMLElement | null>(null);
  const trackedPointerId = useRef<number | null>(null);
  const capturingEl = useRef<HTMLElement | null>(null);
  const dragOriginX = useRef(0);
  const dragOriginY = useRef(0);
  const baseTranslate = useRef(DEFAULT_DRAWER_WIDTH);
  const wasOpenAtGrab = useRef(false);
  const gestureAxis = useRef<DragAxis>('pending');

  const [width, setWidth] = useState(DEFAULT_DRAWER_WIDTH);
  const [translateX, setTranslateX] = useState(DEFAULT_DRAWER_WIDTH);
  const [dragging, setDragging] = useState(false);

  const limitTranslate = useCallback(
    (translate: number, span = width) => clampToTravel(translate, span),
    [width],
  );

  // Values computed from current state for rendering.
  const sidebarOpenProgress = computeOpenness(translateX, width);
  const isSidebarOpen = translateX <= 0;
  const isSidebarVisible = translateX < width;
  const edgeHandleVisible = !disabled && sidebarOpenProgress === 0 && !dragging;

  const openSidebar = useCallback(() => {
    setTranslateX(0);
  }, []);

  const closeSidebar = useCallback(() => {
    setTranslateX(width);
  }, [width]);

  const toggleSidebar = useCallback(() => {
    setTranslateX(current => (current <= 0 ? width : 0));
  }, [width]);

  // Mirror the live element's measured width so resizes don't desync the drawer.
  useEffect(() => {
    const refreshWidth = () => {
      const measured = sidebarRef.current?.offsetWidth ?? DEFAULT_DRAWER_WIDTH;
      if (!measured) return;

      setWidth(previous => {
        if (previous === measured) return previous;

        setTranslateX(currentTranslate => {
          const openPreviously = currentTranslate < previous / 2;
          // Mid-drag we only re-clamp; otherwise settle onto whichever end it held before.
          return dragging
            ? clampToTravel(currentTranslate, measured)
            : openPreviously ? 0 : measured;
        });

        return measured;
      });
    };

    refreshWidth();
    window.addEventListener('resize', refreshWidth);
    return () => window.removeEventListener('resize', refreshWidth);
  }, [dragging]);

  // Tear down an in-flight gesture if the hook flips to disabled partway through.
  useEffect(() => {
    if (disabled && dragging) {
      setDragging(false);
      trackedPointerId.current = null;
      capturingEl.current = null;
      gestureAxis.current = 'pending';
    }
  }, [disabled, dragging]);

  const beginDrag = useCallback((event: PointerEvent<HTMLElement>, openAtStart: boolean) => {
    setDragging(true);
    trackedPointerId.current = event.pointerId;
    capturingEl.current = event.currentTarget;
    dragOriginX.current = event.clientX;
    dragOriginY.current = event.clientY;
    baseTranslate.current = translateX;
    wasOpenAtGrab.current = openAtStart;
    gestureAxis.current = 'pending';
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }, [translateX]);

  const finishDrag = useCallback((landOpen: boolean) => {
    const el = capturingEl.current;
    const pid = trackedPointerId.current;

    if (el && pid !== null) {
      try {
        if (el.hasPointerCapture?.(pid)) {
          el.releasePointerCapture?.(pid);
        }
      } catch {
        // Capture can already be gone if the browser cancelled the gesture for us.
      }
    }

    setDragging(false);
    trackedPointerId.current = null;
    capturingEl.current = null;
    gestureAxis.current = 'pending';
    setTranslateX(landOpen ? 0 : width);
  }, [width]);

  const onEdgeHandlePointerDown = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    const outsideHotspot = window.innerWidth - event.clientX > EDGE_HOTSPOT_PX;
    if (
      disabled ||
      isSidebarVisible ||
      overlayPresent() ||
      outsideHotspot
    ) {
      return;
    }
    beginDrag(event, false);
  }, [beginDrag, disabled, isSidebarVisible]);

  const onSidebarPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (disabled || !isSidebarVisible || overlayPresent()) return;
    beginDrag(event, true);
  }, [beginDrag, disabled, isSidebarVisible]);

  const onPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    if (!dragging || event.pointerId !== trackedPointerId.current) return;

    const deltaX = event.clientX - dragOriginX.current;
    const deltaY = event.clientY - dragOriginY.current;
    const reachX = Math.abs(deltaX);
    const reachY = Math.abs(deltaY);

    // Lock onto an axis the moment travel clears the activation threshold.
    if (gestureAxis.current === 'pending') {
      if (reachX < AXIS_LOCK_THRESHOLD_PX && reachY < AXIS_LOCK_THRESHOLD_PX) return;

      if (reachY >= reachX) {
        // Vertical movement reads as page scrolling, so bail out of the drawer drag.
        gestureAxis.current = 'vertical';
        finishDrag(wasOpenAtGrab.current);
        return;
      }

      gestureAxis.current = 'horizontal';
    }

    if (gestureAxis.current !== 'horizontal') {
      finishDrag(wasOpenAtGrab.current);
      return;
    }

    setTranslateX(limitTranslate(baseTranslate.current + deltaX));
    event.preventDefault();
  }, [limitTranslate, finishDrag, dragging]);

  const onPointerUp = useCallback((event: PointerEvent<HTMLElement>) => {
    if (!dragging || event.pointerId !== trackedPointerId.current) return;

    if (gestureAxis.current !== 'horizontal') {
      finishDrag(wasOpenAtGrab.current);
      return;
    }

    // Snap toward whichever end is nearer at release.
    const openness = width === 0 ? 0 : (width - translateX) / width;
    finishDrag(openness >= OPEN_COMMIT_RATIO);
  }, [width, finishDrag, dragging, translateX]);

  const onPointerCancel = useCallback((event: PointerEvent<HTMLElement>) => {
    if (!dragging || event.pointerId !== trackedPointerId.current) return;
    finishDrag(wasOpenAtGrab.current);
  }, [finishDrag, dragging]);

  const sidebarStyle = useMemo<CSSProperties>(() => ({
    transform: `translateX(${translateX}px)`,
    opacity: sidebarOpenProgress,
    pointerEvents: sidebarOpenProgress > 0 ? 'auto' : 'none',
  }), [translateX, sidebarOpenProgress]);

  const backdropStyle = useMemo<CSSProperties>(() => ({
    opacity: sidebarOpenProgress * 0.5,
    pointerEvents: sidebarOpenProgress > 0 ? 'auto' : 'none',
  }), [sidebarOpenProgress]);

  return {
    sidebarRef,
    isSidebarOpen,
    isSidebarVisible,
    isDraggingSidebar: dragging,
    edgeHandleVisible,
    sidebarStyle,
    backdropStyle,
    openSidebar,
    closeSidebar,
    toggleSidebar,
    onEdgeHandlePointerDown,
    onSidebarPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  };
}
