import Link from "next/link";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarRange,
  Gauge,
  LogOut,
  Minus,
  SmilePlus,
  Target,
  Users,
  Zap,
} from "lucide-react";

import { MoodEnergyChart, MemberMetricsChart, SparklineChart, TeamOutputChart } from "@/components/dashboard-charts";
import { DashboardFilters } from "@/components/dashboard-filters";
import {
  buildEmptyRecord,
  getConfiguredDataSource,
  getDashboardData,
  type DashboardData,
  type DailyRecord,
  type MemberDataset,
  type MetricSnapshot,
} from "@/lib/eod-data";
import { type MetricConfig } from "@/lib/eod-schema";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type Timeframe = "daily" | "weekly" | "monthly";
type TimeframeOption = {
  value: string;
  label: string;
  shortLabel: string;
  dates: string[];
};
type MemberHistoryPoint = {
  label: string;
  mood: number | null;
  energy: number | null;
  score: number | null;
} & Record<string, string | number | null>;

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseTimeframe(value: string | string[] | undefined): Timeframe {
  const normalized = getSingleParam(value)?.trim().toLowerCase();

  if (normalized === "weekly" || normalized === "week") {
    return "weekly";
  }

  if (normalized === "monthly" || normalized === "month") {
    return "monthly";
  }

  return "daily";
}

function average(values: Array<number | null>) {
  const filteredValues = values.filter((value): value is number => value !== null);

  if (!filteredValues.length) {
    return null;
  }

  return filteredValues.reduce((sum, value) => sum + value, 0) / filteredValues.length;
}

function averagePositive(values: number[]) {
  const filteredValues = values.filter((value) => value > 0);
  return filteredValues.length ? filteredValues.reduce((sum, value) => sum + value, 0) / filteredValues.length : 0;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function parseUtcDate(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addUtcDays(value: Date, count: number) {
  const nextValue = new Date(value);
  nextValue.setUTCDate(nextValue.getUTCDate() + count);
  return nextValue;
}

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parseUtcDate(value));
}

function formatCompactDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(parseUtcDate(value));
}

function formatMonthDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(parseUtcDate(value));
}

function formatRangeLabel(startDate: string, endDate: string) {
  const start = parseUtcDate(startDate);
  const end = parseUtcDate(endDate);
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const sameMonth = sameYear && start.getUTCMonth() === end.getUTCMonth();

  if (sameMonth) {
    const month = new Intl.DateTimeFormat("en-US", {
      month: "short",
      timeZone: "UTC",
    }).format(start);
    return `${month} ${start.getUTCDate()}-${end.getUTCDate()}, ${end.getUTCFullYear()}`;
  }

  if (sameYear) {
    return `${formatCompactDate(startDate)} - ${formatCompactDate(endDate)}, ${end.getUTCFullYear()}`;
  }

  return `${formatCompactDate(startDate)}, ${start.getUTCFullYear()} - ${formatCompactDate(endDate)}, ${end.getUTCFullYear()}`;
}

function formatScore(value: number | null) {
  if (value === null) {
    return "--";
  }

  return `${Math.round(value)}%`;
}

function formatStat(value: number | null, suffix = "") {
  if (value === null) {
    return "--";
  }

  const rounded = value >= 10 || Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);
  return `${Number(rounded)}${suffix}`;
}

function formatNumericMetric(type: MetricConfig["type"], value: number | null, fallback: string | null) {
  if (value === null) {
    return fallback;
  }

  if (type === "percent") {
    const rounded = value >= 10 ? value.toFixed(1) : value.toFixed(2);
    return `${Number(rounded)}%`;
  }

  if (type === "duration") {
    const totalSeconds = Math.round(value * 60);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    if (minutes > 0) {
      return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
    }

    return `${seconds}s`;
  }

  const formatter = Number.isInteger(value)
    ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 })
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

  return formatter.format(value);
}

function getWeeklyKey(value: string) {
  const date = parseUtcDate(value);
  const dayIndex = date.getUTCDay();
  const offset = dayIndex === 0 ? 6 : dayIndex - 1;
  date.setUTCDate(date.getUTCDate() - offset);
  return toIsoDate(date);
}

function getMonthlyKey(value: string) {
  const date = parseUtcDate(value);
  date.setUTCDate(1);
  return toIsoDate(date);
}

function getTimeframeKey(value: string, timeframe: Timeframe) {
  if (timeframe === "weekly") {
    return getWeeklyKey(value);
  }

  if (timeframe === "monthly") {
    return getMonthlyKey(value);
  }

  return value;
}

function buildTimeframeOptions(availableDates: string[], timeframe: Timeframe): TimeframeOption[] {
  const grouped = new Map<string, string[]>();

  for (const date of availableDates) {
    const key = getTimeframeKey(date, timeframe);
    const existingDates = grouped.get(key) ?? [];
    existingDates.push(date);
    grouped.set(key, existingDates);
  }

  return Array.from(grouped.entries())
    .map(([key, dates]) => {
      const sortedDates = [...dates].sort((left, right) => right.localeCompare(left));

      if (timeframe === "weekly") {
        const endDate = toIsoDate(addUtcDays(parseUtcDate(key), 6));
        return {
          value: key,
          label: formatRangeLabel(key, endDate),
          shortLabel: `${formatCompactDate(key)}-${formatCompactDate(endDate)}`,
          dates: sortedDates,
        };
      }

      if (timeframe === "monthly") {
        const label = formatMonthDate(key);
        return {
          value: key,
          label,
          shortLabel: label,
          dates: sortedDates,
        };
      }

      return {
        value: key,
        label: formatLongDate(key),
        shortLabel: formatCompactDate(key),
        dates: sortedDates,
      };
    })
    .sort((left, right) => right.value.localeCompare(left.value));
}

function getRecordForDate(member: MemberDataset, date: string) {
  return member.recordsByDate[date] ?? buildEmptyRecord(member, date);
}

function aggregateMetricSnapshots(metric: MetricConfig, snapshots: Array<MetricSnapshot | undefined>): MetricSnapshot {
  const nonEmptySnapshots = snapshots.filter(
    (snapshot): snapshot is MetricSnapshot =>
      Boolean(snapshot && (snapshot.raw !== null || snapshot.numericValue !== null || snapshot.displayValue !== null)),
  );

  if (!nonEmptySnapshots.length) {
    return {
      ...metric,
      raw: null,
      numericValue: null,
      displayValue: null,
    };
  }

  if (metric.type === "text") {
    const latestText =
      [...nonEmptySnapshots]
        .reverse()
        .map((snapshot) => snapshot.displayValue ?? snapshot.raw)
        .find(Boolean) ?? null;

    return {
      ...metric,
      raw: latestText,
      numericValue: null,
      displayValue: latestText,
    };
  }

  const numericValues = nonEmptySnapshots
    .map((snapshot) => snapshot.numericValue)
    .filter((value): value is number => value !== null && Number.isFinite(value));

  if (!numericValues.length) {
    const fallback = nonEmptySnapshots.at(-1)?.displayValue ?? nonEmptySnapshots.at(-1)?.raw ?? null;
    return {
      ...metric,
      raw: fallback,
      numericValue: null,
      displayValue: fallback,
    };
  }

  const aggregatedValue =
    metric.type === "count" || metric.type === "duration"
      ? sum(numericValues)
      : average(numericValues);
  const fallback = nonEmptySnapshots.at(-1)?.displayValue ?? nonEmptySnapshots.at(-1)?.raw ?? null;

  return {
    ...metric,
    raw: nonEmptySnapshots.map((snapshot) => snapshot.raw).filter(Boolean).join(" | "),
    numericValue: aggregatedValue,
    displayValue: formatNumericMetric(metric.type, aggregatedValue, fallback),
  };
}

function buildWindowRecord(member: MemberDataset, dates: string[]) {
  const populatedRecords = dates
    .map((date) => member.recordsByDate[date])
    .filter((record): record is DailyRecord => Boolean(record));

  if (!populatedRecords.length) {
    return buildEmptyRecord(member, dates[0] ?? member.records[0]?.date ?? "");
  }

  const metrics = Object.fromEntries(
    member.metrics.map((metric) => [
      metric.key,
      aggregateMetricSnapshots(metric, populatedRecords.map((record) => record.metrics[metric.key])),
    ]),
  );

  return {
    date: dates[0] ?? populatedRecords[0].date,
    hasSubmission: populatedRecords.some((record) => record.hasSubmission),
    duplicateCount: populatedRecords.reduce((count, record) => count + record.duplicateCount, 0),
    taskScore: average(populatedRecords.map((record) => record.taskScore)),
    metrics,
  } satisfies DailyRecord;
}

function buildRecentTeamTrend(members: MemberDataset[], options: TimeframeOption[]) {
  return options.map((option) => {
    const records = members.map((member) => buildWindowRecord(member, option.dates));

    return {
      option,
      submissions: records.filter((record) => record.hasSubmission).length,
      moodAverage: average(records.map((record) => record.metrics.mood?.numericValue ?? null)),
      energyAverage: average(records.map((record) => record.metrics.energy?.numericValue ?? null)),
      scoreAverage: average(records.map((record) => record.taskScore)),
    };
  });
}

function buildLeaderboard(members: MemberDataset[], option: TimeframeOption) {
  return members
    .map((member) => ({
      member,
      record: buildWindowRecord(member, option.dates),
    }))
    .sort((left, right) => {
      const leftScore = left.record.taskScore ?? -1;
      const rightScore = right.record.taskScore ?? -1;

      if (leftScore !== rightScore) {
        return rightScore - leftScore;
      }

      if (left.record.hasSubmission !== right.record.hasSubmission) {
        return Number(right.record.hasSubmission) - Number(left.record.hasSubmission);
      }

      return left.member.displayName.localeCompare(right.member.displayName);
    });
}

function getTimeframeCopy(timeframe: Timeframe) {
  if (timeframe === "weekly") {
    return {
      title: "Weekly",
      noun: "week",
      label: "Week",
      history: "Recent weekly history",
      trend: "Weekly momentum",
    };
  }

  if (timeframe === "monthly") {
    return {
      title: "Monthly",
      noun: "month",
      label: "Month",
      history: "Recent monthly history",
      trend: "Monthly momentum",
    };
  }

  return {
    title: "Daily",
    noun: "day",
    label: "Date",
    history: "Recent daily history",
    trend: "Daily momentum",
  };
}

function getPrimaryMetric(member: MemberDataset) {
  return (
    member.metrics.find((metric) => metric.key === member.primaryMetricKey) ??
    member.metrics.find((metric) => metric.isTask) ??
    member.metrics[0]
  );
}

function buildMemberHistorySeries(member: MemberDataset, options: TimeframeOption[]): MemberHistoryPoint[] {
  return [...options]
    .reverse()
    .map((option) => {
      const record = buildWindowRecord(member, option.dates);
      const metricValues = Object.fromEntries(
        member.metrics.map((metric) => [metric.key, record.metrics[metric.key]?.numericValue ?? 0]),
      );

      return {
        label: option.shortLabel,
        mood: record.metrics.mood?.numericValue ?? null,
        energy: record.metrics.energy?.numericValue ?? null,
        score: record.taskScore,
        ...metricValues,
      };
    });
}

function buildPrimaryMetricTrend(member: MemberDataset, options: TimeframeOption[]) {
  const primaryMetric = getPrimaryMetric(member);
  const series = buildMemberHistorySeries(member, options);
  const values = series.map((point) => Number(point[primaryMetric.key] ?? 0));
  const recentSlice = values.slice(-8);
  const midpoint = Math.max(1, Math.floor(recentSlice.length / 2));
  const previousWindow = recentSlice.slice(0, midpoint);
  const recentWindow = recentSlice.slice(midpoint);
  const previousAverage = averagePositive(previousWindow);
  const recentAverage = averagePositive(recentWindow);

  if (!previousAverage && !recentAverage) {
    return 0;
  }

  if (!previousAverage) {
    return 100;
  }

  return ((recentAverage - previousAverage) / previousAverage) * 100;
}

function buildTeamMoodSeries(teamTrend: ReturnType<typeof buildRecentTeamTrend>) {
  return [...teamTrend].reverse().map((row) => ({
    label: row.option.shortLabel,
    mood: row.moodAverage,
    energy: row.energyAverage,
  }));
}

function buildTeamOutputSeries(teamTrend: ReturnType<typeof buildRecentTeamTrend>) {
  return [...teamTrend].reverse().map((row) => ({
    label: row.option.shortLabel,
    reported: row.submissions,
    score: row.scoreAverage,
  }));
}

function getTrendState(trend: number) {
  if (trend > 5) {
    return {
      icon: ArrowUpRight,
      className: "is-positive",
      label: `${Math.round(Math.abs(trend))}%`,
    };
  }

  if (trend < -5) {
    return {
      icon: ArrowDownRight,
      className: "is-negative",
      label: `${Math.round(Math.abs(trend))}%`,
    };
  }

  return {
    icon: Minus,
    className: "is-neutral",
    label: `${Math.round(Math.abs(trend))}%`,
  };
}

function SectionCard({
  eyebrow,
  title,
  helper,
  children,
}: {
  eyebrow: string;
  title: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="section-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        {helper ? <span className="section-helper">{helper}</span> : null}
      </div>
      {children}
    </section>
  );
}

function StatTile({
  label,
  value,
  helper,
  accent,
  icon,
}: {
  label: string;
  value: string;
  helper: string;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="stat-tile" style={{ ["--tile-accent" as string]: accent }}>
      <div className="stat-kicker">
        <span className="stat-icon">{icon}</span>
        <span>{label}</span>
      </div>
      <strong className="stat-value">{value}</strong>
      <p className="stat-helper">{helper}</p>
    </article>
  );
}

function GoalPill({ label, target }: { label: string; target: string }) {
  return (
    <div className="goal-pill">
      <Target size={12} />
      <span>{label}</span>
      <strong>{target}</strong>
    </div>
  );
}

function MemberOverviewCard({
  member,
  selectedOption,
  selectedTimeframe,
  sparkline,
  trend,
}: {
  member: MemberDataset;
  selectedOption: TimeframeOption;
  selectedTimeframe: Timeframe;
  sparkline: Array<{ label: string; value: number }>;
  trend: number;
}) {
  const primaryMetric = getPrimaryMetric(member);
  const selectedRecord = buildWindowRecord(member, selectedOption.dates);
  const trendState = getTrendState(trend);
  const TrendIcon = trendState.icon;
  const averageMood = averagePositive(
    member.records.map((record) => record.metrics.mood?.numericValue ?? 0).filter((value) => value > 0),
  );
  const averageEnergy = averagePositive(
    member.records.map((record) => record.metrics.energy?.numericValue ?? 0).filter((value) => value > 0),
  );

  return (
    <article className="member-overview-card">
      <div className="member-card-top">
        <div className="member-identity">
          <div className="avatar-badge" style={{ ["--member-accent" as string]: member.accent }}>
            {member.avatar}
          </div>
          <div>
            <h3>{member.displayName}</h3>
            <p>{member.role}</p>
          </div>
        </div>

        <div className="member-mood-pair">
          <span>
            <SmilePlus size={12} />
            {averageMood ? averageMood.toFixed(1) : "--"}
          </span>
          <span>
            <Zap size={12} />
            {averageEnergy ? averageEnergy.toFixed(1) : "--"}
          </span>
        </div>
      </div>

      <div className="member-primary-block">
        <div>
          <div className="micro-label">{primaryMetric.label}</div>
          <div className="member-primary-value" style={{ color: member.accent }}>
            {selectedRecord.metrics[primaryMetric.key]?.displayValue ?? "--"}
          </div>
        </div>

        <div className={`trend-pill ${trendState.className}`}>
          <TrendIcon size={12} />
          <span>{trendState.label}</span>
        </div>
      </div>

      <div className="member-secondary-row">
        <div>
          <div className="micro-label">Window</div>
          <span>{selectedOption.shortLabel}</span>
        </div>
        <div>
          <div className="micro-label">Reports</div>
          <span>{member.records.length}</span>
        </div>
      </div>

      <SparklineChart data={sparkline} color={member.accent} />

      <div className="member-card-footer">
        <span>{selectedTimeframe} cadence</span>
        <Link href={`/?member=${member.id}&period=${selectedTimeframe}&date=${selectedOption.value}`}>Open member</Link>
      </div>
    </article>
  );
}

function LeaderboardTable({
  leaderboard,
  activeMemberId,
}: {
  leaderboard: Array<{ member: MemberDataset; record: DailyRecord }>;
  activeMemberId?: string;
}) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Member</th>
            <th>Status</th>
            <th>Task score</th>
            <th>Highlights</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map(({ member, record }, index) => (
            <tr key={member.id} className={activeMemberId === member.id ? "is-highlighted-row" : undefined}>
              <td>{index + 1}</td>
              <td>{member.displayName}</td>
              <td>{record.hasSubmission ? "Submitted" : "Blank"}</td>
              <td>{formatScore(record.taskScore)}</td>
              <td className="table-highlights">
                {Object.values(record.metrics)
                  .filter((metric) => metric.isTask && metric.displayValue)
                  .slice(0, 2)
                  .map((metric) => `${metric.label}: ${metric.displayValue}`)
                  .join(" | ") || "--"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecordsTable({
  member,
  options,
}: {
  member: MemberDataset;
  options: TimeframeOption[];
}) {
  return (
    <div className="table-scroll">
      <table className="data-table record-table">
        <thead>
          <tr>
            <th>Window</th>
            {member.metrics.map((metric) => (
              <th key={metric.key}>{metric.label}</th>
            ))}
            <th>Mood</th>
            <th>Energy</th>
          </tr>
        </thead>
        <tbody>
          {options.map((option) => {
            const record = buildWindowRecord(member, option.dates);
            return (
              <tr key={option.value}>
                <td>{option.shortLabel}</td>
                {member.metrics.map((metric) => (
                  <td key={`${option.value}-${metric.key}`}>{record.metrics[metric.key]?.displayValue ?? "--"}</td>
                ))}
                <td>{record.metrics.mood?.displayValue ?? "--"}</td>
                <td>{record.metrics.energy?.displayValue ?? "--"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const dataSource = getConfiguredDataSource();
  let dashboard: DashboardData | null = null;
  let loadError: string | null = null;

  try {
    dashboard = await getDashboardData();
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Unable to load the EOD data source.";
  }

  if (loadError) {
    return (
      <main className="page-shell">
        <section className="hero-panel">
          <div>
            <p className="eyebrow">Dew Claw Dashboard</p>
            <h1>Data source needs attention</h1>
            <p className="hero-body-copy">{loadError}</p>
            <p className="hero-body-copy">
              {dataSource === "google-sheets"
                ? "Set the Google Sheets env vars and share the sheet with the service-account email."
                : dataSource === "google-sheets-public"
                  ? "Set the published CSV URL env vars for each tab and make sure each sheet is published to the web."
                  : "Refresh the Excel snapshot with npm run sync:data and try again."}
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (!dashboard || !dashboard.availableDates.length) {
    return (
      <main className="page-shell">
        <section className="hero-panel">
          <div>
            <p className="eyebrow">Dew Claw Dashboard</p>
            <h1>No report data found</h1>
            <p className="hero-body-copy">The selected source did not return any usable EOD records yet.</p>
          </div>
        </section>
      </main>
    );
  }

  const selectedTimeframe = parseTimeframe(params.period);
  const timeframeCopy = getTimeframeCopy(selectedTimeframe);
  const timeframeOptions = buildTimeframeOptions(dashboard.availableDates, selectedTimeframe);
  const selectedDateParam = getSingleParam(params.date);
  const selectedMemberParam = getSingleParam(params.member) ?? "all";
  const selectedOption = timeframeOptions.find((option) => option.value === selectedDateParam) ?? timeframeOptions[0];

  if (!selectedOption) {
    return null;
  }

  const selectedMember =
    selectedMemberParam === "all"
      ? null
      : dashboard.members.find((member) => member.id === selectedMemberParam) ?? null;

  const selectedRecords = dashboard.members.map((member) => ({
    member,
    record: buildWindowRecord(member, selectedOption.dates),
  }));
  const submittedCount = selectedRecords.filter(({ record }) => record.hasSubmission).length;
  const missingCount = dashboard.members.length - submittedCount;
  const averageMood = average(selectedRecords.map(({ record }) => record.metrics.mood?.numericValue ?? null));
  const averageEnergy = average(selectedRecords.map(({ record }) => record.metrics.energy?.numericValue ?? null));
  const averageTaskScore = average(selectedRecords.map(({ record }) => record.taskScore));
  const recentOptions = timeframeOptions.slice(0, 10);
  const teamTrend = buildRecentTeamTrend(dashboard.members, recentOptions);
  const leaderboard = buildLeaderboard(dashboard.members, selectedOption);
  const teamMoodSeries = buildTeamMoodSeries(teamTrend);
  const teamOutputSeries = buildTeamOutputSeries(teamTrend);

  return (
    <main className="page-shell">
      <header className="dashboard-header">
        <div className="brand-lockup">
          <div className="brand-mark">DC</div>
          <div className="brand-copy">
            <strong>Dew Claw</strong>
            <span>{selectedMember ? `${selectedMember.displayName} detail` : "Performance dashboard"}</span>
          </div>
        </div>

        <div className="header-actions">
          <span className="live-chip">Live source</span>
          <span className="source-chip">{dashboard.sourcePath}</span>
          <form action="/api/auth/logout" method="post">
            <button className="logout-button" type="submit">
              <LogOut size={14} />
              <span>Log out</span>
            </button>
          </form>
        </div>
      </header>

      <section className="hero-panel hero-panel--command">
        <div className="hero-copy">
          <p className="eyebrow">Dew Claw Intelligence Hub</p>
          <h1>{selectedMember ? `${selectedMember.displayName} performance brief` : "Team performance command center"}</h1>
          <p className="hero-body-copy">
            Showing the {selectedTimeframe} EOD rollup for {selectedOption.label}. Duplicate same-day rows are averaged
            before they flow into each {timeframeCopy.noun}.
          </p>
        </div>

        <div className="hero-summary">
          <div>
            <span className="micro-label">Cadence</span>
            <strong>{timeframeCopy.title}</strong>
          </div>
          <div>
            <span className="micro-label">Window</span>
            <strong>{selectedOption.shortLabel}</strong>
          </div>
        </div>
      </section>

      <DashboardFilters
        dateOptions={timeframeOptions.map((option) => ({
          value: option.value,
          label: option.label,
        }))}
        members={dashboard.members.map((member) => ({
          id: member.id,
          displayName: member.displayName,
        }))}
        selectedDate={selectedOption.value}
        selectedMemberId={selectedMember?.id ?? "all"}
        selectedPeriod={selectedTimeframe}
      />

      <section className="stats-band">
        <StatTile
          label="Team Members"
          value={String(dashboard.members.length)}
          helper="Active roster in the dashboard."
          accent="#fb923c"
          icon={<Users size={12} />}
        />
        <StatTile
          label={`${timeframeCopy.title} Reported`}
          value={`${submittedCount}/${dashboard.members.length}`}
          helper={`Members with a submission in this ${timeframeCopy.noun}.`}
          accent="#818cf8"
          icon={<BarChart3 size={12} />}
        />
        <StatTile
          label="Avg Mood"
          value={formatStat(averageMood)}
          helper={`Average mood for the selected ${timeframeCopy.noun}.`}
          accent="#22c55e"
          icon={<SmilePlus size={12} />}
        />
        <StatTile
          label="Avg Energy"
          value={formatStat(averageEnergy)}
          helper={`Average energy for the selected ${timeframeCopy.noun}.`}
          accent="#facc15"
          icon={<Zap size={12} />}
        />
        <StatTile
          label="Avg Task Score"
          value={formatScore(averageTaskScore)}
          helper="Normalized against each member's own baseline."
          accent="#7c3aed"
          icon={<Gauge size={12} />}
        />
        <StatTile
          label="Still Blank"
          value={String(missingCount)}
          helper={`No usable EOD activity in this ${timeframeCopy.noun}.`}
          accent="#f43f5e"
          icon={<CalendarRange size={12} />}
        />
      </section>

      {selectedMember ? (
        <>
          <section className="goal-row">
            {selectedMember.goals.map((goal) => (
              <GoalPill key={`${goal.label}-${goal.target}`} label={goal.label} target={goal.target} />
            ))}
          </section>

          <section className="stats-band compact">
            {selectedMember.metrics
              .filter((metric) => metric.isTask)
              .map((metric, index) => {
                const record = buildWindowRecord(selectedMember, selectedOption.dates);
                return (
                  <StatTile
                    key={metric.key}
                    label={metric.label}
                    value={record.metrics[metric.key]?.displayValue ?? "--"}
                    helper={`Selected ${timeframeCopy.noun} snapshot`}
                    accent={["#fb923c", "#60a5fa", "#f472b6", "#4ade80", "#facc15"][index % 5]}
                    icon={<Activity size={12} />}
                  />
                );
              })}
          </section>

          <section className="detail-grid">
            <SectionCard
              eyebrow="Activity"
              title={`${selectedMember.displayName}'s output trend`}
              helper={`Recent ${timeframeCopy.noun} history`}
            >
              <MemberMetricsChart
                data={buildMemberHistorySeries(selectedMember, recentOptions)}
                series={[
                  {
                    key: getPrimaryMetric(selectedMember).key,
                    label: getPrimaryMetric(selectedMember).label,
                    color: selectedMember.accent,
                    type: "line",
                  },
                  ...selectedMember.metrics
                    .filter((metric) => metric.isTask && metric.key !== getPrimaryMetric(selectedMember).key)
                    .slice(0, 2)
                    .map((metric, index) => ({
                      key: metric.key,
                      label: metric.label,
                      color: ["#818cf8", "#f472b6", "#22c55e"][index % 3],
                      type: "bar" as const,
                    })),
                ]}
              />
            </SectionCard>

            <SectionCard
              eyebrow="Wellbeing"
              title="Mood and energy trend"
              helper="Blank periods remain blank"
            >
              <MoodEnergyChart
                data={buildMemberHistorySeries(selectedMember, recentOptions).map((row) => ({
                  label: row.label,
                  mood: typeof row.mood === "number" ? row.mood : null,
                  energy: typeof row.energy === "number" ? row.energy : null,
                }))}
              />
            </SectionCard>
          </section>

          <SectionCard
            eyebrow="Records"
            title="Detailed history"
            helper={`${recentOptions.length} recent ${timeframeCopy.noun} windows`}
          >
            <RecordsTable member={selectedMember} options={recentOptions} />
          </SectionCard>
        </>
      ) : (
        <>
          <SectionCard
            eyebrow="Team Members"
            title={`${timeframeCopy.title} member snapshot`}
            helper="Open any card for a deeper view"
          >
            <div className="member-card-grid">
              {dashboard.members.map((member) => {
                const historySeries = buildMemberHistorySeries(member, recentOptions);
                const primaryMetric = getPrimaryMetric(member);

                return (
                  <MemberOverviewCard
                    key={member.id}
                    member={member}
                    selectedOption={selectedOption}
                    selectedTimeframe={selectedTimeframe}
                    sparkline={historySeries.map((row) => ({
                      label: row.label,
                      value: Number(row[primaryMetric.key] ?? 0),
                    }))}
                    trend={buildPrimaryMetricTrend(member, recentOptions)}
                  />
                );
              })}
            </div>
          </SectionCard>

          <section className="detail-grid">
            <SectionCard eyebrow="Mood & Energy" title="Team wellbeing pulse" helper="Average mood and energy by period">
              <MoodEnergyChart data={teamMoodSeries} />
            </SectionCard>

            <SectionCard eyebrow="Momentum" title={`${timeframeCopy.title} output trend`} helper="Reported members and average task score">
              <TeamOutputChart data={teamOutputSeries} />
            </SectionCard>
          </section>

          <section className="detail-grid">
            <SectionCard eyebrow="Leaderboard" title={`${timeframeCopy.title} task ranking`} helper="Normalized against each person's baseline">
              <LeaderboardTable leaderboard={leaderboard} />
            </SectionCard>

            <SectionCard eyebrow="Windows" title={`${timeframeCopy.title} coverage`} helper="Recent submission coverage by period">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{timeframeCopy.label}</th>
                      <th>Reported</th>
                      <th>Avg mood</th>
                      <th>Avg energy</th>
                      <th>Avg task score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamTrend.map((row) => (
                      <tr key={row.option.value}>
                        <td>{row.option.shortLabel}</td>
                        <td>{row.submissions}</td>
                        <td>{formatStat(row.moodAverage)}</td>
                        <td>{formatStat(row.energyAverage)}</td>
                        <td>{formatScore(row.scoreAverage)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </section>
        </>
      )}

      <footer className="dashboard-footer">Dew Claw End of Day Dashboard</footer>
    </main>
  );
}
