"use client";
import { useEffect, useRef } from "react";
import {
  BookOpen,
  Flower2,
  Image as ImageIcon,
  Rows3,
  Plus,
  Sparkles,
  StickyNote,
} from "lucide-react";
import type { DecorItem } from "@/types/library";

type AddMenuProps = {
  isOpen: boolean;
  isWardrobeMode: boolean;
  onAddBook: () => void;
  onAddDecor: (kind: DecorItem["kind"]) => void;
  onAddShelf: () => void;
  onToggle: () => void;
  onToggleWardrobe: () => void;
};
export const AddMenu = ({
  isOpen,
  isWardrobeMode,
  onAddBook,
  onAddDecor,
  onAddShelf,
  onToggle,
  onToggleWardrobe,
}: AddMenuProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const onToggleRef = useRef(onToggle);
  useEffect(() => {
    onToggleRef.current = onToggle;
  }, [onToggle]);
  useEffect(() => {
    if (!isOpen) return;
    const popover = popoverRef.current;
    const trigger = triggerRef.current;
    popover?.querySelector<HTMLButtonElement>("button")?.focus();
    const closeOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      )
        onToggleRef.current();
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        onToggleRef.current();
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("pointerdown", closeOutside);
    window.addEventListener("keydown", closeEscape);
    return () => {
      if (popover?.contains(document.activeElement)) trigger?.focus();
      window.removeEventListener("pointerdown", closeOutside);
      window.removeEventListener("keydown", closeEscape);
    };
  }, [isOpen]);
  const add = (action: () => void) => {
    triggerRef.current?.focus();
    action();
  };
  return (
    <div className="library-add-menu" ref={containerRef}>
      {isOpen ? (
        <div
          ref={popoverRef}
          className="library-add-popover library-panel"
          id="library-add-menu"
          aria-label="Kütüphaneye ekle"
        >
          <span className="library-eyebrow">RAFINA BİR HİKÂYE EKLE</span>
          <button
            className="library-button library-button--quiet"
            type="button"
            onClick={() => add(onAddBook)}
          >
            <BookOpen aria-hidden size={17} />
            Kitap Ekle
          </button>
          <button
            className="library-button library-button--quiet"
            type="button"
            onClick={() => add(() => onAddDecor("plant"))}
          >
            <Flower2 aria-hidden size={17} />
            Saksı Ekle
          </button>
          <button
            className="library-button library-button--quiet"
            type="button"
            onClick={() => add(() => onAddDecor("painting"))}
          >
            <ImageIcon aria-hidden size={17} />
            Tablo Ekle
          </button>
          <button
            className="library-button library-button--quiet"
            type="button"
            onClick={() => add(() => onAddDecor("sticky"))}
          >
            <StickyNote aria-hidden size={17} />
            Not Ekle
          </button>
          <button
            className="library-button library-button--quiet"
            type="button"
            onClick={() => add(onAddShelf)}
          >
            <Rows3 aria-hidden size={17} />
            Raf Ekle
          </button>
        </div>
      ) : null}
      <button
        className="library-button"
        aria-pressed={isWardrobeMode}
        type="button"
        onClick={onToggleWardrobe}
      >
        <Sparkles aria-hidden size={16} />
        Kostümler
      </button>
      <button
        ref={triggerRef}
        aria-label="Kütüphaneye ekle"
        aria-expanded={isOpen}
        aria-controls="library-add-menu"
        className="library-button library-button--primary"
        type="button"
        onClick={onToggle}
      >
        <Plus aria-hidden size={18} />
        Ekle
      </button>
    </div>
  );
};
