import "server-only";

import { JWT } from "google-auth-library";
import { google } from "googleapis";

import { buildDashboardDataFromSheetRows, type SheetRowsByName } from "@/lib/eod-normalize";
import { TEAM_MEMBERS } from "@/lib/eod-schema";
import { type DashboardData } from "@/lib/eod-types";

const GOOGLE_SHEETS_READ_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

interface GoogleServiceAccountCredentials {
  client_email: string;
  private_key: string;
}

function normalizePrivateKey(value: string) {
  return value.replace(/\\n/g, "\n").trim();
}

function getSpreadsheetId() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim();

  if (!spreadsheetId) {
    throw new Error(
      "Google Sheets source is enabled, but GOOGLE_SHEETS_SPREADSHEET_ID is missing.",
    );
  }

  return spreadsheetId;
}

function getServiceAccountCredentials(): GoogleServiceAccountCredentials {
  const jsonCredentials = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_JSON?.trim();

  if (jsonCredentials) {
    try {
      const parsed = JSON.parse(jsonCredentials) as Partial<GoogleServiceAccountCredentials>;

      if (parsed.client_email && parsed.private_key) {
        return {
          client_email: parsed.client_email.trim(),
          private_key: normalizePrivateKey(parsed.private_key),
        };
      }

      throw new Error();
    } catch {
      throw new Error(
        "GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_JSON must contain a valid service-account JSON object with client_email and private_key.",
      );
    }
  }

  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim();

  if (clientEmail && privateKey) {
    return {
      client_email: clientEmail,
      private_key: normalizePrivateKey(privateKey),
    };
  }

  throw new Error(
    "Google Sheets source is enabled, but service-account credentials are missing. Set GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_JSON or both GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.",
  );
}

function buildSheetRanges() {
  return TEAM_MEMBERS.map((member) => `${member.sheetName}!A:Z`);
}

function cleanRow(row: unknown[]) {
  return row.map((value) => {
    if (value === null || value === undefined) {
      return null;
    }

    return String(value);
  });
}

async function fetchSheetRows() {
  const spreadsheetId = getSpreadsheetId();
  const credentials = getServiceAccountCredentials();
  const auth = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [GOOGLE_SHEETS_READ_SCOPE],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: buildSheetRanges(),
    majorDimension: "ROWS",
    valueRenderOption: "FORMATTED_VALUE",
  });
  const rowsBySheet: SheetRowsByName = {};
  const valueRanges = response.data.valueRanges ?? [];

  TEAM_MEMBERS.forEach((member, index) => {
    const rows = valueRanges[index]?.values ?? [];
    rowsBySheet[member.sheetName] = rows.map((row) => cleanRow(row));
  });

  return { spreadsheetId, rowsBySheet };
}

export async function getGoogleSheetsDashboardData(): Promise<DashboardData> {
  const { spreadsheetId, rowsBySheet } = await fetchSheetRows();

  return buildDashboardDataFromSheetRows(rowsBySheet, `Google Sheets (live) - ${spreadsheetId}`);
}
