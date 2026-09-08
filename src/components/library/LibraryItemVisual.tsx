import { PottedFern } from "@/components/library/LibraryAtmosphere";
import type { CostumeDefinition } from "@/lib/libraryCostumeDefinitions";
import {
  getActiveTasks,
  STICKY_VISIBLE_TASK_LIMIT,
} from "@/lib/stickyTaskLayout";
import {
  isBookItem,
  type LibraryItem,
  type LibraryTask,
} from "@/types/library";

export type LibraryItemVisualProps = {
  costume: CostumeDefinition;
  item: LibraryItem;
  tasks?: LibraryTask[];
  timerText?: string;
  isTimerRunning?: boolean;
  selectedFocusBookTitle?: string | null;
};

/** Visual content only: the containing inventory button owns all interactions. */
export function LibraryItemVisual({
  costume,
  item,
  tasks = [],
  timerText = "25:00",
  isTimerRunning = false,
  selectedFocusBookTitle = null,
}: LibraryItemVisualProps) {
  const activeTasks = item.kind === "sticky" ? getActiveTasks(tasks) : [];
  const visibleTaskCount = Math.min(
    Math.max(3, Math.ceil(item.heightUnits) * 3),
    STICKY_VISIBLE_TASK_LIMIT,
  );

  return (
    <>
      {costume.assetMode === "png" && costume.pngSrc ? (
        <span
          aria-hidden="true"
          className="library-costume-overlay"
          style={{
            backgroundImage: `url(${costume.pngSrc})`,
            imageRendering: costume.pixelated ? "pixelated" : "auto",
          }}
        />
      ) : null}

      {isBookItem(item) && item.note ? (
        <span aria-hidden="true" className="library-book-bookmark" />
      ) : null}

      {item.kind === "book" ? (
        <span
          className={`library-book-spine ${costume.contentClassName ?? ""}`}
        >
          <span aria-hidden="true" className="library-book-leather" />
          <span aria-hidden="true" className="library-book-page-edge" />
          <svg
            aria-hidden="true"
            focusable="false"
            className="library-book-tooling"
            viewBox="0 0 100 400"
            preserveAspectRatio="none"
            fill="none"
          >
            <path
              d="M12 28q15 0 15-15h46q0 15 15 15v344q-15 0-15 15H27q0-15-15-15Z"
              stroke="currentColor"
              strokeWidth="1.3"
            />
            <path
              d="M19 41q9-4 8-13m54 13q-9-4-8-13M19 359q9 4 8 13m54-13q-9 4-8 13"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <path
              d="m50 18 5 7-5 7-5-7Zm0 350 5 7-5 7-5-7Z"
              fill="currentColor"
            />
          </svg>
          <span
            aria-hidden="true"
            className="library-book-rule library-book-rule--top"
          />
          <span
            aria-hidden="true"
            className="library-book-rule library-book-rule--bottom"
          />
          <span className="library-book-title" title={item.title}>
            {item.title}
          </span>
          <svg
            aria-hidden="true"
            focusable="false"
            className="library-book-emblem"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M12 3c0 5-5 6-5 10s3 6 5 6 5-2 5-6-5-5-5-10Z"
              stroke="currentColor"
            />
            <path
              d="M12 10v12m-6-6c-5-4-5 4 3 2m9-2c5-4 5 4-3 2"
              stroke="currentColor"
            />
          </svg>
        </span>
      ) : null}

      {item.kind === "timer" ? (
        <span
          className={`library-item-timer ${isTimerRunning ? "library-item-timer--running" : ""} ${costume.contentClassName ?? ""}`}
        >
          <span
            aria-hidden="true"
            className="library-item-timer-corner library-item-timer-corner--left"
          >
            ✧
          </span>
          <span className="library-item-timer-digits">{timerText}</span>
          <span className="library-item-timer-description">
            <span className="library-item-timer-label">Odak zamanı</span>
            <span
              className="library-item-timer-target"
              title={selectedFocusBookTitle ?? "Yeni kitap"}
            >
              {selectedFocusBookTitle ?? "Yeni kitap"}
            </span>
            <span className="library-item-timer-status">
              <i aria-hidden="true" />
              {isTimerRunning ? "Odaklanıyor" : "Pomodoro"}
            </span>
          </span>
          <span aria-hidden="true" className="library-item-timer-play">
            {isTimerRunning ? (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 5h4v14H7zm6 0h4v14h-4Z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="m8 5 11 7-11 7Z" />
              </svg>
            )}
          </span>
          <span
            aria-hidden="true"
            className="library-item-timer-corner library-item-timer-corner--right"
          >
            ✧
          </span>
        </span>
      ) : null}

      {item.kind === "plant" ? (
        <span
          className={`library-plant-visual ${costume.contentClassName ?? ""}`}
        >
          <PottedFern />
        </span>
      ) : null}

      {item.kind === "painting" ? (
        <span
          className={`library-painting-frame ${costume.frameClassName ?? ""}`}
        >
          <span
            className={`library-painting-canvas ${costume.contentClassName ?? ""}`}
            style={{
              backgroundImage:
                parseInt(item.id.replace(/\D/g, "") || "0", 10) % 2 === 0
                  ? "url(/vintage_landscape_1.png)"
                  : "url(/vintage_landscape_2.png)",
            }}
          />
          <span
            aria-hidden="true"
            className="library-painting-corner library-painting-corner--top"
          >
            ✥
          </span>
          <span
            aria-hidden="true"
            className="library-painting-corner library-painting-corner--bottom"
          >
            ✥
          </span>
        </span>
      ) : null}

      {item.kind === "sticky" ? (
        <span
          className={`library-paper-note ${costume.contentClassName ?? ""}`}
          data-costume-id={costume.id}
        >
          <span aria-hidden="true" className="library-paper-fold" />
          <span aria-hidden="true" className="library-paper-pin" />
          <span className="library-paper-heading">Küçük adımlar</span>
          {activeTasks.length > 0 ? (
            <span className="library-paper-tasks">
              {activeTasks.slice(0, visibleTaskCount).map((task) => (
                <span key={task.id} className="library-paper-task">
                  <span aria-hidden="true" className="library-paper-checkbox" />
                  <span>{task.title}</span>
                </span>
              ))}
              {activeTasks.length > visibleTaskCount ? (
                <span className="library-paper-more">
                  +{activeTasks.length - visibleTaskCount} görev daha
                </span>
              ) : null}
            </span>
          ) : (
            <span className="library-paper-empty">{item.title}</span>
          )}
          <svg
            aria-hidden="true"
            focusable="false"
            className="library-paper-flourish"
            viewBox="0 0 70 24"
            fill="none"
          >
            <path
              d="M10 17q22 5 48-12M28 17q-11-16-14-6 2 8 14 6Zm12-4q-4-17-9-9-1 7 9 9Zm10-5q2-12 7-7 1 5-7 7Z"
              stroke="currentColor"
              strokeWidth="1.1"
            />
          </svg>
        </span>
      ) : null}
    </>
  );
}
