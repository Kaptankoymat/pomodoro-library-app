"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createGridMetrics, type GridMetrics } from "@/lib/gridLogic";

type UseGridMetricsOptions = {
  columnCount?: number;
  rowCount?: number;
  minCellWidth?: number;
  maxCellWidth?: number;
  cellAspectRatio?: number;
  gap?: number;
  measurementEpsilon?: number;
  resizeSettleMs?: number;
  fitToHeight?: boolean;
};

type UseGridMetricsResult<TElement extends HTMLElement> = {
  containerRef: React.RefObject<TElement | null>;
  metrics: GridMetrics;
  isResizing: boolean;
};

export const useGridMetrics = <TElement extends HTMLElement>(
  options: UseGridMetricsOptions = {},
): UseGridMetricsResult<TElement> => {
  const {
    columnCount = 12,
    rowCount = 4,
    minCellWidth = 38,
    maxCellWidth = 72,
    cellAspectRatio = 1.32,
    gap = 8,
    measurementEpsilon = 2.5,
    resizeSettleMs = 140,
    fitToHeight = true,
  } = options;

  const containerRef = useRef<TElement | null>(null);
  const [containerSize, setContainerSize] = useState({
    width: 960,
    height: 640,
  });
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const element = containerRef.current;

    if (!element) {
      return;
    }

    let settleTimeout: ReturnType<typeof setTimeout> | undefined;
    let lastMeasurement: { width: number; height: number } | null = null;

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const nextWidth = Math.round(entry.contentRect.width);
      const nextHeight = Math.round(entry.contentRect.height);

      // Hidden containers briefly report zero dimensions. Keep the last useful
      // layout until they are visible again instead of collapsing every item.
      if (nextWidth <= 0 || (fitToHeight && nextHeight <= 0)) return;
      if (
        lastMeasurement &&
        Math.abs(lastMeasurement.width - nextWidth) < measurementEpsilon &&
        (!fitToHeight || Math.abs(lastMeasurement.height - nextHeight) < measurementEpsilon)
      ) {
        return;
      }
      lastMeasurement = { width: nextWidth, height: nextHeight };

      setIsResizing(true);
      setContainerSize((currentSize) => {
        const widthChanged =
          Math.abs(currentSize.width - nextWidth) >= measurementEpsilon;
        const heightChanged = fitToHeight &&
          Math.abs(currentSize.height - nextHeight) >= measurementEpsilon;

        return widthChanged || heightChanged
          ? {
              width: nextWidth,
              height: nextHeight,
            }
          : currentSize;
      });

      if (settleTimeout) {
        clearTimeout(settleTimeout);
      }

      settleTimeout = setTimeout(() => {
        setIsResizing(false);
      }, resizeSettleMs);
    });

    observer.observe(element);

    return () => {
      observer.disconnect();

      if (settleTimeout) {
        clearTimeout(settleTimeout);
      }
    };
  }, [fitToHeight, measurementEpsilon, resizeSettleMs]);

  const metrics = useMemo(
    () =>
      createGridMetrics({
        containerWidth: containerSize.width,
        containerHeight: fitToHeight ? containerSize.height : undefined,
        columnCount,
        rowCount,
        minCellWidth,
        maxCellWidth,
        cellAspectRatio,
        gap,
      }),
    [
      cellAspectRatio,
      columnCount,
      containerSize.height,
      containerSize.width,
      gap,
      fitToHeight,
      maxCellWidth,
      minCellWidth,
      rowCount,
    ],
  );

  return {
    containerRef,
    metrics,
    isResizing,
  };
};
