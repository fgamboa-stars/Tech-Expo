/**
 * ============================================================================
 * File:        src/components/charts/Charts.tsx
 * Purpose:     Lightweight, dependency-free chart components: a chart frame
 *              with a table view, a horizontal bar chart, a segmented
 *              (100%) bar, and stat tiles.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial components (Heritage at Risk v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 *
 * LEARNING NOTE — why no chart library?
 * Our charts are simple comparisons (bars) and a part-to-whole bar. Plain
 * HTML + CSS draws them crisply, responds to dark mode via CSS variables,
 * and stays accessible: every chart can flip to a real <table>, values are
 * printed as text, and color is never the only cue. Fewer dependencies also
 * means a faster load at the expo.
 */
import { useId, useState, type ReactNode } from "react";

/* ------------------------------------------------------------------------ */
/* ChartFrame                                                                 */
/* ------------------------------------------------------------------------ */

export interface ChartFrameProps {
  title: string;
  subtitle?: string;
  /** Rows for the accessible table view: [label, value]. */
  table: { columns: [string, string]; rows: [string, string | number][] };
  children: ReactNode;
  className?: string;
}

/**
 * Wraps a chart with a heading and a "Table" toggle.
 * @param props See ChartFrameProps.
 */
export function ChartFrame({ title, subtitle, table, children, className }: ChartFrameProps) {
  const [asTable, setAsTable] = useState(false);
  const id = useId();
  return (
    <figure className={`chart ${className ?? ""}`} aria-labelledby={`${id}-t`}>
      <div className="chart__head">
        <div>
          <h3 id={`${id}-t`} className="chart__title">
            {title}
          </h3>
          {subtitle && <p className="chart__subtitle">{subtitle}</p>}
        </div>
        <button type="button" className="btn btn--quiet btn--small" aria-pressed={asTable} onClick={() => setAsTable((v) => !v)}>
          {asTable ? "Chart" : "Table"}
        </button>
      </div>
      {asTable ? (
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">{table.columns[0]}</th>
              <th scope="col" className="num">
                {table.columns[1]}
              </th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map(([label, value]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td className="num">{typeof value === "number" ? value.toLocaleString("en-US") : value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        children
      )}
    </figure>
  );
}

/* ------------------------------------------------------------------------ */
/* BarChart (horizontal)                                                      */
/* ------------------------------------------------------------------------ */

export interface BarDatum {
  key: string;
  label: string;
  value: number;
  /** CSS color or variable for this bar; defaults to the sequential accent. */
  color?: string;
  /** Extra text for the tooltip, e.g. "of 42 analyzed". */
  note?: string;
  /** Optional link target when the bar is activated. */
  href?: string;
}

/**
 * Horizontal bar chart with direct value labels and hover/focus tooltips.
 *
 * @param props.data Bars, in display order.
 * @param props.unit Unit word for tooltips, e.g. "landmarks".
 * @param props.ariaLabel Summary for screen readers.
 */
export function BarChart({ data, unit, ariaLabel }: { data: BarDatum[]; unit: string; ariaLabel: string }) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((s, d) => s + d.value, 0);
  if (data.length === 0) return <p className="empty">No data yet.</p>;
  return (
    <ul className="bars" aria-label={ariaLabel}>
      {data.map((d) => {
        const pct = total ? Math.round((100 * d.value) / total) : 0;
        const tip = `${d.label}: ${d.value.toLocaleString("en-US")} ${unit}${d.note ? ` ${d.note}` : ""} (${pct}% of total)`;
        const inner = (
          <>
            <span className="bars__label">{d.label}</span>
            <span className="bars__track">
              <span
                className="bars__fill"
                style={{ width: `${(100 * d.value) / max}%`, background: d.color ?? "var(--seq-500)" }}
              />
            </span>
            <span className="bars__value">{d.value.toLocaleString("en-US")}</span>
            {hover === d.key && (
              <span className="tooltip" role="tooltip">
                {tip}
              </span>
            )}
          </>
        );
        return (
          <li
            key={d.key}
            className="bars__row"
            onMouseEnter={() => setHover(d.key)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(d.key)}
            onBlur={() => setHover(null)}
          >
            {d.href ? (
              <a className="bars__hit" href={d.href} aria-label={tip}>
                {inner}
              </a>
            ) : (
              <span className="bars__hit" tabIndex={0} aria-label={tip}>
                {inner}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------------ */
/* SegmentedBar (part-to-whole)                                               */
/* ------------------------------------------------------------------------ */

export interface Segment {
  key: string;
  label: string;
  value: number;
  color: string;
}

/**
 * A single 100% bar split into ordered segments, with a legend.
 * @param props.segments Segments in order (e.g. Low → Critical).
 * @param props.ariaLabel Summary for screen readers.
 */
export function SegmentedBar({ segments, ariaLabel }: { segments: Segment[]; ariaLabel: string }) {
  const [hover, setHover] = useState<string | null>(null);
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div className="segbar">
      <div className="segbar__track" role="img" aria-label={ariaLabel}>
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <span
              key={s.key}
              className="segbar__seg"
              style={{ flexGrow: s.value, background: s.color }}
              onMouseEnter={() => setHover(s.key)}
              onMouseLeave={() => setHover(null)}
            >
              {hover === s.key && (
                <span className="tooltip" role="tooltip">
                  {s.label}: {s.value} ({Math.round((100 * s.value) / total)}%)
                </span>
              )}
            </span>
          ))}
      </div>
      <ul className="legend">
        {segments.map((s) => (
          <li key={s.key}>
            <span className="legend__swatch" style={{ background: s.color }} aria-hidden="true" />
            <span className="legend__label">{s.label}</span>
            <span className="legend__value">{s.value.toLocaleString("en-US")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* StatTile                                                                   */
/* ------------------------------------------------------------------------ */

/**
 * A headline number with a label (no chart needed for a single value).
 * @param props.value The number.
 * @param props.label What it counts.
 * @param props.note Optional context line.
 * @param props.tone Optional accent: "water" | "fire" | "critical".
 */
export function StatTile({ value, label, note, tone }: { value: number | string; label: string; note?: string; tone?: "water" | "fire" | "critical" | "accent" }) {
  return (
    <div className={`stat ${tone ? `stat--${tone}` : ""}`}>
      <span className="stat__value">{typeof value === "number" ? value.toLocaleString("en-US") : value}</span>
      <span className="stat__label">{label}</span>
      {note && <span className="stat__note">{note}</span>}
    </div>
  );
}
