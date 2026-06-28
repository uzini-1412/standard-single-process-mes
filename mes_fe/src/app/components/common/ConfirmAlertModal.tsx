import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";

interface ConfirmAlertModalProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
}

export function ConfirmAlertModal({
  open,
  title = "안내",
  message,
  confirmLabel = "확인",
  onConfirm,
}: ConfirmAlertModalProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onConfirm(); }}>
      <DialogContent
        className="sm:max-w-md"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[#5B6FD8]">{title}</DialogTitle>
        </DialogHeader>
        <div className="py-2 text-sm text-gray-800 whitespace-pre-line text-center">
          {message}
        </div>
        <DialogFooter className="sm:justify-center">
          <Button
            onClick={onConfirm}
            className="bg-black hover:bg-gray-800 text-white px-6"
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
