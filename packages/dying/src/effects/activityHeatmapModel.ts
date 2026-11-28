export interface ActivityHeatmapDay {
  date: string;
  count: number;
}

export interface HeatmapMonthLabel {
  month: number;
  col: number;
  label: string;
}

export interface HeatmapModel {
  startMs: number;
  lead: number;
  weeks: number;
  total: number;
  counts: number[];
  levels: number[];
  dates: string[];
  thresholds: [number, number, number];
  months: HeatmapMonthLabel[];
}

export const DAY_MS = 86_400_000;

export function toUtcMs(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`);
}

export function toIsoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function buildHeatmapModel(
  days: ActivityHeatmapDay[],
  weekStartsOn: 0 | 1,
  customThresholds: [number, number, number] | undefined,
  locale: string,
  minWeeks?: number
): HeatmapModel {
  const validDates = days.map((d) => toUtcMs(d.date)).filter(Number.isFinite);
  const rawEnd = validDates.length ? Math.max(...validDates) : toUtcMs(toIsoDate(new Date().getTime()));
  let startMs = validDates.length ? Math.min(...validDates) : rawEnd - 52 * 7 * DAY_MS;

  if (minWeeks && validDates.length) {
    const minSpanStart = rawEnd - (minWeeks * 7 - 1) * DAY_MS;
    if (minSpanStart < startMs) startMs = minSpanStart;
  }

  const length = Math.max(1, Math.round((rawEnd - startMs) / DAY_MS) + 1);
  const counts = new Array<number>(length).fill(0);
  const dates = new Array<string>(length);
  for (let i = 0; i < length; i++) {
    dates[i] = toIsoDate(startMs + i * DAY_MS);
  }

  for (const d of days) {
    const ms = toUtcMs(d.date);
    if (!Number.isFinite(ms)) continue;
    const idx = Math.round((ms - startMs) / DAY_MS);
    if (idx >= 0 && idx < length) {
      counts[idx] = Math.max(0, Math.round(d.count));
    }
  }

  const maxCount = counts.reduce((m, c) => (c > m ? c : m), 0);
  const step = Math.max(1, Math.ceil(maxCount / 4));
  const thresholds: [number, number, number] = customThresholds ?? [step, step * 2, step * 3];

  const levels = counts.map((c) => {
    if (c <= 0) return 0;
    if (c <= thresholds[0]) return 1;
    if (c <= thresholds[1]) return 2;
    if (c <= thresholds[2]) return 3;
    return 4;
  });

  const firstDayOfWeek = new Date(startMs).getUTCDay();
  const lead = (firstDayOfWeek - weekStartsOn + 7) % 7;
  const weeks = Math.ceil((lead + length) / 7);
  const total = counts.reduce((sum, c) => sum + c, 0);

  const monthFmt = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" });
  const months: HeatmapMonthLabel[] = [];
  let lastMonth = -1;
  for (let col = 0; col < weeks; col++) {
    const firstIdx = Math.max(0, col * 7 - lead);
    if (firstIdx >= length) break;
    const d = new Date(startMs + firstIdx * DAY_MS);
    const m = d.getUTCMonth();
    if (m !== lastMonth) {
      if (months.length === 0 || col - months[months.length - 1].col >= 3) {
        months.push({ month: m, col, label: monthFmt.format(d) });
      }
      lastMonth = m;
    }
  }

  return { startMs, lead, weeks, total, counts, levels, dates, thresholds, months };
}
