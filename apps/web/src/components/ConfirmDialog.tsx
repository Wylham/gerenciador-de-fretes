import { Broom, CircleNotch, Trash, WarningCircle, X } from "@phosphor-icons/react";
import { useEffect } from "react";

interface ConfirmDialogProps {
  open: boolean;
  variant: "delete" | "clear";
  title: string;
  description: string;
  confirmLabel: string;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  variant,
  title,
  description,
  confirmLabel,
  isLoading,
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  const ConfirmActionIcon = variant === "clear" ? Broom : Trash;

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
          <WarningCircle size={20} aria-hidden="true" />
        </div>

        <div className="modal-copy">
          <h3 id="confirm-dialog-title">{title}</h3>
          <p>{description}</p>
        </div>

        <div className="modal-actions">
          <button className="button button-secondary" type="button" onClick={onClose} disabled={isLoading}>
            <X size={16} aria-hidden="true" />
            <span>Cancelar</span>
          </button>
          <button className="button button-danger" type="button" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <CircleNotch size={16} aria-hidden="true" className="status-icon-spinning" />
            ) : (
              <ConfirmActionIcon size={16} aria-hidden="true" />
            )}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
