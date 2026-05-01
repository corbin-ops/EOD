import "server-only";

import snapshot from "../../data/eod-report.snapshot.json";

import { getGoogleSheetsDashboardData } from "@/lib/google-sheets";
import { getPublishedGoogleSheetsDashboardData } from "@/lib/google-sheets-public";
import {
  buildEmptyRecord,
  type DashboardData,
  type DailyRecord,
  type MemberDataset,
  type MetricSnapshot,
} from "@/lib/eod-types";
export type {
  DashboardData,
  DailyRecord,
  MemberDataset,
  MetricSnapshot,
} from "@/lib/eod-types";

export type DataSource = "excel" | "google-sheets" | "google-sheets-public";

function normalizeDataSource(value: string | undefined): DataSource {
  const normalized = value?.trim().toLowerCase();

  if (
    normalized === "google-sheets-public" ||
    normalized === "google_sheets_public" ||
    normalized === "google-public" ||
    normalized === "published-csv" ||
    normalized === "public-csv"
  ) {
    return "google-sheets-public";
  }

  if (
    normalized === "google-sheets" ||
    normalized === "google_sheets" ||
    normalized === "google" ||
    normalized === "gsheet"
  ) {
    return "google-sheets";
  }

  return "excel";
}

export function getConfiguredDataSource(): DataSource {
  return normalizeDataSource(process.env.DATA_SOURCE);
}

export async function getDashboardData(): Promise<DashboardData> {
  const dataSource = getConfiguredDataSource();

  if (dataSource === "google-sheets-public") {
    return getPublishedGoogleSheetsDashboardData();
  }

  if (dataSource === "google-sheets") {
    return getGoogleSheetsDashboardData();
  }

  return snapshot as unknown as DashboardData;
}

export { buildEmptyRecord };
