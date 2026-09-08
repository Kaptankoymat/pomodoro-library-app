"use client";
import { useEffect, useRef } from "react";
import { Lock, Sparkles, X } from "lucide-react";
import {
  getCostumeGridSize,
  type CostumeApplicationValidation,
  type WardrobeScope,
} from "@/lib/costumeApplication";
import {
  getCostumeDefinition,
  getCostumesForKind,
  getResolvedCostume,
  isCostumeRevealed,
  isCostumeUnlocked,
} from "@/lib/libraryCostumeDefinitions";
import type {
  LibraryItem,
  LibraryItemKind,
  LibraryWardrobeState,
  CostumeId,
} from "@/types/library";
const itemKindLabel: Record<LibraryItemKind, string> = {
  book: "Kitap",
  painting: "Tablo",
  plant: "Saksı",
  sticky: "Not",
  timer: "Saat",
};

type WardrobePanelProps = {
  item: LibraryItem | null;
  pendingCostumeId: CostumeId | null;
  scope: WardrobeScope;
  validation: CostumeApplicationValidation | null;
  wardrobe: LibraryWardrobeState;
  onApply: () => void;
  onClose: () => void;
  onPreviewCostume: (costumeId: CostumeId) => void;
  onScopeChange: (scope: WardrobeScope) => void;
};

const getCostumeValidationMessage = (
  validation: CostumeApplicationValidation | null,
  scope: WardrobeScope,
): string | null => {
  if (!validation) {
    return null;
  }

  if (validation.valid) {
    return "Bu kostüm raftaki yerine uygun.";
  }

  if (scope === "kind") {
    return `${validation.blockedCount} obje bu kostümle mevcut yerine sığmıyor.`;
  }

  return validation.reason === "out-of-bounds"
    ? "Bu kostüm rafın dışına taşıyor. Önce objenin yerini değiştir."
    : "Bu kostüm başka bir objeyle çakışıyor. Önce rafta yer aç.";
};

export const WardrobePanel = ({
  item,
  pendingCostumeId,
  scope,
  validation,
  wardrobe,
  onApply,
  onClose,
  onPreviewCostume,
  onScopeChange,
}: WardrobePanelProps) => {
  const costumes = item ? getCostumesForKind(item.kind) : [];
  const selectedCostume = getCostumeDefinition(pendingCostumeId ?? undefined);
  const selectedUnlocked = selectedCostume
    ? isCostumeUnlocked(wardrobe, selectedCostume.id)
    : false;
  const currentCostumeId = item
    ? scope === "kind"
      ? (wardrobe.defaultCostumeByKind[item.kind] ??
        getResolvedCostume(item, wardrobe).id)
      : getResolvedCostume(item, wardrobe).id
    : null;
  const canApply =
    Boolean(item && pendingCostumeId && selectedCostume && selectedUnlocked) &&
    (validation?.valid ?? true);
  const validationMessage = getCostumeValidationMessage(validation, scope);
  const selectedSize =
    item && selectedCostume
      ? getCostumeGridSize(item.kind, selectedCostume)
      : null;

  const openerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (document.activeElement instanceof HTMLElement)
      openerRef.current = document.activeElement;
  }, []);
  const close = () => {
    openerRef.current?.focus();
    onClose();
  };

  return (
    <aside
      aria-label="Kostum paneli"
      className="library-wardrobe library-panel"
      data-wardrobe-panel
      data-selected={Boolean(item)}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          close();
        }
      }}
    >
      <div className="library-wardrobe-header">
        <div>
          <span className="library-eyebrow">KÜTÜPHANENİN DOKUSU</span>
          <h2>Kostümler</h2>
        </div>
        <button
          aria-label="Kostum panelini kapat"
          className="library-button library-button--icon"
          type="button"
          onClick={close}
        >
          <X aria-hidden size={17} />
        </button>
      </div>
      {item ? (
        <>
          <div className="library-wardrobe-selection">
            <strong>{item.title}</strong>
            <p>
              {itemKindLabel[item.kind]} · Seviye {item.level}
            </p>
          </div>
          <div className="library-wardrobe-scopes" aria-label="Kostüm kapsamı">
            {(["item", "kind"] as const).map((candidateScope) => (
              <button
                key={candidateScope}
                className="library-button"
                aria-pressed={scope === candidateScope}
                type="button"
                onClick={() => onScopeChange(candidateScope)}
              >
                {candidateScope === "item" ? "Bu obje" : "Tür varsayılanı"}
              </button>
            ))}
          </div>
          <div className="library-costume-list">
            {costumes.map((costume) => {
              const revealed = isCostumeRevealed(wardrobe, costume);
              const unlocked = isCostumeUnlocked(wardrobe, costume.id);
              const selected =
                pendingCostumeId === costume.id ||
                (!pendingCostumeId && currentCostumeId === costume.id);
              return (
                <button
                  key={costume.id}
                  className="library-costume-card"
                  aria-pressed={selected}
                  data-costume-card={costume.id}
                  disabled={!revealed}
                  type="button"
                  onClick={() => onPreviewCostume(costume.id)}
                >
                  <span
                    className={`library-costume-swatch ${revealed ? costume.className : ""}`}
                  >
                    {!revealed || !unlocked ? (
                      <Lock aria-hidden size={18} />
                    ) : (
                      <Sparkles aria-hidden size={18} />
                    )}
                  </span>
                  <strong>{revealed ? costume.name : "Gizli kostüm"}</strong>
                  <small>
                    {revealed
                      ? unlocked
                        ? "Kullanılabilir"
                        : (costume.unlockHint ?? "Kilitli")
                      : "Odak ödülleriyle keşfedilir."}
                  </small>
                </button>
              );
            })}
          </div>
          <div className="library-costume-hint" aria-live="polite">
            {pendingCostumeId && selectedCostume ? (
              <>
                <strong>{selectedCostume.name}</strong>
                <p>
                  {!selectedUnlocked
                    ? (selectedCostume.unlockHint ?? "Bu kostüm henüz kilitli.")
                    : (validationMessage ?? selectedCostume.description)}
                </p>
                {selectedSize && selectedUnlocked ? (
                  <small>
                    Rafta kapladığı yer: {selectedSize.widthUnits} ×{" "}
                    {selectedSize.heightUnits}
                  </small>
                ) : null}
              </>
            ) : (
              <p>
                Bir kostüm seç. Rafta yeterli yer olduğunda uygulayabilirsin.
              </p>
            )}
          </div>
          <button
            className="library-button library-button--primary"
            disabled={!canApply}
            type="button"
            onClick={onApply}
          >
            <Sparkles aria-hidden size={17} />
            Uygula
          </button>
        </>
      ) : (
        <p className="library-wardrobe-empty">
          Görünümünü değiştirmek için raftaki bir objeyi seç.
        </p>
      )}
    </aside>
  );
};
