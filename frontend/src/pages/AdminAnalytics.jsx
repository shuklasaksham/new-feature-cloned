import React, { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCcw } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import { api, formatApiError } from "../lib/api";

// ---- palette (dark aesthetic, matches reference image) --------------------
const COLORS = {
  accent: "#2E5BFF",       // primary blue
  accent2: "#7C5CFF",      // violet (scatter cluster 2)
  accent3: "#F97316",      // orange (scatter cluster 3)
  positive: "#22C55E",
  danger: "#EF4444",
  grid: "#1E2230",
  axis: "#4B5563",
  axisLabel: "#9CA3AF",
  cardBg: "#0F1014",
  cardBorder: "#1F232E",
};
const PIE_COLORS = ["#2E5BFF", "#7C5CFF", "#22C55E", "#F97316", "#EF4444", "#06B6D4"];

// ---- helpers --------------------------------------------------------------
const shortDate = (iso) => {
  if (!iso) return "";
  const [, m, d] = iso.split("-");
  return `${m}/${d}`;
};

const CustomTooltip = ({ active, payload, label, unit = "" }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      className="rounded-md border px-3 py-2 shadow-lg"
      style={{
        background: "#0A0B0F",
        borderColor: COLORS.cardBorder,
        color: "#E5E7EB",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
      }}
    >
      {label && <div style={{ opacity: 0.6, marginBottom: 4 }}>{label}</div>}
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.name || p.dataKey}: {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
          {unit}
        </div>
      ))}
    </div>
  );
};

// ---- KPI card -------------------------------------------------------------
function Kpi({ label, value, unit = "", accent = false, testid }) {
  return (
    <div
      className="rounded-lg border px-4 py-4"
      style={{ background: COLORS.cardBg, borderColor: COLORS.cardBorder }}
      data-testid={testid}
    >
      <div className="mono-tag" style={{ color: COLORS.axisLabel }}>{label}</div>
      <div
        className="mt-2 font-display"
        style={{
          fontSize: 30,
          lineHeight: 1,
          color: accent ? COLORS.accent : "#F3F4F6",
          letterSpacing: "-0.02em",
        }}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
        {unit && (
          <span style={{ fontSize: 14, color: COLORS.axisLabel, marginLeft: 6 }}>{unit}</span>
        )}
      </div>
    </div>
  );
}

// ---- Card wrapper ---------------------------------------------------------
function Card({ title, subtitle, children, height = 260, className = "", testid }) {
  return (
    <div
      className={`rounded-lg border p-4 sm:p-5 ${className}`}
      style={{ background: COLORS.cardBg, borderColor: COLORS.cardBorder }}
      data-testid={testid}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-[13px] font-medium" style={{ color: "#E5E7EB" }}>{title}</h3>
          {subtitle && (
            <p className="mono-tag mt-0.5" style={{ color: COLORS.axisLabel }}>{subtitle}</p>
          )}
        </div>
      </div>
      <div className="mt-3" style={{ height }}>
        {children}
      </div>
    </div>
  );
}

// ---- Activity heatmap (custom SVG grid) -----------------------------------
function Heatmap({ data }) {
  const maxVal = useMemo(() => {
    let m = 1;
    for (const row of data) for (const h of row.hours) if (h.value > m) m = h.value;
    return m;
  }, [data]);
  const cell = 16;
  const gap = 2;
  const labelCol = 40;
  const width = labelCol + (cell + gap) * 24;
  const height = (cell + gap) * data.length + 24;

  const color = (v) => {
    if (!v) return "#141724";
    const t = Math.min(1, v / maxVal);
    // signal blue with alpha ramp
    const alpha = 0.18 + t * 0.82;
    return `rgba(46, 91, 255, ${alpha.toFixed(3)})`;
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={width} height={height} role="img" aria-label="Activity heatmap">
        {/* hour headers */}
        {Array.from({ length: 24 }, (_, h) => (
          <text
            key={`h-${h}`}
            x={labelCol + h * (cell + gap) + cell / 2}
            y={12}
            fill={COLORS.axisLabel}
            fontSize={9}
            fontFamily="'JetBrains Mono', monospace"
            textAnchor="middle"
            opacity={h % 3 === 0 ? 1 : 0}
          >
            {h.toString().padStart(2, "0")}
          </text>
        ))}
        {/* rows */}
        {data.map((row, ri) => (
          <g key={row.day} transform={`translate(0, ${20 + ri * (cell + gap)})`}>
            <text
              x={0}
              y={cell - 3}
              fill={COLORS.axisLabel}
              fontSize={10}
              fontFamily="'JetBrains Mono', monospace"
            >
              {row.day}
            </text>
            {row.hours.map((h) => (
              <rect
                key={h.hour}
                x={labelCol + h.hour * (cell + gap)}
                y={0}
                width={cell}
                height={cell}
                rx={2}
                fill={color(h.value)}
              >
                <title>{`${row.day} ${h.hour.toString().padStart(2, "0")}:00 — ${h.value} project${h.value === 1 ? "" : "s"}`}</title>
              </rect>
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
}

// ---- Scatter data prep: jitter x per user bucket -------------------------
function bucketAndJitter(points, maxBuckets = 6) {
  if (!points || points.length === 0) return { series: [], xTicks: [] };
  // Group by user, take top N users by point count, cluster the rest into "Others"
  const byUser = new Map();
  for (const p of points) {
    const k = p.user || "unknown";
    if (!byUser.has(k)) byUser.set(k, []);
    byUser.get(k).push(p);
  }
  const sorted = Array.from(byUser.entries()).sort((a, b) => b[1].length - a[1].length);
  const top = sorted.slice(0, maxBuckets - 1);
  const rest = sorted.slice(maxBuckets - 1);
  const buckets = top.map(([user, pts]) => ({ user, pts }));
  if (rest.length) {
    buckets.push({
      user: "Others",
      pts: rest.flatMap(([, pts]) => pts),
    });
  }
  const series = buckets.map((b, i) => {
    const xCenter = i + 0.5;
    const data = b.pts.map((p) => ({
      x: xCenter + (Math.random() - 0.5) * 0.5,
      y: p.days,
      name: p.name,
      user: b.user,
    }));
    return { user: b.user, data, color: PIE_COLORS[i % PIE_COLORS.length] };
  });
  const xTicks = buckets.map((_, i) => i + 0.5);
  const xLabels = buckets.map((b) => b.user);
  return { series, xTicks, xLabels };
}

// Scatter tooltip lifted out to avoid unstable-nested-components warning.
function ScatterTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div
      className="rounded-md border px-3 py-2"
      style={{
        background: "#0A0B0F",
        borderColor: COLORS.cardBorder,
        color: "#E5E7EB",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
      }}
    >
      <div style={{ opacity: 0.7 }}>{p.user}</div>
      {p.name && <div>{p.name}</div>}
      <div style={{ color: COLORS.accent }}>{p.y.toFixed(2)} days</div>
    </div>
  );
}

// ---- Main page ------------------------------------------------------------
export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data: d } = await api.get("/admin/analytics");
      setData(d);
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const scatterPrepped = useMemo(
    () => bucketAndJitter(data?.cycle_time_points || []),
    [data],
  );

  if (loading) {
    return (
      <div
        className="flex items-center gap-2 mt-8"
        style={{ color: COLORS.axisLabel, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}
        data-testid="analytics-loading"
      >
        <Loader2 size={14} className="animate-spin" /> Loading analytics…
      </div>
    );
  }
  if (error) {
    return (
      <p className="mono-tag mt-8" style={{ color: COLORS.danger }} data-testid="analytics-error">
        {error}
      </p>
    );
  }
  if (!data) return null;

  const { kpis, new_users_daily, projects_daily, status_distribution, step_funnel, top_users, share_funnel, activity_heatmap } = data;

  const gridProps = { strokeDasharray: "3 3", stroke: COLORS.grid, vertical: false };
  const axisProps = {
    stroke: COLORS.axis,
    tick: { fill: COLORS.axisLabel, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" },
    tickLine: false,
    axisLine: false,
  };

  return (
    <div className="space-y-5" data-testid="admin-analytics">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl leading-none" style={{ color: "#F3F4F6" }}>
            Analytics
          </h2>
          <p className="mono-tag mt-1" style={{ color: COLORS.axisLabel }}>
            Live snapshot · updated {new Date(data.generated_at).toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider"
          style={{ borderColor: COLORS.cardBorder, color: "#E5E7EB", background: COLORS.cardBg }}
          data-testid="analytics-refresh"
        >
          <RefreshCcw size={12} /> Refresh
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="analytics-kpis">
        <Kpi label="TOTAL USERS" value={kpis.total_users} testid="kpi-total-users" />
        <Kpi label="NEW · 7D" value={kpis.new_users_7d} accent testid="kpi-new-users" />
        <Kpi label="TOTAL PROJECTS" value={kpis.total_projects} testid="kpi-total-projects" />
        <Kpi label="LOCKED" value={kpis.locked_projects} testid="kpi-locked" />
        <Kpi label="ACCEPT RATE" value={kpis.share_accept_rate} unit="%" testid="kpi-accept-rate" />
        <Kpi label="AVG STEPS" value={kpis.avg_steps} unit="/5" testid="kpi-avg-steps" />
      </div>

      {/* Row 1: two line/area charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card
          title="New users"
          subtitle="Signups per day · last 30 days"
          testid="chart-new-users"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={new_users_daily.map((d) => ({ ...d, label: shortDate(d.date) }))} margin={{ top: 6, right: 8, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.accent} stopOpacity={0.55} />
                  <stop offset="100%" stopColor={COLORS.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...axisProps} interval={4} />
              <YAxis {...axisProps} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: COLORS.accent, strokeOpacity: 0.35 }} />
              <Area
                type="monotone"
                dataKey="count"
                stroke={COLORS.accent}
                strokeWidth={2}
                fill="url(#gradUsers)"
                dot={false}
                name="Users"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card
          title="Projects created"
          subtitle="New projects per day · last 30 days"
          testid="chart-projects-created"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={projects_daily.map((d) => ({ ...d, label: shortDate(d.date) }))} margin={{ top: 6, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...axisProps} interval={4} />
              <YAxis {...axisProps} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: COLORS.accent2, strokeOpacity: 0.35 }} />
              <Line
                type="monotone"
                dataKey="count"
                stroke={COLORS.accent2}
                strokeWidth={2}
                dot={{ r: 2.5, stroke: COLORS.accent2, strokeWidth: 1, fill: COLORS.cardBg }}
                name="Projects"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Row 2: status donut + step funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card title="Projects by status" subtitle="Distribution" testid="chart-status">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={status_distribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
                stroke={COLORS.cardBg}
                strokeWidth={2}
              >
                {status_distribution.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap gap-3">
            {status_distribution.map((s, i) => (
              <div key={s.name} className="flex items-center gap-1.5 mono-tag" style={{ color: "#E5E7EB" }}>
                <span
                  className="inline-block rounded-full"
                  style={{ width: 8, height: 8, background: PIE_COLORS[i % PIE_COLORS.length] }}
                />
                {s.name.toUpperCase()} · {s.value}
              </div>
            ))}
          </div>
        </Card>

        <Card title="Step drop-off" subtitle="Projects that reached each step" testid="chart-step-funnel" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={step_funnel} margin={{ top: 6, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="step" {...axisProps} />
              <YAxis {...axisProps} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: COLORS.grid, fillOpacity: 0.4 }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} fill={COLORS.accent} name="Projects" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Row 3: cycle time scatter (full width) */}
      <Card title="Cycle time by user" subtitle="Days from project creation → locked (for locked projects only)" height={340} testid="chart-cycle-time">
        {scatterPrepped.series.length === 0 ? (
          <div className="flex items-center justify-center h-full mono-tag" style={{ color: COLORS.axisLabel }}>
            No locked projects yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 12, right: 12, bottom: 24, left: 0 }}>
              <CartesianGrid {...gridProps} vertical />
              <XAxis
                type="number"
                dataKey="x"
                domain={[0, scatterPrepped.xTicks.length]}
                ticks={scatterPrepped.xTicks}
                tickFormatter={(v) => {
                  const idx = Math.floor(v);
                  const label = scatterPrepped.xLabels?.[idx] || "";
                  // truncate long emails
                  return label.length > 14 ? label.slice(0, 12) + "…" : label;
                }}
                stroke={COLORS.axis}
                tick={{ fill: COLORS.axisLabel, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="number"
                dataKey="y"
                {...axisProps}
                name="days"
                unit="d"
              />
              <ZAxis type="number" range={[40, 40]} />
              <Tooltip content={<ScatterTooltip />} />
              {scatterPrepped.series.map((s) => (
                <Scatter key={s.user} data={s.data} fill={s.color} fillOpacity={0.85} />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Row 4: top users + share funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Top users" subtitle="By project count" height={300} testid="chart-top-users">
          {top_users.length === 0 ? (
            <div className="flex items-center justify-center h-full mono-tag" style={{ color: COLORS.axisLabel }}>
              No users yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={top_users.map((u) => ({ ...u, label: (u.email || u.name || "").length > 24 ? (u.email || u.name).slice(0, 22) + "…" : (u.email || u.name) }))} margin={{ top: 6, right: 12, bottom: 0, left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} horizontal={false} />
                <XAxis type="number" {...axisProps} allowDecimals={false} />
                <YAxis type="category" dataKey="label" {...axisProps} width={140} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: COLORS.grid, fillOpacity: 0.4 }} />
                <Bar dataKey="projects" radius={[0, 4, 4, 0]} fill={COLORS.accent} name="Projects" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Share review funnel" subtitle="Client review outcomes" height={300} testid="chart-share-funnel">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={share_funnel} margin={{ top: 6, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="stage" {...axisProps} />
              <YAxis {...axisProps} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: COLORS.grid, fillOpacity: 0.4 }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Count">
                {share_funnel.map((entry, i) => {
                  const map = { Shared: COLORS.accent, Reviewed: COLORS.accent2, Accepted: COLORS.positive, Rejected: COLORS.danger };
                  return <Cell key={i} fill={map[entry.stage] || COLORS.accent} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Row 5: heatmap full width */}
      <Card title="Activity heatmap" subtitle="Projects created by hour × weekday · last 90 days" height={200} testid="chart-heatmap">
        <Heatmap data={activity_heatmap} />
      </Card>
    </div>
  );
}
