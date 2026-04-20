import { type MemberConfig, type MetricConfig } from "@/lib/eod-schema";

export interface MetricSnapshot extends MetricConfig {
  raw: string | null;
  numericValue: number | null;
  displayValue: string | null;
}

export interface DailyRecord {
  date: string;
  hasSubmission: boolean;
  duplicateCount: number;
  taskScore: number | null;
  metrics: Record<string, MetricSnapshot>;
}

export interface MemberDataset extends MemberConfig {
  records: DailyRecord[];
  recordsByDate: Record<string, DailyRecord>;
  baselineByMetric: Record<string, number | null>;
}

export interface DashboardData {
  sourcePath: string;
  latestDate: string;
  availableDates: string[];
  members: MemberDataset[];
}

function buildBlankMetrics(member: MemberConfig) {
  return Object.fromEntries(
    member.metrics.map((metric) => [
      metric.key,
      {
        ...metric,
        raw: null,
        numericValue: null,
        displayValue: null,
      } satisfies MetricSnapshot,
    ]),
  );
}

export function buildEmptyRecord(member: MemberConfig, date: string): DailyRecord {
  return {
    date,
    hasSubmission: false,
    duplicateCount: 0,
    taskScore: null,
    metrics: buildBlankMetrics(member),
  };
}
