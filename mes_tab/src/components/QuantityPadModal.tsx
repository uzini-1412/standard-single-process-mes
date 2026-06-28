// Touch-friendly numeric keypad shown in a modal overlay.
// Lets the operator key in a measured stock count against a known baseline.

type QuantityPadDialogProps = {
  visible: boolean;
  title: string;
  meta: string;
  baseQuantity: number;
  draft: string;
  onClose: () => void;
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onConfirm: () => void;
};

// Digit keys rendered as the first nine cells of the grid (1-9).
const DIGIT_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

// Turn the in-progress draft string into a localized, readable number.
function formatDraft(rawDraft: string): string {
  return Number(rawDraft || '0').toLocaleString();
}

export default function QuantityPadModal(props: QuantityPadDialogProps) {
  const {
    visible: isOpen,
    title: heading,
    meta: subText,
    baseQuantity: stockOnHand,
    draft: enteredValue,
    onClose: handleDismiss,
    onDigit: handleAppendDigit,
    onBackspace: handleRemoveDigit,
    onConfirm: handleSubmit,
  } = props;

  // Nothing to paint while the dialog is hidden.
  if (!isOpen) {
    return null;
  }

  // Stop overlay clicks from leaking through to the dismiss handler.
  const stopBubbling = (event: React.MouseEvent) => event.stopPropagation();

  // Header block: title, supporting meta line, and the close affordance.
  const headerSection = (
    <div className="quantity-pad-panel__header">
      <div>
        <div className="quantity-pad-panel__title">{heading}</div>
        <div className="quantity-pad-panel__meta">{subText}</div>
      </div>
      <button type="button" className="quantity-pad-panel__close" onClick={handleDismiss} aria-label={`${heading} 닫기`}>×</button>
    </div>
  );

  // Summary block: baseline stock figure versus the value being typed.
  const summarySection = (
    <div className="quantity-pad-panel__summary">
      <div className="quantity-pad-panel__summary-row">
        <span>현재 재고수량</span>
        <strong>{stockOnHand.toLocaleString()}</strong>
      </div>
      <div className="quantity-pad-panel__summary-row">
        <span>실사수량</span>
        <strong className="quantity-pad-panel__draft">{formatDraft(enteredValue)}</strong>
      </div>
    </div>
  );

  // Keypad grid: numeric keys followed by delete / zero / confirm actions.
  const keypadSection = (
    <div className="quantity-pad-panel__keygrid">
      {DIGIT_KEYS.map(digit => (
        <button type="button" className="quantity-pad-panel__key" key={digit} onClick={() => handleAppendDigit(digit)}>{digit}</button>
      ))}
      <button type="button" className="quantity-pad-panel__key quantity-pad-panel__key--warn" onClick={handleRemoveDigit}>삭제</button>
      <button type="button" className="quantity-pad-panel__key" onClick={() => handleAppendDigit('0')}>0</button>
      <button type="button" className="quantity-pad-panel__key quantity-pad-panel__key--confirm" onClick={handleSubmit}>확인</button>
    </div>
  );

  return (
    <div className="quantity-pad-overlay" onClick={handleDismiss}>
      <div className="quantity-pad-panel" onClick={stopBubbling}>
        {headerSection}
        {summarySection}
        {keypadSection}
      </div>
    </div>
  );
}
