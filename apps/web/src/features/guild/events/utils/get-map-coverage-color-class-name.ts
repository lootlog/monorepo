import type { MapGap } from "../types/api";

type CoverageSegmentType = "COVERED" | MapGap["gapType"];

/** Fill colour of a coverage segment, shared by timelines, legends and gap lists. */
export const COVERAGE_SEGMENT_BG_CLASS_NAMES: Record<
  CoverageSegmentType,
  string
> = {
  COVERED: "bg-signal-ready",
  UNCOVERED: "bg-signal-timer",
  UNASSIGNED: "bg-signal-alert",
};

/** Text colour of a coverage segment's metric. */
export const COVERAGE_SEGMENT_TEXT_CLASS_NAMES: Record<
  CoverageSegmentType,
  string
> = {
  COVERED: "text-signal-ready",
  UNCOVERED: "text-signal-timer",
  UNASSIGNED: "text-signal-alert",
};

export const getMapCoverageColorClassName = (coveragePercent: number) => {
  if (coveragePercent < 50) {
    return COVERAGE_SEGMENT_TEXT_CLASS_NAMES.UNASSIGNED;
  }

  if (coveragePercent < 90) {
    return COVERAGE_SEGMENT_TEXT_CLASS_NAMES.UNCOVERED;
  }

  return COVERAGE_SEGMENT_TEXT_CLASS_NAMES.COVERED;
};

/** Colour of a "covered of total maps" count: all, some or none covered. */
export const getCoveredMapsColorClassName = (
  coveredMapsCount: number,
  totalMapsCount: number,
) => {
  if (coveredMapsCount === totalMapsCount) {
    return COVERAGE_SEGMENT_TEXT_CLASS_NAMES.COVERED;
  }

  if (coveredMapsCount > 0) {
    return COVERAGE_SEGMENT_TEXT_CLASS_NAMES.UNCOVERED;
  }

  return COVERAGE_SEGMENT_TEXT_CLASS_NAMES.UNASSIGNED;
};
