import { AlertTriangle, LoaderCircle } from "lucide-react";
import { useEffect } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  isLoading,
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isLoading) {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLoading, onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={() => !isLoading && onClose()}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-icon">
          <AlertTriangle size={20} aria-hidden="true" />
        </div>

        <div className="modal-copy">
          <h3 id="confirm-dialog-title">{title}</h3>
          <p>{description}</p>
        </div>

        <div className="modal-actions">
          <button className="button button-secondary" type="button" onClick={onClose} disabled={isLoading}>
            Cancelar
          </button>
          <button className="button button-danger" type="button" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? <LoaderCircle size={16} aria-hidden="true" className="status-icon-spinning" /> : null}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
