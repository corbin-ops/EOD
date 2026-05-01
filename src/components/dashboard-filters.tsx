"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Period = "daily" | "weekly" | "monthly";

interface DashboardFiltersProps {
  dateOptions: Array<{
    value: string;
    label: string;
  }>;
  members: Array<{
    id: string;
    displayName: string;
  }>;
  selectedDate: string;
  selectedMemberId: string;
  selectedPeriod: Period;
}

const PERIOD_OPTIONS: Array<{ value: Period; label: string }> = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export function DashboardFilters({
  dateOptions,
  members,
  selectedDate,
  selectedMemberId,
  selectedPeriod,
}: DashboardFiltersProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [localDate, setLocalDate] = useState(selectedDate);
  const [localMemberId, setLocalMemberId] = useState(selectedMemberId);
  const [localPeriod, setLocalPeriod] = useState<Period>(selectedPeriod);

  useEffect(() => {
    setLocalDate(selectedDate);
    setLocalMemberId(selectedMemberId);
    setLocalPeriod(selectedPeriod);
  }, [selectedDate, selectedMemberId, selectedPeriod]);

  function pushFilters(nextMemberId: string, nextDate: string, nextPeriod: Period, resetDate = false) {
    const params = new URLSearchParams(searchParams.toString());

    if (nextMemberId === "all") {
      params.delete("member");
    } else {
      params.set("member", nextMemberId);
    }

    params.set("period", nextPeriod);

    if (resetDate) {
      params.delete("date");
    } else {
      params.set("date", nextDate);
    }

    const query = params.toString();
    const nextUrl = query ? `${pathname}?${query}` : pathname;

    startTransition(() => {
      router.replace(nextUrl);
    });
  }

  return (
    <section className="panel filters-panel">
      <div className="filters-header">
        <div>
          <p className="eyebrow">View Controls</p>
          <h2>Switch between team cadence, members, and reporting windows</h2>
        </div>
        <div className={`filters-status${isPending ? " is-pending" : ""}`}>
          {isPending ? "Refreshing dashboard..." : "Live view ready"}
        </div>
      </div>

      <div className="filters-grid">
        <label className="date-filter control-field">
          <span>Update cadence</span>
          <select
            value={localPeriod}
            onChange={(event) => {
              const nextPeriod = event.target.value as Period;
              setLocalPeriod(nextPeriod);
              pushFilters(localMemberId, localDate, nextPeriod, true);
            }}
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="date-filter control-field">
          <span>Reporting window</span>
          <select
            value={localDate}
            onChange={(event) => {
              const nextDate = event.target.value;
              setLocalDate(nextDate);
              pushFilters(localMemberId, nextDate, localPeriod);
            }}
          >
            {dateOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="member-switcher" role="tablist" aria-label="Dashboard view selector">
        <button
          type="button"
          className={`member-pill${localMemberId === "all" ? " is-active" : ""}`}
          onClick={() => {
            setLocalMemberId("all");
            pushFilters("all", localDate, localPeriod);
          }}
        >
          Overall
        </button>

        {members.map((member) => (
          <button
            key={member.id}
            type="button"
            className={`member-pill${localMemberId === member.id ? " is-active" : ""}`}
            onClick={() => {
              setLocalMemberId(member.id);
              pushFilters(member.id, localDate, localPeriod);
            }}
          >
            {member.displayName}
          </button>
        ))}
      </div>
    </section>
  );
}
