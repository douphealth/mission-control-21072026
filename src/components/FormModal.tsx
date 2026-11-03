import { X } from "lucide-react";
import React, { createContext, useContext, useEffect, useId, useRef, forwardRef } from "react";
import { Content as DialogContent } from "@radix-ui/react-dialog";
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

interface FormModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onSubmit?: () => void;
  submitLabel?: string;
  size?: "sm" | "md" | "lg";
}

const FormModal = forwardRef<HTMLDivElement, FormModalProps>(
  (
    { open, onClose, title, children, onSubmit, submitLabel = "Save", size = "md" },
    forwardedRef,
  ) => {
    const innerRef = useRef<HTMLDivElement>(null);
    const returnFocus = useRef<HTMLElement | null>(null);
    const titleId = useId();
    const widthClass = size === "sm" ? "max-w-md" : size === "lg" ? "max-w-3xl" : "max-w-xl";

    return (
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) onClose();
        }}
        modal
      >
        <DialogPortal>
          <DialogOverlay className="z-[100] bg-foreground/20 backdrop-blur-sm" />
          <DialogContent
            ref={(node) => {
              innerRef.current = node;
              if (typeof forwardedRef === "function") forwardedRef(node);
              else if (forwardedRef) forwardedRef.current = node;
            }}
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={undefined}
            onOpenAutoFocus={(event) => {
              // These dialogs are controlled by existing page buttons, without a
              // DialogTrigger; remember that exact opener for keyboard return.
              const active = document.activeElement;
              if (active instanceof HTMLElement && !innerRef.current?.contains(active))
                returnFocus.current = active;
              const candidates = innerRef.current?.querySelectorAll<HTMLElement>(
                'input:not([type="hidden"]):not(:disabled):not([readonly]), textarea:not(:disabled):not([readonly]), select:not(:disabled), [contenteditable="true"]',
              );
              const first = Array.from(candidates || []).find(
                (element) => element.getClientRects().length > 0 && !element.closest("[inert]"),
              );
              if (first) {
                event.preventDefault();
                first.focus({ preventScroll: true });
              }
            }}
            onCloseAutoFocus={(event) => {
              if (returnFocus.current?.isConnected) {
                event.preventDefault();
                returnFocus.current.focus({ preventScroll: true });
              }
              returnFocus.current = null;
            }}
            className={`fixed bottom-0 left-1/2 z-[101] flex max-h-[95dvh] w-full -translate-x-1/2 flex-col overflow-hidden rounded-t-2xl bg-card shadow-2xl outline-none sm:bottom-auto sm:top-1/2 sm:max-h-[85dvh] sm:-translate-y-1/2 sm:rounded-2xl ${widthClass}`}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
              <DialogTitle
                id={titleId}
                className="text-base font-semibold text-card-foreground sm:text-lg"
              >
                {title}
              </DialogTitle>
              <DialogClose asChild>
                <button
                  type="button"
                  aria-label={`Close ${title}`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground touch-manipulation"
                >
                  <X size={18} />
                </button>
              </DialogClose>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
              {children}
            </div>
            {onSubmit && (
              <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-4">
                <DialogClose asChild>
                  <button
                    type="button"
                    className="min-h-11 rounded-xl bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 touch-manipulation"
                  >
                    Cancel
                  </button>
                </DialogClose>
                <button
                  type="button"
                  onClick={onSubmit}
                  className="min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 touch-manipulation"
                >
                  {submitLabel}
                </button>
              </div>
            )}
          </DialogContent>
        </DialogPortal>
      </Dialog>
    );
  },
);

FormModal.displayName = "FormModal";
export default FormModal;

/* Reusable form field components */
const FormFieldContext = createContext<{ controlId: string; labelId: string } | null>(null);

export function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  const controlId = useId();
  const labelId = `${controlId}-label`;
  return (
    <FormFieldContext.Provider value={{ controlId, labelId }}>
      <div role="group" aria-labelledby={labelId}>
        <label
          id={labelId}
          htmlFor={controlId}
          className="mb-1.5 block text-xs font-medium text-muted-foreground"
        >
          {label}
        </label>
        {children}
      </div>
    </FormFieldContext.Provider>
  );
}

export function FormInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  const field = useContext(FormFieldContext);
  return (
    <input
      id={field?.controlId}
      aria-labelledby={field?.labelId}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2.5 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-shadow placeholder:text-muted-foreground"
    />
  );
}

export function FormTextarea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const field = useContext(FormFieldContext);
  const ref = useRef<HTMLTextAreaElement>(null);
  const autoResize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };
  useEffect(() => {
    autoResize();
  }, [value]);
  return (
    <textarea
      id={field?.controlId}
      aria-labelledby={field?.labelId}
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onInput={autoResize}
      placeholder={placeholder}
      rows={rows}
      style={{ overflow: "hidden" }}
      className="w-full px-3 py-2.5 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-shadow resize-none placeholder:text-muted-foreground"
    />
  );
}

export function FormSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const field = useContext(FormFieldContext);
  return (
    <select
      id={field?.controlId}
      aria-labelledby={field?.labelId}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2.5 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-shadow appearance-none cursor-pointer"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function FormTagsInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const field = useContext(FormFieldContext);
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const v = (e.target as HTMLInputElement).value.trim();
      if (v && !value.includes(v)) {
        onChange([...value, v]);
        (e.target as HTMLInputElement).value = "";
      }
    }
  };

  return (
    <div className="space-y-2">
      <input
        id={field?.controlId}
        aria-labelledby={field?.labelId}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || "Type and press Enter"}
        className="w-full px-3 py-2.5 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-shadow placeholder:text-muted-foreground"
      />
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs"
            >
              {t}
              <button
                onClick={() => onChange(value.filter((x) => x !== t))}
                className="hover:text-destructive"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
