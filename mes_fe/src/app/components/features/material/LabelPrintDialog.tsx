import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../ui/dialog";
import { Button } from "../../ui/button";

interface LabelItem {
  purchaseLotNo: string;
  storageLocation: string;
  itemCode: string;
  itemName: string;
}

interface LabelPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: LabelItem[];
}

export function LabelPrintDialog({
  open,
  onOpenChange,
  items,
}: LabelPrintDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printRef.current) return;

    const cards = printRef.current.querySelectorAll(".label-card");
    const labelPages = Array.from(cards).map(card => {
      const canvas = card.querySelector("canvas");
      const dataUrl = canvas ? canvas.toDataURL("image/png") : "";
      return `<div class="label-card"><img src="${dataUrl}" /></div>`;
    }).join("");

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.top = "-10000px";
    iframe.style.left = "-10000px";
    iframe.style.width = "0";
    iframe.style.height = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <html>
        <head>
          <title>부품식별표 인쇄</title>
          <style>
            @page {
              size: 100mm 60mm;
              margin: 2mm;
            }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Malgun Gothic', sans-serif; }
            .label-card {
              width: 96mm;
              height: 56mm;
              display: flex;
              justify-content: center;
              align-items: center;
              page-break-after: always;
              overflow: hidden;
            }
            .label-card:last-child {
              page-break-after: auto;
            }
            img {
              width: 50mm;
              height: 50mm;
              image-rendering: pixelated;
              image-rendering: -moz-crisp-edges;
              image-rendering: crisp-edges;
            }
          </style>
        </head>
        <body>${labelPages}</body>
      </html>
    `);
    doc.close();

    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 300);
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[#5B6FD8]">
            부품식별표 발행
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            선택된 항목의 바코드 라벨을 인쇄합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3" ref={printRef}>
          {items.map((item, index) => {
            const qrValue = `${item.purchaseLotNo}|${item.storageLocation}|${item.itemCode}|${item.itemName}`;
            return (
              <div
                key={index}
                className="label-card border border-gray-200 rounded-lg p-5 flex flex-col items-center justify-center"
              >
                <QRCodeCanvas value={qrValue} size={150} />
                <div className="label-text-area mt-2 text-center">
                  <span className="text-xs text-gray-500">{item.purchaseLotNo}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="px-6 h-8 text-xs"
          >
            취소
          </Button>
          <Button
            onClick={handlePrint}
            disabled={items.length === 0}
            className="bg-[#5B6FD8] hover:bg-[#4A5CC7] text-white px-6 h-8 text-xs"
          >
            선택 항목 인쇄
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
