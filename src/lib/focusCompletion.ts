import {
  getFocusCompletionTimestamp,
  getFocusElapsedSeconds,
} from "@/lib/focusSession";
import { completeFocusSession } from "@/lib/libraryProgression";
import {
  isBookItem,
  type FocusRewardSummary,
  type LibraryState,
} from "@/types/library";

export const completeNaturalFocusSession = (params: {
  completedAt: number;
  random?: () => number;
  sessionId: string;
  state: LibraryState;
}): { state: LibraryState; summary: FocusRewardSummary | null } => {
  const session = params.state.activeFocusSession;

  if (
    !session ||
    session.id !== params.sessionId ||
    (params.state.focusSessions ?? []).some((record) => record.id === params.sessionId) ||
    getFocusElapsedSeconds(session, params.completedAt) < session.durationSeconds
  ) {
    return { state: params.state, summary: null };
  }

  const completedAt = getFocusCompletionTimestamp(session) ?? params.completedAt;

  const result = completeFocusSession(
    params.state,
    session.targetBookId,
    params.random,
    new Date(completedAt),
  );

  return {
    summary: result.summary,
    state: {
      ...result.state,
      activeFocusSession: null,
      focusSessions: [
        {
          id: session.id,
          targetBookId: session.targetBookId,
          startedAt: session.startedAt,
          completedAt,
          durationSeconds: session.durationSeconds,
          awardedXp: result.summary.awardedXp,
          addedBookId: result.summary.addedBookId,
          completion: "completed",
        },
        ...(params.state.focusSessions ?? []),
      ],
    },
  };
};

export const endFocusSessionEarly = (
  state: LibraryState,
  completedAt: number,
): LibraryState => {
  const session = state.activeFocusSession;
  if (!session || (state.focusSessions ?? []).some((record) => record.id === session.id)) {
    return state;
  }

  const elapsedSeconds = Math.floor(getFocusElapsedSeconds(session, completedAt));
  if (elapsedSeconds <= 0) {
    return state;
  }

  const items = session.targetBookId
    ? state.items.map((item) =>
        item.id === session.targetBookId && isBookItem(item)
          ? { ...item, lastStudiedAt: completedAt }
          : item,
      )
    : state.items;

  return {
    ...state,
    items,
    activeFocusSession: null,
    focusSessions: [
      {
        id: session.id,
        targetBookId: session.targetBookId,
        startedAt: session.startedAt,
        completedAt,
        durationSeconds: elapsedSeconds,
        awardedXp: 0,
        completion: "ended-early",
      },
      ...(state.focusSessions ?? []),
    ],
  };
};
