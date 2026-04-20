import Link from "next/link";

import { DashboardFilters } from "@/components/dashboard-filters";
import {
  buildEmptyRecord,
  getConfiguredDataSource,
  getDashboardData,
  type DashboardData,
  type DailyRecord,
  type MemberDataset,
} from "@/lib/eod-data";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function average(values: Array<number | null>) {
  const filteredValues = values.filter((value): value is number => value !== null);

  if (!filteredValues.length) {
    return null;
  }

  return filteredValues.reduce((sum, value) => sum + value, 0) / filteredValues.length;
}

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatCompactDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
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

function getRecordForDate(member: MemberDataset, date: string) {
  return member.recordsByDate[date] ?? buildEmptyRecord(member, date);
}

function buildRecentTeamTrend(members: MemberDataset[], dates: string[]) {
  return dates.map((date) => {
    const records = members.map((member) => getRecordForDate(member, date));

    return {
      date,
      submissions: records.filter((record) => record.hasSubmission).length,
      moodAverage: average(records.map((record) => record.metrics.mood?.numericValue ?? null)),
      energyAverage: average(records.map((record) => record.metrics.energy?.numericValue ?? null)),
      scoreAverage: average(records.map((record) => record.taskScore)),
    };
  });
}

function buildLeaderboard(members: MemberDataset[], date: string) {
  return members
    .map((member) => ({
      member,
      record: getRecordForDate(member, date),
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

function renderMetricList(record: DailyRecord, limit?: number) {
  const entries = Object.values(record.metrics)
    .filter((metric) => metric.isTask)
    .slice(0, limit);

  return (
    <div className="metric-grid">
      {entries.map((metric) => (
        <div key={metric.key} className="metric-chip">
          <span>{metric.label}</span>
          <strong>{metric.displayValue ?? "--"}</strong>
        </div>
      ))}
    </div>
  );
}

function MemberSnapshotCard({
  member,
  record,
  date,
}: {
  member: MemberDataset;
  record: DailyRecord;
  date: string;
}) {
  return (
    <article className={`member-card${record.hasSubmission ? "" : " is-muted"}`}>
      <div className="member-card-head">
        <div>
          <div className="member-color" style={{ backgroundColor: member.accent }} />
          <h3>{member.displayName}</h3>
        </div>
        <span className={`status-badge${record.hasSubmission ? " is-live" : ""}`}>
          {record.hasSubmission ? "Submitted" : "Blank"}
        </span>
      </div>

      <p className="member-card-copy">
        {record.duplicateCount > 1
          ? `Duplicate entries were averaged for ${formatCompactDate(date)}.`
          : `Snapshot for ${formatCompactDate(date)}.`}
      </p>

      {renderMetricList(record)}

      <div className="member-meta">
        <span>Task score: {formatScore(record.taskScore)}</span>
        <Link href={`/?member=${member.id}&date=${date}`}>Open member view</Link>
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
            <tr
              key={member.id}
              className={activeMemberId === member.id ? "is-highlighted-row" : undefined}
            >
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

function TeamCoverageTable({
  members,
  dates,
}: {
  members: MemberDataset[];
  dates: string[];
}) {
  return (
    <div className="table-scroll">
      <table className="data-table coverage-table">
        <thead>
          <tr>
            <th>Date</th>
            {members.map((member) => (
              <th key={member.id}>{member.displayName}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dates.map((date) => (
            <tr key={date}>
              <td>{formatCompactDate(date)}</td>
              {members.map((member) => {
                const record = getRecordForDate(member, date);

                return (
                  <td key={`${member.id}-${date}`}>
                    <span
                      className={`coverage-dot${record.hasSubmission ? " is-filled" : ""}`}
                      title={record.hasSubmission ? "Submitted" : "Blank"}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MemberHistoryTable({
  member,
  dates,
}: {
  member: MemberDataset;
  dates: string[];
}) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>Date</th>
            {member.metrics.map((metric) => (
              <th key={metric.key}>{metric.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dates.map((date) => {
            const record = getRecordForDate(member, date);

            return (
              <tr key={date}>
                <td>{formatCompactDate(date)}</td>
                {member.metrics.map((metric) => (
                  <td key={`${date}-${metric.key}`}>{record.metrics[metric.key]?.displayValue ?? "--"}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{helper}</p>
    </article>
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
            <p className="eyebrow">Dew Claw Daily Dashboard</p>
            <h1>Data source needs attention</h1>
            <p>{loadError}</p>
            <p>
              {dataSource === "google-sheets"
                ? "On Render, set the Google Sheets env vars and share the sheet with the service-account email before reloading the app."
                : "If you are using the Excel snapshot flow, refresh the snapshot with npm run sync:data and try again."}
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (!dashboard) {
    return null;
  }

  if (!dashboard.availableDates.length) {
    return (
      <main className="page-shell">
        <section className="hero-panel">
          <div>
            <p className="eyebrow">Dew Claw Daily Dashboard</p>
            <h1>No report data found</h1>
            <p>
              {dataSource === "google-sheets"
                ? "The connected Google Sheet did not return any usable EOD rows yet."
                : "Refresh the Excel snapshot with npm run sync:data to populate the app."}
            </p>
          </div>
        </section>
      </main>
    );
  }

  const selectedDateParam = getSingleParam(params.date);
  const selectedMemberParam = getSingleParam(params.member) ?? "all";
  const selectedDate = dashboard.availableDates.includes(selectedDateParam ?? "")
    ? selectedDateParam ?? dashboard.latestDate
    : dashboard.latestDate;
  const selectedMember =
    selectedMemberParam === "all"
      ? null
      : dashboard.members.find((member) => member.id === selectedMemberParam) ?? null;
  const selectedRecords = dashboard.members.map((member) => ({
    member,
    record: getRecordForDate(member, selectedDate),
  }));
  const submittedCount = selectedRecords.filter(({ record }) => record.hasSubmission).length;
  const missingCount = dashboard.members.length - submittedCount;
  const averageMood = average(
    selectedRecords.map(({ record }) => record.metrics.mood?.numericValue ?? null),
  );
  const averageEnergy = average(
    selectedRecords.map(({ record }) => record.metrics.energy?.numericValue ?? null),
  );
  const averageTaskScore = average(selectedRecords.map(({ record }) => record.taskScore));
  const recentDates = dashboard.availableDates.slice(0, 10);
  const teamTrend = buildRecentTeamTrend(dashboard.members, recentDates);
  const leaderboard = buildLeaderboard(dashboard.members, selectedDate);

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Dew Claw Daily Dashboard</p>
          <h1>{selectedMember ? `${selectedMember.displayName} view` : "Overall team summary"}</h1>
          <p>
            Showing the EOD snapshot for {formatLongDate(selectedDate)}. Duplicate same-day rows are
            averaged before they hit the dashboard.
          </p>
        </div>

        <div className="hero-actions">
          <span className="source-pill">{dashboard.sourcePath}</span>
          <form action="/api/auth/logout" method="post">
            <button className="secondary-button" type="submit">
              Log out
            </button>
          </form>
        </div>
      </section>

      <DashboardFilters
        dates={dashboard.availableDates}
        members={dashboard.members.map((member) => ({
          id: member.id,
          displayName: member.displayName,
        }))}
        selectedDate={selectedDate}
        selectedMemberId={selectedMember?.id ?? "all"}
      />

      <section className="stats-grid">
        <StatCard
          label="Reported"
          value={`${submittedCount}/${dashboard.members.length}`}
          helper="Members with a populated EOD entry on the selected date."
        />
        <StatCard
          label="Still blank"
          value={String(missingCount)}
          helper="Members who have no submission or only blank values for that day."
        />
        <StatCard
          label="Avg mood"
          value={formatStat(averageMood)}
          helper="Average of the numeric mood ratings available that day."
        />
        <StatCard
          label="Avg energy"
          value={formatStat(averageEnergy)}
          helper="Average of the recorded energy values for the selected date."
        />
        <StatCard
          label="Avg task score"
          value={formatScore(averageTaskScore)}
          helper="Task output relative to each member's own historical baseline."
        />
      </section>

      {selectedMember ? (
        <>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Selected Day</p>
                <h2>{selectedMember.displayName}'s task snapshot</h2>
              </div>
              <span className="status-badge">
                {getRecordForDate(selectedMember, selectedDate).hasSubmission ? "Submitted" : "Blank"}
              </span>
            </div>
            {renderMetricList(getRecordForDate(selectedMember, selectedDate))}
          </section>

          <section className="two-column-grid">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Daily Trend</p>
                  <h2>Recent history</h2>
                </div>
                <span className="table-helper">Blank days stay blank on purpose</span>
              </div>
              <MemberHistoryTable member={selectedMember} dates={recentDates} />
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Leaderboard</p>
                  <h2>Team comparison for this day</h2>
                </div>
                <span className="table-helper">Highlighted row shows the active member</span>
              </div>
              <LeaderboardTable leaderboard={leaderboard} activeMemberId={selectedMember.id} />
            </section>
          </section>
        </>
      ) : (
        <>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Task Tracker</p>
                <h2>Team task snapshot</h2>
              </div>
              <span className="table-helper">Open any card to switch into that member's history</span>
            </div>

            <div className="member-grid">
              {selectedRecords.map(({ member, record }) => (
                <MemberSnapshotCard
                  key={member.id}
                  member={member}
                  record={record}
                  date={selectedDate}
                />
              ))}
            </div>
          </section>

          <section className="two-column-grid">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Leaderboard</p>
                  <h2>Daily task ranking</h2>
                </div>
                <span className="table-helper">Scores are normalized against each person's own baseline</span>
              </div>
              <LeaderboardTable leaderboard={leaderboard} />
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Daily Trend</p>
                  <h2>Recent team movement</h2>
                </div>
                <span className="table-helper">Shows submissions, mood, energy, and task score by day</span>
              </div>

              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Reported</th>
                      <th>Avg mood</th>
                      <th>Avg energy</th>
                      <th>Avg task score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamTrend.map((row) => (
                      <tr key={row.date}>
                        <td>{formatCompactDate(row.date)}</td>
                        <td>{row.submissions}</td>
                        <td>{formatStat(row.moodAverage)}</td>
                        <td>{formatStat(row.energyAverage)}</td>
                        <td>{formatScore(row.scoreAverage)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Coverage</p>
                <h2>Submission grid</h2>
              </div>
              <span className="table-helper">Filled dots mean a submitted EOD for that date</span>
            </div>
            <TeamCoverageTable members={dashboard.members} dates={recentDates} />
          </section>
        </>
      )}
    </main>
  );
}
