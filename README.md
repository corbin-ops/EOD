# Dew Claw EOD Dashboard

Password-protected Next.js dashboard for daily end-of-day reporting. It can read either a live Google Sheet or the existing Excel-generated snapshot.

## What the app does

- Reads the five member tabs `Chenge`, `Corbin`, `Marie`, `Hugo`, and `Taa`
- Normalizes each tab into one daily record per member
- Averages duplicate entries that share the same member and date
- Shows an overall dashboard, member switching, daily trend tables, a normalized leaderboard, and a submission grid
- Keeps blank days blank instead of carrying values forward
- Uses a shared password gate for quick internal access

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and set:

   ```bash
   DASHBOARD_PASSWORD=your-shared-password
   AUTH_SECRET=a-long-random-secret
   DATA_SOURCE=google-sheets
   GOOGLE_SHEETS_SPREADSHEET_ID=your-sheet-id
   GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_JSON={"type":"service_account",...}
   ```

   You can also use `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` instead of the full JSON env var.

3. Enable the Google Sheets API for the Google Cloud project that owns the service account, then share the spreadsheet with that service account email as a viewer or editor.

4. Start the app:

   ```bash
   npm run dev
   ```

## Render deployment

Set these environment variables in Render:

- `DASHBOARD_PASSWORD`
- `AUTH_SECRET`
- `DATA_SOURCE=google-sheets`
- `GOOGLE_SHEETS_SPREADSHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_JSON`

If you prefer split secrets, use:

- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

Use these commands:

- Build command: `npm install && npm run build`
- Start command: `npm run start`

## Excel fallback

If you want the old Excel flow for local testing or backup mode:

   ```bash
   npm run sync:data
   ```

Then set:

```bash
DATA_SOURCE=excel
```

## Data notes

- Numeric task metrics are averaged when duplicate rows exist on the same date.
- Text metrics such as Hugo's mood keep the most recent non-empty value.
- The daily leaderboard is normalized against each member's own historical task average so different roles can still be compared in one list.
- For live Google Sheets, the app reads directly from the sheet on each request.
- For the Excel fallback, run `npm run sync:data` again whenever the workbook changes.

## Source selection

- `DATA_SOURCE=google-sheets` reads directly from Google Sheets at runtime
- `DATA_SOURCE=excel` reads from `data/eod-report.snapshot.json`
