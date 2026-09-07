import type {
  BookItem,
  LibraryFocusSessionRecord,
  LibraryItem,
} from "@/types/library";
import { isBookItem } from "@/types/library";

export type BookStudyStats = {
  totalSessions: number;
  totalFocusSeconds: number;
  totalAwardedXp: number;
  lastStudiedAt?: number;
};

export const getBookStudyStats = (
  book: BookItem,
  sessions: LibraryFocusSessionRecord[] = [],
): BookStudyStats => {
  const bookSessions = sessions.filter((session) => session.targetBookId === book.id);
  const totalFocusSeconds = bookSessions.reduce(
    (total, session) => total + session.durationSeconds,
    0,
  );
  const totalAwardedXp = bookSessions.reduce(
    (total, session) => total + session.awardedXp,
    0,
  );
  const lastSessionAt = bookSessions.reduce<number | undefined>(
    (latest, session) =>
      latest === undefined ? session.completedAt : Math.max(latest, session.completedAt),
    undefined,
  );

  return {
    totalSessions: bookSessions.length,
    totalFocusSeconds,
    totalAwardedXp,
    lastStudiedAt:
      book.lastStudiedAt === undefined
        ? lastSessionAt
        : lastSessionAt === undefined
          ? book.lastStudiedAt
          : Math.max(book.lastStudiedAt, lastSessionAt),
  };
};

export const getBooks = (items: LibraryItem[]): BookItem[] =>
  items.filter((item): item is BookItem => isBookItem(item));

export const formatFocusDuration = (seconds: number): string => {
  const minutes = Math.round(seconds / 60);

  if (minutes < 60) {
    return `${minutes} dk`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0 ? `${hours} sa ${remainingMinutes} dk` : `${hours} sa`;
};

export const formatRelativeStudyDate = (
  timestamp: number | undefined,
  now = Date.now(),
): string => {
  if (!timestamp) {
    return "Henüz çalışılmadı";
  }

  const viewedAt = new Date(now);
  const studiedAt = new Date(timestamp);
  const viewedDay = new Date(
    viewedAt.getFullYear(),
    viewedAt.getMonth(),
    viewedAt.getDate(),
  ).getTime();
  const studiedDay = new Date(
    studiedAt.getFullYear(),
    studiedAt.getMonth(),
    studiedAt.getDate(),
  ).getTime();
  const diffDays = Math.round((viewedDay - studiedDay) / 86_400_000);

  if (diffDays <= 0) {
    return "Bugün";
  }

  if (diffDays === 1) {
    return "Dün";
  }

  if (diffDays < 7) {
    return `${diffDays} gün önce`;
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
  }).format(new Date(timestamp));
};
