"use client";

import {
  ChevronLeft,
  ChevronRight,
  Download,
  ListTodo,
  Rows3,
  Upload,
} from "lucide-react";
import { ShelfTitleInput } from "@/components/ShelfTitleInput";
import type { LibraryShelf } from "@/types/library";

type LibraryNavigationProps = {
  shelf: LibraryShelf;
  shelves: LibraryShelf[];
  onRelative: (direction: -1 | 1) => void;
  onSelect: (id: string) => void;
  onRename: (title: string) => Promise<boolean>;
  onTasks: () => void;
  onShelves: () => void;
  onExport: () => void;
  onImport: (file: File) => Promise<void>;
};

export function LibraryNavigation({
  shelf,
  shelves,
  onRelative,
  onSelect,
  onRename,
  onTasks,
  onShelves,
  onExport,
  onImport,
}: LibraryNavigationProps) {
  return (
    <nav className="library-navigation" aria-label="Kütüphane kontrolleri">
      <div className="library-shelf-selector">
        <button
          className="library-button library-button--icon"
          aria-label="Önceki raf"
          type="button"
          onClick={() => onRelative(-1)}
        >
          <ChevronLeft aria-hidden size={19} />
        </button>
        <ShelfTitleInput
          key={shelf.id}
          title={shelf.title}
          onRename={onRename}
        />
        <button
          className="library-button library-button--icon"
          aria-label="Sonraki raf"
          type="button"
          onClick={() => onRelative(1)}
        >
          <ChevronRight aria-hidden size={19} />
        </button>
        <div className="library-shelf-dots">
          {shelves.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-label={`${item.title} rafına geç`}
              aria-current={item.id === shelf.id ? "true" : undefined}
              onClick={() => onSelect(item.id)}
            />
          ))}
        </div>
      </div>
      <div className="library-navigation-actions">
        <button
          className="library-button library-button--quiet"
          type="button"
          aria-label="Görevleri aç"
          onClick={onTasks}
        >
          <ListTodo aria-hidden size={17} />
          <span>Görevler</span>
        </button>
        <button
          className="library-button library-button--quiet"
          type="button"
          aria-label="Raf yönetimini aç"
          onClick={onShelves}
        >
          <Rows3 aria-hidden size={17} />
          <span>Raflar</span>
        </button>
        <button
          className="library-button library-button--quiet"
          type="button"
          aria-label="Kütüphane yedeğini indir"
          onClick={onExport}
        >
          <Download aria-hidden size={17} />
          <span>Yedekle</span>
        </button>
        <label className="library-button library-button--quiet library-upload">
          <Upload aria-hidden size={17} />
          <span>Yükle</span>
          <input
            type="file"
            aria-label="Kütüphane yedeğini yükle"
            accept="application/json,.json"
            onChange={async (event) => {
              const input = event.currentTarget;
              if (input.files?.[0]) await onImport(input.files[0]);
              input.value = "";
            }}
          />
        </label>
      </div>
    </nav>
  );
}
