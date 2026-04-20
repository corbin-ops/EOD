import fs from "node:fs";
import path from "node:path";

import XLSX from "xlsx";

const TEAM_MEMBERS = [
  {
    id: "chenge",
    sheetName: "Chenge",
    displayName: "Chenge",
    accent: "#ff7a59",
    metrics: [
      { key: "textsSent", label: "Texts Sent", type: "count", isTask: true },
      { key: "followUpTexts", label: "# Texts Sent", type: "count", isTask: true },
      { key: "mailScrubbed", label: "# Mail Scrubbed", type: "count", isTask: true },
      { key: "mood", label: "Mood", type: "rating" },
      { key: "energy", label: "Energy", type: "rating" }
    ]
  },
  {
    id: "corbin",
    sheetName: "Corbin",
    displayName: "Corbin",
    accent: "#0c7b93",
    metrics: [
      { key: "offersMade", label: "Offers Made", type: "count", isTask: true },
      { key: "verbalsAccepted", label: "Verbals Accepted", type: "count", isTask: true },
      { key: "contractsSigned", label: "Contracts Signed", type: "count", isTask: true },
      { key: "dials", label: "Dials", type: "count", isTask: true },
      { key: "talkTime", label: "Talk Time", type: "duration", isTask: true },
      { key: "mood", label: "Mood", type: "rating" },
      { key: "energy", label: "Energy", type: "rating" }
    ]
  },
  {
    id: "marie",
    sheetName: "Marie",
    displayName: "Marie",
    accent: "#f4a261",
    metrics: [
      { key: "dialsMade", label: "Dials Made", type: "count", isTask: true },
      { key: "connectedCalls", label: "Connected Calls", type: "count", isTask: true },
      { key: "appointmentsBooked", label: "Appointments Booked", type: "count", isTask: true },
      { key: "askPriceCollected", label: "Ask Price Collected", type: "count", isTask: true },
      { key: "talkTime", label: "Talk Time", type: "duration", isTask: true },
      { key: "mood", label: "Mood", type: "rating" },
      { key: "energy", label: "Energy", type: "rating" }
    ]
  },
  {
    id: "hugo",
    sheetName: "Hugo",
    displayName: "Hugo",
    accent: "#2a9d8f",
    metrics: [
      { key: "realtorsContacted", label: "Realtors Contacted", type: "count", isTask: true },
      {
        key: "titleCompaniesContacted",
        label: "Title Companies Contacted",
        type: "count",
        isTask: true
      },
      { key: "talkTime", label: "Talk Time", type: "duration", isTask: true },
      { key: "mood", label: "Mood", type: "text" },
      { key: "energy", label: "Energy", type: "rating" }
    ]
  },
  {
    id: "taa",
    sheetName: "Taa",
    displayName: "Taa",
    accent: "#7d4f9e",
    metrics: [
      { key: "textsSent", label: "Texts Sent", type: "count", isTask: true },
      { key: "responseRate", label: "Response Rate", type: "percent", isTask: true },
      { key: "leadsPushed", label: "Leads Pushed", type: "count", isTask: true },
      { key: "responseTime", label: "Response Time", type: "duration", isTask: true },
      { key: "mood", label: "Mood", type: "rating" },
      { key: "energy", label: "Energy", type: "rating" },
      { key: "messagesReceived", label: "# Messages Received", type: "count", isTask: true },
      { key: "peopleTextedBack", label: "# People Who Texted Back", type: "count", isTask: true }
    ]
  }
];

const projectRoot = process.cwd();
const workbookPath = path.join(projectRoot, "data", "Dew Claw EOD Report.xlsx");
const snapshotPath = path.join(projectRoot, "data", "eod-report.snapshot.json");

function average(values) {
  if (!values.length) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function cleanCellValue(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const text = String(value).replace(/\u00a0/g, " ").trim();
  return text || null;
}

function parseDateCell(value) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number") {
    return XLSX.SSF.format("yyyy-mm-dd", value);
  }

  const text = cleanCellValue(value);

  if (!text || text.toLowerCase() === "timestamp") {
    return null;
  }

  const numericCandidate = Number(text);

  if (!Number.isNaN(numericCandidate) && text.includes(".")) {
    return XLSX.SSF.format("yyyy-mm-dd", numericCandidate);
  }

  const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (slashMatch) {
    const [, month, day, year] = slashMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const parsedDate = new Date(text);

  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString().slice(0, 10);
  }

  return null;
}

function parseLeadingNumber(text) {
  if (!text) {
    return null;
  }

  const match = text.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function parsePercent(text) {
  const numeric = parseLeadingNumber(text);

  if (numeric === null) {
    return null;
  }

  if (text.includes("%")) {
    return numeric;
  }

  return numeric <= 1 ? numeric * 100 : numeric;
}

function parseCompactDuration(text) {
  const compact = text.match(/^(\d+)\.(\d{1,2})$/);

  if (!compact) {
    return null;
  }

  const whole = Number(compact[1]);
  const fraction = Number(compact[2].padEnd(2, "0").slice(0, 2));

  if (whole >= 10) {
    return whole + fraction / 60;
  }

  return whole * 60 + fraction;
}

function parseDuration(text) {
  if (!text) {
    return null;
  }

  const normalized = text.toLowerCase().replace(/,/g, " ").replace(/\s+/g, " ").trim();
  const embeddedMinuteSecond = normalized.match(/^\d+(?:\.\d+)?%?(\d)m[.\s]*(\d{1,2})s?$/);

  if (embeddedMinuteSecond) {
    return Number(embeddedMinuteSecond[1]) + Number(embeddedMinuteSecond[2]) / 60;
  }

  const hourMatches = Array.from(normalized.matchAll(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|hr)\b/g));
  const minuteMatches = Array.from(normalized.matchAll(/(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|min)\b/g));
  const secondMatches = Array.from(normalized.matchAll(/(\d+(?:\.\d+)?)\s*(?:seconds?|secs?|sec)\b/g));
  const compactMinuteSecondMatches = Array.from(normalized.matchAll(/(\d+)\s*m[.\s]*(\d{1,2})s?/g));

  if (
    hourMatches.length ||
    minuteMatches.length ||
    secondMatches.length ||
    compactMinuteSecondMatches.length
  ) {
    const hours = hourMatches.length ? Number(hourMatches.at(-1)[1]) : 0;
    const minutes =
      compactMinuteSecondMatches.length > 0
        ? Number(compactMinuteSecondMatches.at(-1)[1])
        : minuteMatches.length > 0
          ? Number(minuteMatches.at(-1)[1])
          : 0;
    const seconds =
      compactMinuteSecondMatches.length > 0
        ? Number(compactMinuteSecondMatches.at(-1)[2])
        : secondMatches.length > 0
          ? Number(secondMatches.at(-1)[1])
          : 0;

    return hours * 60 + minutes + seconds / 60;
  }

  return parseCompactDuration(normalized) ?? parseLeadingNumber(normalized);
}

function formatNumber(value) {
  const formatter = Number.isInteger(value)
    ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 })
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

  return formatter.format(value);
}

function formatPercent(value) {
  const rounded = value >= 10 ? value.toFixed(1) : value.toFixed(2);
  return `${Number(rounded)}%`;
}

function formatDuration(value) {
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

function formatMetricValue(type, value, fallback) {
  if (value === null) {
    return fallback;
  }

  if (type === "percent") {
    return formatPercent(value);
  }

  if (type === "duration") {
    return formatDuration(value);
  }

  return formatNumber(value);
}

function parseMetric(metric, rawCellValue) {
  const raw = cleanCellValue(rawCellValue);

  if (!raw) {
    return {
      raw: null,
      numericValue: null,
      textValue: null,
      displayValue: null
    };
  }

  if (metric.type === "text") {
    return {
      raw,
      numericValue: null,
      textValue: raw,
      displayValue: raw
    };
  }

  const numericValue =
    metric.type === "duration"
      ? parseDuration(raw)
      : metric.type === "percent"
        ? parsePercent(raw)
        : parseLeadingNumber(raw);

  return {
    raw,
    numericValue,
    textValue: raw,
    displayValue: formatMetricValue(metric.type, numericValue, raw)
  };
}

function aggregateMetric(metric, values) {
  const nonEmptyValues = values.filter((value) => value.raw !== null);

  if (!nonEmptyValues.length) {
    return {
      ...metric,
      raw: null,
      numericValue: null,
      displayValue: null
    };
  }

  if (metric.type === "text") {
    const latestText = nonEmptyValues.map((value) => value.textValue).filter(Boolean).at(-1) ?? null;

    return {
      ...metric,
      raw: latestText,
      numericValue: null,
      displayValue: latestText
    };
  }

  const numericValues = nonEmptyValues
    .map((value) => value.numericValue)
    .filter((value) => value !== null && Number.isFinite(value));

  if (!numericValues.length) {
    const fallback = nonEmptyValues.at(-1)?.displayValue ?? null;

    return {
      ...metric,
      raw: fallback,
      numericValue: null,
      displayValue: fallback
    };
  }

  const averagedValue = average(numericValues);

  return {
    ...metric,
    raw: nonEmptyValues.map((value) => value.raw).filter(Boolean).join(" | "),
    numericValue: averagedValue,
    displayValue: formatMetricValue(metric.type, averagedValue, null)
  };
}

function buildTaskBaselines(records, member) {
  return Object.fromEntries(
    member.metrics
      .filter((metric) => metric.isTask && metric.type !== "text")
      .map((metric) => {
        const values = records
          .map((record) => record.metrics[metric.key]?.numericValue ?? null)
          .filter((value) => value !== null && Number.isFinite(value));

        return [metric.key, average(values)];
      })
  );
}

function computeTaskScore(record, member, baselineByMetric) {
  const comparisons = member.metrics
    .filter((metric) => metric.isTask && metric.type !== "text")
    .map((metric) => {
      const baseline = baselineByMetric[metric.key];
      const currentValue = record.metrics[metric.key]?.numericValue ?? null;

      if (baseline === null || baseline <= 0 || currentValue === null) {
        return null;
      }

      return Math.min((currentValue / baseline) * 100, 200);
    })
    .filter((value) => value !== null);

  return average(comparisons);
}

function buildMemberDataset(workbook, member) {
  const worksheet = workbook.Sheets[member.sheetName];
  const rows = worksheet
    ? XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        raw: false,
        defval: null
      })
    : [];

  const groupedByDate = new Map();

  for (const row of rows.slice(1)) {
    const date = parseDateCell(row[1]);

    if (!date) {
      continue;
    }

    const parsedMetrics = Object.fromEntries(
      member.metrics.map((metric, index) => [metric.key, parseMetric(metric, row[index + 2])])
    );
    const hasSubmission = Object.values(parsedMetrics).some((value) => value.raw !== null);
    const existingEntries = groupedByDate.get(date) ?? [];

    existingEntries.push({ hasSubmission, parsedMetrics });
    groupedByDate.set(date, existingEntries);
  }

  const records = Array.from(groupedByDate.entries())
    .map(([date, groupedRows]) => {
      const metrics = Object.fromEntries(
        member.metrics.map((metric) => [
          metric.key,
          aggregateMetric(
            metric,
            groupedRows.map((groupedRow) => groupedRow.parsedMetrics[metric.key])
          )
        ])
      );

      return {
        date,
        hasSubmission: groupedRows.some((groupedRow) => groupedRow.hasSubmission),
        duplicateCount: groupedRows.length,
        taskScore: null,
        metrics
      };
    })
    .sort((left, right) => right.date.localeCompare(left.date));

  const baselineByMetric = buildTaskBaselines(records, member);
  const scoredRecords = records.map((record) => ({
    ...record,
    taskScore: computeTaskScore(record, member, baselineByMetric)
  }));

  return {
    ...member,
    records: scoredRecords,
    recordsByDate: Object.fromEntries(scoredRecords.map((record) => [record.date, record])),
    baselineByMetric
  };
}

function buildSnapshot() {
  if (!fs.existsSync(workbookPath)) {
    throw new Error(`Workbook not found at ${workbookPath}`);
  }

  const workbook = XLSX.readFile(workbookPath, {
    raw: false,
    cellText: false,
    cellDates: true
  });
  const members = TEAM_MEMBERS.map((member) => buildMemberDataset(workbook, member));
  const availableDates = Array.from(
    new Set(members.flatMap((member) => member.records.map((record) => record.date)))
  ).sort((left, right) => right.localeCompare(left));

  return {
    sourcePath: "data/eod-report.snapshot.json",
    latestDate: availableDates[0] ?? "",
    availableDates,
    members
  };
}

const snapshot = buildSnapshot();
fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
console.log(`Wrote ${snapshotPath}`);
