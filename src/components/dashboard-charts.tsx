"use client";

import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ChartRow = Record<string, number | string | null>;

type SeriesConfig = {
  key: string;
  label: string;
  color: string;
  type: "bar" | "line";
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    color?: string;
    dataKey?: string;
    name?: string;
    value?: number | string;
  }>;
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>
      {payload
        .filter((entry) => entry.value !== null && entry.value !== undefined && entry.value !== "")
        .map((entry) => (
          <div key={`${entry.dataKey}-${entry.name}`} className="chart-tooltip-row">
            <span className="chart-tooltip-dot" style={{ backgroundColor: entry.color ?? "#ffffff" }} />
            <span>{entry.name}</span>
            <strong>{entry.value}</strong>
          </div>
        ))}
    </div>
  );
}

export function SparklineChart({
  data,
  color,
}: {
  data: Array<{ label: string; value: number }>;
  color: string;
}) {
  return (
    <div className="sparkline-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#spark-${color.replace("#", "")})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MoodEnergyChart({
  data,
}: {
  data: Array<{ label: string; mood: number | null; energy: number | null }>;
}) {
  return (
    <div className="chart-wrap tall">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="mood-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="energy-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#facc15" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#facc15" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#7a8096" }} tickLine={false} axisLine={false} />
          <YAxis
            domain={[0, 10]}
            tick={{ fontSize: 10, fill: "#7a8096" }}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, color: "#9aa0b4" }} />
          <Area
            type="monotone"
            dataKey="mood"
            name="Mood"
            stroke="#22c55e"
            strokeWidth={2}
            fill="url(#mood-fill)"
            dot={false}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="energy"
            name="Energy"
            stroke="#facc15"
            strokeWidth={2}
            fill="url(#energy-fill)"
            dot={false}
            strokeDasharray="5 4"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TeamOutputChart({
  data,
}: {
  data: Array<{ label: string; reported: number; score: number | null }>;
}) {
  return (
    <div className="chart-wrap tall">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#7a8096" }} tickLine={false} axisLine={false} />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 10, fill: "#7a8096" }}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 10, fill: "#7a8096" }}
            tickLine={false}
            axisLine={false}
            width={34}
          />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, color: "#9aa0b4" }} />
          <Bar
            yAxisId="left"
            dataKey="reported"
            name="Reported"
            fill="#7c3aed"
            radius={[6, 6, 0, 0]}
            isAnimationActive={false}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="score"
            name="Avg Task Score"
            stroke="#fb923c"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#fb923c" }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MemberMetricsChart({
  data,
  series,
}: {
  data: ChartRow[];
  series: SeriesConfig[];
}) {
  return (
    <div className="chart-wrap tall">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#7a8096" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#7a8096" }} tickLine={false} axisLine={false} width={36} />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, color: "#9aa0b4" }} />
          {series.map((entry) =>
            entry.type === "bar" ? (
              <Bar
                key={entry.key}
                dataKey={entry.key}
                name={entry.label}
                fill={entry.color}
                radius={[6, 6, 0, 0]}
                opacity={0.7}
                isAnimationActive={false}
              />
            ) : (
              <Line
                key={entry.key}
                type="monotone"
                dataKey={entry.key}
                name={entry.label}
                stroke={entry.color}
                strokeWidth={2.5}
                dot={{ r: 3, fill: entry.color }}
                isAnimationActive={false}
              />
            ),
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
