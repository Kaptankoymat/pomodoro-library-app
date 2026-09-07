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
  ...props
}: LibraryDialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const startedOnBackdrop = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const previouslyFocused = document.activeElement;
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
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, []);

  return (
    <dialog
      {...props}
      ref={dialogRef}
      aria-modal="true"
      className={`m-0 h-[100dvh] max-h-none w-screen max-w-none border-0 text-inherit outline-none [&:not([open])]:hidden [&::backdrop]:bg-transparent ${className}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
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
