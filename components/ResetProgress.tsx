import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useT } from "./PreferencesProvider";

interface ResetProgressProps {
  /** Called only when the user confirms in the dialog. */
  readonly onConfirm: () => void;
}

/**
 * Reset button plus its confirmation dialog (native `<dialog>`, design D10):
 * initial focus on cancel, Escape cancels, only "confirm" wipes the game.
 */
export function ResetProgress({ onConfirm }: ResetProgressProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
      cancelRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  const confirm = useCallback(() => {
    setOpen(false);
    onConfirm();
  }, [onConfirm]);

  return (
    <>
      <button
        type="button"
        data-testid="reset"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 rounded-full border border-foreground/15 px-4 py-2 text-sm text-muted hover:border-foreground/40"
      >
        {t("reset.button")}
      </button>

      <dialog
        ref={dialogRef}
        data-testid="reset-dialog"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        // Escape closes the dialog natively; keep React state in sync.
        onClose={close}
        className="m-auto rounded-2xl bg-background p-6 text-foreground shadow-xl backdrop:bg-black/50"
      >
        <h2 id={titleId} className="text-lg font-semibold">
          {t("reset.title")}
        </h2>
        <p id={bodyId} className="mt-2 max-w-xs text-sm text-muted">
          {t("reset.body")}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            data-testid="reset-cancel"
            onClick={close}
            className="rounded-full border border-foreground/15 px-4 py-2 text-sm"
          >
            {t("reset.cancel")}
          </button>
          <button
            type="button"
            data-testid="reset-confirm"
            onClick={confirm}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
          >
            {t("reset.confirm")}
          </button>
        </div>
      </dialog>
    </>
  );
}
