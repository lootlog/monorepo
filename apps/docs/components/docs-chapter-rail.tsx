import { docsChapters, type DocsChapterId } from "@/lib/docs-chapters";
import { useEffect, useRef, useState, type CSSProperties } from "react";

type DocsChapterRailProps = {
  activeChapterId: DocsChapterId;
};

type SegmentStyle = CSSProperties & {
  "--segment-color": string;
  "--segment-height"?: string;
  "--segment-top"?: string;
};

type SegmentRange = {
  height: number;
  top: number;
};

export function DocsChapterRail({ activeChapterId }: DocsChapterRailProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const [segmentRanges, setSegmentRanges] = useState<SegmentRange[] | null>(
    null,
  );

  useEffect(() => {
    const rail = railRef.current;
    const articleContent = rail?.closest<HTMLElement>(".docs-article-content");

    if (!articleContent) return;

    let animationFrameId = 0;

    const measureSegments = () => {
      const sectionHeadings = Array.from(
        articleContent.querySelectorAll<HTMLElement>(".docs-body h2"),
      );
      const boundaryCount = docsChapters.length - 1;

      if (sectionHeadings.length < boundaryCount) {
        setSegmentRanges(null);
        return;
      }

      const articleRect = articleContent.getBoundingClientRect();
      const lastHeadingIndex = sectionHeadings.length - 1;
      const lastBoundaryIndex = boundaryCount - 1;
      const boundaries = Array.from(
        { length: boundaryCount },
        (_, boundaryIndex) => {
          const headingIndex = Math.round(
            (boundaryIndex * lastHeadingIndex) / lastBoundaryIndex,
          );
          const sectionHeading = sectionHeadings[headingIndex];

          if (!sectionHeading) return 0;

          const headingRect = sectionHeading.getBoundingClientRect();

          return Math.round(
            Math.max(
              0,
              Math.min(articleRect.height, headingRect.top - articleRect.top),
            ),
          );
        },
      );
      const rangeStarts = [0, ...boundaries];
      const rangeEnds = [...boundaries, Math.round(articleRect.height)];
      const segmentGap = 5;
      const nextRanges = rangeStarts.map((top, index) => {
        const rangeEnd = rangeEnds[index] ?? top;

        return {
          top,
          height: Math.max(
            1,
            rangeEnd -
              top -
              (index === rangeStarts.length - 1 ? 0 : segmentGap),
          ),
        };
      });

      setSegmentRanges((currentRanges) => {
        const rangesAreEqual =
          currentRanges?.length === nextRanges.length &&
          currentRanges.every((range, index) => {
            const nextRange = nextRanges[index];

            return (
              nextRange !== undefined &&
              range.top === nextRange.top &&
              range.height === nextRange.height
            );
          });

        return rangesAreEqual ? currentRanges : nextRanges;
      });
    };

    const scheduleMeasurement = () => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(measureSegments);
    };
    const resizeObserver = new ResizeObserver(scheduleMeasurement);

    resizeObserver.observe(articleContent);
    scheduleMeasurement();
    window.addEventListener("resize", scheduleMeasurement);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleMeasurement);
    };
  }, [activeChapterId]);

  return (
    <div
      ref={railRef}
      className="docs-chapter-rail"
      data-aligned={segmentRanges ? true : undefined}
      aria-hidden="true"
    >
      {docsChapters.map((chapter, index) => {
        const range = segmentRanges?.[index];
        const style = {
          "--segment-color": chapter.color,
          "--segment-height": range ? `${range.height}px` : undefined,
          "--segment-top": range ? `${range.top}px` : undefined,
        } as SegmentStyle;

        return (
          <span
            key={chapter.id}
            className="docs-chapter-segment"
            data-active={chapter.id === activeChapterId}
            style={style}
          />
        );
      })}
    </div>
  );
}
