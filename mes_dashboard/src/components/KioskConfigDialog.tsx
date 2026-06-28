import { useEffect, useState } from 'react'
import type { BoardMenuEntry, BoardKey } from '../types'

export type NoticeDisplayMode = 'full' | 'contentOnly'

export type KioskRotationConfig = {
  enabled: boolean
  rotateViews: BoardKey[]
  intervalSec: number
  viewVariants: Partial<Record<BoardKey, NoticeDisplayMode>>
}

type DialogProps = {
  isOpen: boolean
  menuItems: BoardMenuEntry[]
  config: KioskRotationConfig
  /** URL 쿼리(?mode=kiosk)로 들어온 키오스크 진입 여부 — true면 순환 토글과 공지 표시방식 UI를 가리고 항상 ON + 안내만 표시로 고정 */
  isKioskUrl?: boolean
  onClose: () => void
  onSave: (config: KioskRotationConfig) => void
}

// 전환 간격 허용 범위(초)
const SECONDS_LOWER_BOUND = 5
const SECONDS_UPPER_BOUND = 300

// 공지 보드의 표시방식별 한글 표기
const MODE_TEXT: Record<NoticeDisplayMode, string> = {
  full: '전체 화면',
  contentOnly: '안내만 표시',
}

// 표시방식 선택지를 갖는 보드와 그 후보 목록
const MODE_CHOICES_BY_VIEW: Partial<Record<BoardKey, NoticeDisplayMode[]>> = {
  notice: ['full', 'contentOnly'],
}

// 입력된 초 값을 정수로 다듬고 허용 범위 안으로 가둔다
function fitIntoRange(raw: number): number {
  const asInt = Math.floor(raw) || SECONDS_LOWER_BOUND
  const notTooLow = Math.max(SECONDS_LOWER_BOUND, asInt)
  return Math.min(SECONDS_UPPER_BOUND, notTooLow)
}

type MenuRowProps = {
  item: BoardMenuEntry
  selected: boolean
  activeMode: NoticeDisplayMode
  modeChoices?: NoticeDisplayMode[]
  showModes: boolean
  onToggle: (id: BoardKey) => void
  onPickMode: (id: BoardKey, mode: NoticeDisplayMode) => void
}

function MenuRow({
  item,
  selected,
  activeMode,
  modeChoices,
  showModes,
  onToggle,
  onPickMode,
}: MenuRowProps) {
  return (
    <div className="kiosk-modal__menu-item-wrap">
      <label className="kiosk-modal__menu-item">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(item.id)}
        />
        <span className="kiosk-modal__menu-label">{item.label}</span>
      </label>
      {showModes && selected && modeChoices ? (
        <div className="kiosk-modal__variant-row">
          {modeChoices.map((mode) => (
            <label key={mode} className="kiosk-modal__variant-option">
              <input
                type="radio"
                name={`variant-${item.id}`}
                checked={activeMode === mode}
                onChange={() => onPickMode(item.id, mode)}
              />
              <span>{MODE_TEXT[mode]}</span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function KioskConfigDialog({
  isOpen,
  menuItems,
  config,
  isKioskUrl = false,
  onClose,
  onSave,
}: DialogProps) {
  const [rotationOn, setRotationOn] = useState(config.enabled)
  const [pickedViews, setPickedViews] = useState<BoardKey[]>(config.rotateViews)
  const [seconds, setSeconds] = useState(config.intervalSec)
  const [modeByView, setModeByView] = useState<KioskRotationConfig['viewVariants']>(
    config.viewVariants,
  )

  // 다이얼로그가 열릴 때마다 전달받은 설정으로 폼 상태를 다시 채운다
  useEffect(() => {
    if (!isOpen) return
    setRotationOn(config.enabled)
    setPickedViews(config.rotateViews)
    setSeconds(config.intervalSec)
    setModeByView(config.viewVariants)
  }, [isOpen, config])

  if (!isOpen) return null

  // 적어도 한 개 보드가 선택돼야 순환을 켤 수 있다
  const hasSelection = pickedViews.length > 0

  const flipView = (id: BoardKey) => {
    setPickedViews((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id],
    )
  }

  const chooseMode = (id: BoardKey, mode: NoticeDisplayMode) => {
    setModeByView((current) => ({ ...current, [id]: mode }))
  }

  const commit = () => {
    onSave({
      // 키오스크 URL 진입 시엔 enabled 체크박스를 노출하지 않으므로 기존 설정값을 그대로 유지
      enabled: isKioskUrl ? config.enabled : rotationOn && hasSelection,
      rotateViews: pickedViews,
      intervalSec: fitIntoRange(seconds),
      viewVariants: modeByView,
    })
  }

  return (
    <div className="kiosk-modal-backdrop" onClick={onClose}>
      <div className="kiosk-modal" onClick={(e) => e.stopPropagation()}>
        <div className="kiosk-modal__header">
          <h2>{isKioskUrl ? '키오스크 순환 메뉴 설정' : '키오스크 자동 순환 설정'}</h2>
          {!isKioskUrl ? (
            <span className={`kiosk-modal__state${config.enabled ? ' is-on' : ''}`}>
              {config.enabled ? '● 동작 중' : '○ 꺼짐'}
            </span>
          ) : null}
          <button
            type="button"
            className="kiosk-modal__close"
            onClick={onClose}
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        <div className="kiosk-modal__body">
          {!isKioskUrl ? (
            <label
              className={`kiosk-modal__row kiosk-modal__row--toggle${rotationOn ? ' is-on' : ''}`}
            >
              <input
                type="checkbox"
                checked={rotationOn}
                onChange={(e) => setRotationOn(e.target.checked)}
                disabled={!hasSelection}
              />
              <span>
                <strong>자동 순환 사용</strong>
                <em>
                  {rotationOn
                    ? '저장하면 즉시 순환을 시작합니다.'
                    : '체크하지 않으면 저장해도 순환되지 않습니다.'}
                </em>
              </span>
            </label>
          ) : null}

          <div className="kiosk-modal__section">
            <div className="kiosk-modal__section-title">순환할 메뉴 선택</div>
            <div className="kiosk-modal__menu-list">
              {menuItems.map((item) => (
                <MenuRow
                  key={item.id}
                  item={item}
                  selected={pickedViews.includes(item.id)}
                  activeMode={modeByView[item.id] ?? 'full'}
                  modeChoices={MODE_CHOICES_BY_VIEW[item.id]}
                  showModes={!isKioskUrl}
                  onToggle={flipView}
                  onPickMode={chooseMode}
                />
              ))}
            </div>
            {!hasSelection && (
              <div className="kiosk-modal__hint">
                {isKioskUrl
                  ? '최소 1개 이상 선택해야 순환할 수 있습니다.'
                  : '최소 1개 이상 선택해야 자동 순환을 켤 수 있습니다.'}
              </div>
            )}
          </div>

          <div className="kiosk-modal__section">
            <label className="kiosk-modal__row">
              <span>전환 간격 (초)</span>
              <input
                type="number"
                min={SECONDS_LOWER_BOUND}
                max={SECONDS_UPPER_BOUND}
                value={seconds}
                onChange={(e) => setSeconds(Number(e.target.value))}
              />
            </label>
            <div className="kiosk-modal__hint">
              {SECONDS_LOWER_BOUND}~{SECONDS_UPPER_BOUND}초 사이로 설정하세요.
            </div>
          </div>
        </div>

        <div className="kiosk-modal__footer">
          <button type="button" className="kiosk-modal__btn" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className="kiosk-modal__btn kiosk-modal__btn--primary"
            onClick={commit}
          >
            {isKioskUrl ? '저장' : rotationOn && hasSelection ? '저장 후 순환 시작' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
