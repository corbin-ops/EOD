import "server-only";

import * as XLSX from "xlsx";

import { buildDashboardDataFromSheetRows, type SheetRowsByName } from "@/lib/eod-normalize";
import { TEAM_MEMBERS } from "@/lib/eod-schema";
import { type DashboardData } from "@/lib/eod-types";

type CsvRow = Array<string | number | null>;

function getPublicCsvUrlEnvName(memberId: string) {
  return `GOOGLE_SHEETS_PUBLIC_CSV_URL_${memberId.toUpperCase()}`;
}

function getPublicCsvUrl(memberId: string) {
  const envName = getPublicCsvUrlEnvName(memberId);
  const url = process.env[envName]?.trim();

  if (!url) {
    throw new Error(
      `Published Google Sheets source is enabled, but ${envName} is missing.`,
    );
  }

  return url;
}

function parseCsvRows(csvText: string): CsvRow[] {
  if (!csvText.trim()) {
    return [];
  }

  const workbook = XLSX.read(csvText, {
    type: "string",
    raw: false,
  });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = firstSheetName ? workbook.Sheets[firstSheetName] : null;

  if (!worksheet) {
    return [];
  }

  return XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: false,
    defval: null,
  }) as CsvRow[];
}

async function fetchPublishedCsvRows(memberId: string, displayName: string) {
  const csvUrl = getPublicCsvUrl(memberId);
  const response = await fetch(csvUrl, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch the published CSV for ${displayName}. The URL in ${getPublicCsvUrlEnvName(memberId)} returned ${response.status}.`,
    );
  }

  const csvText = await response.text();

  return parseCsvRows(csvText);
}

export async function getPublishedGoogleSheetsDashboardData(): Promise<DashboardData> {
  const sheetEntries = await Promise.all(
    TEAM_MEMBERS.map(async (member) => [
      member.sheetName,
      await fetchPublishedCsvRows(member.id, member.displayName),
    ] as const),
  );
  const rowsBySheet = Object.fromEntries(sheetEntries) as SheetRowsByName;

  return buildDashboardDataFromSheetRows(rowsBySheet, "Google Sheets (published CSV)");
}
