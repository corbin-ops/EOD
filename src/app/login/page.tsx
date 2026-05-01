import type { Metadata } from "next";
import Link from "next/link";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  invalid: "That password did not match the shared dashboard password.",
  config: "Set DASHBOARD_PASSWORD and AUTH_SECRET before using the dashboard.",
};

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export const metadata: Metadata = {
  title: "Login | Dew Claw Dashboard",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const errorKey = getSingleParam(params.error);
  const redirectTo = getSingleParam(params.redirectTo) ?? "/";
  const errorMessage = errorKey ? LOGIN_ERROR_MESSAGES[errorKey] ?? null : null;

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">Dew Claw Dashboard</p>
        <h1>Unlock the daily report</h1>
        <p className="auth-copy">
          This first version uses one shared password so the team can open the overall summary
          first, then switch into each member view.
        </p>

        <form className="auth-form" action="/api/auth/login" method="post">
          <input type="hidden" name="redirectTo" value={redirectTo} />

          <label>
            <span>Shared password</span>
            <input type="password" name="password" placeholder="Enter password" required />
          </label>

          <button type="submit">Open dashboard</button>
        </form>

        {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}

        <p className="auth-note">
          Data source: published Google Sheets CSV feeds by default, with fallback support for the
          Excel snapshot if the team needs it.
        </p>

        <Link className="auth-link" href="https://render.com/docs/deploy-nextjs">
          Render deployment guide
        </Link>
      </section>
    </main>
  );
}
