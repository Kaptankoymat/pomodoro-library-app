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

    const observer = new ResizeObserver(([entry]) => {
      const nextWidth = Math.round(entry.contentRect.width);
      const nextHeight = Math.round(entry.contentRect.height);

      setIsResizing(true);
      setContainerSize((currentSize) => {
        const widthChanged =
          Math.abs(currentSize.width - nextWidth) >= measurementEpsilon;
        const heightChanged =
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
  }, [measurementEpsilon, resizeSettleMs]);

  const metrics = useMemo(
    () =>
      createGridMetrics({
        containerWidth: containerSize.width,
        containerHeight: containerSize.height,
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
