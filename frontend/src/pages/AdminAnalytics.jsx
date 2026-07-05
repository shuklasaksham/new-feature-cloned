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
// Palette aligned with site tokens (see index.css)
const COLORS = {
  accent: "#2E5BFF",       // --accent
  accent2: "#7C5CFF",      // scatter cluster 2
  accent3: "#F97316",      // scatter cluster 3
  positive: "#22C55E",
  danger: "#EF4444",
  grid: "rgba(255, 255, 255, 0.06)",   // matches --hairline
  gridStrong: "rgba(255, 255, 255, 0.10)",
  axis: "rgba(255, 255, 255, 0.20)",
  axisLabel: "#A0A0AB",   // --text-2
  cardBg: "#0E0F12",      // --surface
  cardBorder: "rgba(255, 255, 255, 0.07)", // --hairline
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
        color: "#F7F7F8",
        fontFamily: "'Poppins', sans-serif",
        fontSize: 12,
      }}
    >
      {label && <div style={{ opacity: 0.55, marginBottom: 4 }}>{label}</div>}
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.name || p.dataKey}: {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
          {unit}
        </div>
      ))}
    </div>
  );
};

// ---- KPI card — tinted background palette to match the landing page ----
const KPI_TONES = {
  lime:    { bg: "#D6FF48",  text: "#0A0A0C", subText: "#2A2A2E" },
  coral:   { bg: "#FF7A6B",  text: "#0A0A0C", subText: "#2A0F0A" },
  violet:  { bg: "#5B3EF7",  text: "#F5F5F7", subText: "rgba(245,245,247,0.68)" },
  pink:    { bg: "#FFB0D5",  text: "#0A0A0C", subText: "#2A0F1E" },
  sky:     { bg: "#4FB1FF",  text: "#04121F", subText: "#0F2740" },
  emerald: { bg: "#5BE3A2",  text: "#04140B", subText: "#0F2820" },
  lavender:{ bg: "linear-gradient(160deg, #C7CBFB 0%, #E7DFF9 55%, #F1D9EE 100%)", text: "#0A0A0C", subText: "#3B3B44" },
  peach:   { bg: "linear-gradient(160deg, #FFD5B8 0%, #FFC1B0 55%, #FFB6A8 100%)", text: "#1A0F0A", subText: "#3B2820" },
  ghost:   { bg: "var(--surface)", text: "var(--text)", subText: "var(--text-3)" }, // dashed placeholder tone
};

function Kpi({ label, value, unit = "", tone = "ghost", testid }) {
  const t = KPI_TONES[tone] || KPI_TONES.ghost;
  const isDashed = tone === "ghost";
  return (
    <div
      className="rounded-2xl px-4 py-4 sm:px-5 sm:py-5 overflow-hidden"
      style={{
        background: t.bg,
        color: t.text,
        border: isDashed ? "1px dashed var(--hairline)" : "none",
      }}
      data-testid={testid}
    >
      <div className="text-[11px] uppercase tracking-wider" style={{ color: t.subText }}>
        {label}
      </div>
      <div
        className="mt-2 font-display"
        style={{
          fontSize: 28,
          lineHeight: 1,
          color: t.text,
          letterSpacing: "-0.02em",
          fontWeight: 500,
        }}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
        {unit && (
          <span style={{ fontSize: 13, color: t.subText, marginLeft: 6 }}>{unit}</span>
        )}
      </div>
    </div>
  );
}

function SectionHead({ label, title, subtitle }) {
  return (
    <div className="pt-6">
      <span className="section-label"><span className="dot" />{label}</span>
      <h3 className="mt-3 font-display text-[22px] leading-none" style={{ letterSpacing: "-0.02em", color: "var(--text)" }}>
        {title}
      </h3>
      {subtitle && (
        <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>{subtitle}</p>
      )}
    </div>
  );
}

// ---- Card wrapper ---------------------------------------------------------
function Card({ title, subtitle, children, height = 260, className = "", testid }) {
  return (
    <div
      className={`card-brut p-4 sm:p-5 ${className}`}
      data-testid={testid}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-[13px] font-medium" style={{ color: "var(--text)" }}>{title}</h3>
          {subtitle && (
            <p className="text-[11px] uppercase tracking-wider mt-0.5" style={{ color: "var(--text-3)" }}>{subtitle}</p>
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
    if (!v) return "rgba(255,255,255,0.04)";
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
            fontFamily="'Poppins', sans-serif"
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
              fontFamily="'Poppins', sans-serif"
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
        color: "var(--text)",
        fontFamily: "'Poppins', sans-serif",
        fontSize: 12,
      }}
    >
      <div style={{ opacity: 0.6 }}>{p.user}</div>
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
        className="flex items-center gap-2 mt-8 text-[13px]"
        style={{ color: "var(--text-3)" }}
        data-testid="analytics-loading"
      >
        <Loader2 size={14} className="animate-spin" /> Loading analytics…
      </div>
    );
  }
  if (error) {
    return (
      <p className="text-[13px] mt-8" style={{ color: "var(--danger, #EF4444)" }} data-testid="analytics-error">
        {error}
      </p>
    );
  }
  if (!data) return null;

  const { kpis, new_users_daily, projects_daily, status_distribution, step_funnel, top_users, share_funnel, activity_heatmap, acquisition, activation, engagement, business } = data;

  const gridProps = { strokeDasharray: "3 3", stroke: COLORS.grid, vertical: false };
  const axisProps = {
    stroke: COLORS.axis,
    tick: { fill: COLORS.axisLabel, fontSize: 10, fontFamily: "'Poppins', sans-serif" },
    tickLine: false,
    axisLine: false,
  };

  return (
    <div className="space-y-5" data-testid="admin-analytics">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider" style={{ color: "var(--text-3)" }}>
            Live snapshot · updated {new Date(data.generated_at).toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={load}
          className="btn-ghost text-[11px] uppercase tracking-wider inline-flex items-center gap-2"
          data-testid="analytics-refresh"
        >
          <RefreshCcw size={12} /> Refresh
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="analytics-kpis">
        <Kpi label="Total users"     value={kpis.total_users}       tone="lime"    testid="kpi-total-users" />
        <Kpi label="New · 7d"        value={kpis.new_users_7d}      tone="violet"  testid="kpi-new-users" />
        <Kpi label="Total projects"  value={kpis.total_projects}    tone="coral"   testid="kpi-total-projects" />
        <Kpi label="Locked"          value={kpis.locked_projects}   tone="emerald" testid="kpi-locked" />
        <Kpi label="Accept rate"     value={kpis.share_accept_rate} unit="%" tone="sky" testid="kpi-accept-rate" />
        <Kpi label="Avg steps"       value={kpis.avg_steps}         unit="/5" tone="pink" testid="kpi-avg-steps" />
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
              <div key={s.name} className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-2)" }}>
                <span
                  className="inline-block rounded-full"
                  style={{ width: 8, height: 8, background: PIE_COLORS[i % PIE_COLORS.length] }}
                />
                {s.name} · {s.value}
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
          <div className="flex items-center justify-center h-full text-[12px]" style={{ color: "var(--text-3)" }}>
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
                tick={{ fill: COLORS.axisLabel, fontSize: 10, fontFamily: "'Poppins', sans-serif" }}
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
            <div className="flex items-center justify-center h-full text-[12px]" style={{ color: "var(--text-3)" }}>
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

      {/* ============ ACQUISITION ============ */}
      <SectionHead
        label="Acquisition"
        title="Where they came from"
        subtitle={acquisition?.total_sessions ? `${acquisition.total_sessions.toLocaleString()} sessions tracked · ${acquisition.utms_captured.toLocaleString()} with UTM params` : "UTM capture just went live — numbers below will fill in as visitors land."}
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="acquisition-kpis">
        <Kpi label="Sessions"      value={acquisition?.total_sessions ?? 0}  tone="sky"     testid="kpi-sessions" />
        <Kpi label="With UTM"      value={acquisition?.utms_captured ?? 0}   tone="lime"    testid="kpi-utms" />
        <Kpi label="Top source"    value={acquisition?.top_sources?.[0]?.source || "—"} tone="violet" testid="kpi-top-source" />
        <Kpi label="Top campaign"  value={acquisition?.top_campaigns?.[0]?.campaign || "—"} tone="coral" testid="kpi-top-campaign" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5" data-testid="acquisition-lists">
        <Card title="Traffic source" subtitle="Sessions by attributed source" height={230}>
          <ListRows rows={acquisition?.top_sources || []} labelKey="source" valueKey="count" empty="No sessions tracked yet." />
        </Card>
        <Card title="Referrers" subtitle="Where the click came from" height={230}>
          <ListRows rows={acquisition?.top_referrers || []} labelKey="referrer" valueKey="count" empty="No referrer data yet." shorten />
        </Card>
        <Card title="Campaigns" subtitle="UTM campaigns" height={230}>
          <ListRows rows={acquisition?.top_campaigns || []} labelKey="campaign" valueKey="count" empty="No UTM campaigns yet." />
        </Card>
      </div>

      {/* ============ ACTIVATION ============ */}
      <SectionHead
        label="Activation"
        title="The five events that matter"
        subtitle="Mapped to Bracket's real events, not vanity steps."
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" data-testid="activation-kpis">
        <Kpi label="Started project"    value={activation?.started ?? 0}    tone="lime"    testid="kpi-act-started" />
        <Kpi label="Added description"  value={activation?.context ?? 0}    tone="sky"     testid="kpi-act-context" />
        <Kpi label="Uploaded first screen" value={activation?.decision ?? 0} tone="violet" testid="kpi-act-decision" />
        <Kpi label="Published project"  value={activation?.published ?? 0}  tone="emerald" testid="kpi-act-published" />
        <Kpi label="Shared project"     value={activation?.shared ?? 0}     tone="pink"    testid="kpi-act-shared" />
      </div>

      {/* ============ ENGAGEMENT ============ */}
      <SectionHead
        label="Engagement"
        title="Are they coming back?"
        subtitle="Returning-user cohorts by last-seen. Session duration proxy: create → last edit."
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" data-testid="engagement-kpis">
        <Kpi label="Returning · 1d"  value={engagement?.returning_1d ?? 0}  tone="coral"   testid="kpi-ret-1d" />
        <Kpi label="Returning · 7d"  value={engagement?.returning_7d ?? 0}  tone="lavender" testid="kpi-ret-7d" />
        <Kpi label="Returning · 30d" value={engagement?.returning_30d ?? 0} tone="peach"   testid="kpi-ret-30d" />
        <Kpi label="Projects / user" value={engagement?.projects_per_user ?? 0} tone="sky" testid="kpi-projects-per-user" />
        <Kpi label="Avg edit span"   value={engagement?.avg_edit_span_days ?? 0} unit="d" tone="lime" testid="kpi-avg-edit-span" />
      </div>

      {/* ============ BUSINESS (placeholder) ============ */}
      <SectionHead
        label="Business"
        title="Coming when paid launches"
        subtitle="These tiles will fill in when downloads and purchases go live. Numbers you see today are honest proxies from the current data model."
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="business-kpis">
        <Kpi label="Total published" value={business?.total_published ?? 0} tone="emerald" testid="kpi-biz-published" />
        <Kpi label="Downloads"       value={business?.downloads ?? 0}       tone="ghost"   testid="kpi-biz-downloads" />
        <Kpi label="Purchases"       value={business?.purchases ?? 0}       tone="ghost"   testid="kpi-biz-purchases" />
        <Kpi label="Revenue"         value={business?.revenue ?? 0}         unit="₹" tone="ghost" testid="kpi-biz-revenue" />
        <Kpi label="Top categories"  value={(business?.top_categories?.length ?? 0) || "—"} tone="ghost" testid="kpi-biz-categories" />
        <Kpi label="Repeat creators" value={business?.repeat_creators ?? 0} tone="lime"    testid="kpi-biz-repeat" />
      </div>
      <Card title="Top creators" subtitle="By project count · proxy for creator leaderboard" height={220} testid="business-top-creators">
        <ListRows
          rows={(business?.top_creators || []).map((c) => ({ label: c.name && c.name !== "—" ? c.name : c.email, count: c.projects }))}
          labelKey="label"
          valueKey="count"
          empty="No creators yet."
        />
      </Card>
    </div>
  );
}

// ---- Simple two-column list helper ----------------------------------------
function ListRows({ rows, labelKey, valueKey, empty = "No data", shorten = false }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[12px]" style={{ color: "var(--text-3)" }}>
        {empty}
      </div>
    );
  }
  return (
    <ul className="space-y-1.5">
      {rows.map((r, i) => {
        const label = String(r[labelKey] ?? "");
        const value = r[valueKey];
        const shownLabel = shorten && label.length > 34 ? label.slice(0, 32) + "…" : label;
        return (
          <li key={i} className="flex items-center justify-between gap-3 py-1 border-b border-[var(--hairline)] last:border-b-0">
            <span className="text-[13px] truncate" style={{ color: "var(--text)" }}>{shownLabel}</span>
            <span className="text-[13px] font-mono" style={{ color: "var(--text-2)" }}>{typeof value === "number" ? value.toLocaleString() : value}</span>
          </li>
        );
      })}
    </ul>
  );
}
