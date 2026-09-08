"use client";

import { useEffect, useRef, type ComponentPropsWithoutRef } from "react";

type LibraryDialogProps = Omit<
  ComponentPropsWithoutRef<"dialog">,
  "open" | "onClose" | "onCancel"
> & {
  onClose: () => void;
  dismissOnBackdrop?: boolean;
};

let openDialogCount = 0;
let previousBodyOverflow = "";

/** Keeps every dialog in the browser's modal layer, including keyboard focus. */
export const LibraryDialog = ({
  children,
  className = "",
  dismissOnBackdrop = false,
  onClose,
  onKeyDown,
  ...props
}: LibraryDialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const startedOnBackdrop = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const previouslyFocused = document.activeElement;
    const openerItemId =
      previouslyFocused instanceof HTMLElement
        ? (previouslyFocused.dataset.itemId ??
          previouslyFocused.closest<HTMLElement>("[data-item-id]")?.dataset
            .itemId)
        : undefined;
    const openerFocusKey =
      previouslyFocused instanceof HTMLElement
        ? previouslyFocused.dataset.focusKey
        : undefined;
    if (openDialogCount === 0) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    openDialogCount += 1;
    dialog.showModal();

    return () => {
      dialog.close();
      openDialogCount -= 1;
      if (openDialogCount === 0) {
        document.body.style.overflow = previousBodyOverflow;
      }
      if (
        previouslyFocused instanceof HTMLElement &&
        previouslyFocused.isConnected
      ) {
        previouslyFocused.focus({ preventScroll: true });
      } else {
        // A responsive scene change replaces the item and its clock controls.
        const replacementControl = openerFocusKey
          ? document.querySelector<HTMLElement>(
              `[data-focus-key="${CSS.escape(openerFocusKey)}"]`,
            )
          : null;
        const replacementItem = openerItemId
          ? document.querySelector<HTMLElement>(
              `[data-item-id="${CSS.escape(openerItemId)}"]`,
            )
          : null;
        (replacementControl ?? replacementItem)?.focus();
      }
    };
  }, []);

  return (
    <dialog
      {...props}
      ref={dialogRef}
      aria-modal="true"
      className={`library-dialog ${className}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (
          event.key === "Escape" &&
          !event.defaultPrevented &&
          !event.nativeEvent.isComposing
        ) {
          // Repeated native Escape requests can become non-cancelable. Keep
          // dismissal in React so an unsaved draft cannot bypass confirmation.
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
      onPointerDown={(event) => {
        startedOnBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (
          dismissOnBackdrop &&
          startedOnBackdrop.current &&
          event.target === event.currentTarget
        ) {
          onClose();
        }
        startedOnBackdrop.current = false;
      }}
    >
      {children}
    </dialog>
  );
};
