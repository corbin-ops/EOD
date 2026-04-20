"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface DashboardFiltersProps {
  dates: string[];
  members: Array<{
    id: string;
    displayName: string;
  }>;
  selectedDate: string;
  selectedMemberId: string;
}

export function DashboardFilters({
  dates,
  members,
  selectedDate,
  selectedMemberId,
}: DashboardFiltersProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [localDate, setLocalDate] = useState(selectedDate);
  const [localMemberId, setLocalMemberId] = useState(selectedMemberId);

  useEffect(() => {
    setLocalDate(selectedDate);
    setLocalMemberId(selectedMemberId);
  }, [selectedDate, selectedMemberId]);

  function pushFilters(nextMemberId: string, nextDate: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (nextMemberId === "all") {
      params.delete("member");
    } else {
      params.set("member", nextMemberId);
    }

    params.set("date", nextDate);

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
          <p className="eyebrow">Daily Filters</p>
          <h2>Jump between overall and member views</h2>
        </div>
        <div className={`filters-status${isPending ? " is-pending" : ""}`}>
          {isPending ? "Refreshing dashboard..." : "Filters ready"}
        </div>
      </div>

      <div className="member-switcher" role="tablist" aria-label="Dashboard view selector">
        <button
          type="button"
          className={`member-pill${localMemberId === "all" ? " is-active" : ""}`}
          onClick={() => {
            setLocalMemberId("all");
            pushFilters("all", localDate);
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
              pushFilters(member.id, localDate);
            }}
          >
            {member.displayName}
          </button>
        ))}
      </div>

      <label className="date-filter">
        <span>Date</span>
        <select
          value={localDate}
          onChange={(event) => {
            const nextDate = event.target.value;
            setLocalDate(nextDate);
            pushFilters(localMemberId, nextDate);
          }}
        >
          {dates.map((date) => (
            <option key={date} value={date}>
              {date}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
