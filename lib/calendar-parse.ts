/**
 * Parse calendar tool arguments from models that emit date-only strings or ISO-ish text.
 * Date-only `YYYY-MM-DD` uses the machine local calendar day (not UTC midnight),
 * which avoids off-by-one bugs vs `new Date("YYYY-MM-DD")`.
 */
export function parseCalendarInstant(
  raw: string,
  boundary: "start" | "end",
): Date | null {
  const s = raw.trim();
  if (!s) return null;

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (dateOnly) {
    const y = Number(dateOnly[1]);
    const mo = Number(dateOnly[2]) - 1;
    const d = Number(dateOnly[3]);
    if (
      !Number.isFinite(y) ||
      !Number.isFinite(mo) ||
      !Number.isFinite(d) ||
      mo < 0 ||
      mo > 11 ||
      d < 1 ||
      d > 31
    ) {
      return null;
    }
    const dt = new Date(y, mo, d, boundary === "start" ? 0 : 23, boundary === "start" ? 0 : 59, boundary === "start" ? 0 : 59, boundary === "start" ? 0 : 999);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) {
      return null;
    }
    return dt;
  }

  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parseCalendarRangeBounds(
  startRaw: string,
  endRaw: string,
):
  | { ok: true; start: Date; end: Date }
  | { ok: false; message: string } {
  const start = parseCalendarInstant(startRaw, "start");
  const end = parseCalendarInstant(endRaw, "end");
  if (!start) {
    return {
      ok: false,
      message: `Unparseable startISO (“${startRaw.trim()}”). Prefer YYYY-MM-DD for calendar days (e.g. 2026-05-04) or a full local ISO datetime.`,
    };
  }
  if (!end) {
    return {
      ok: false,
      message: `Unparseable endISO (“${endRaw.trim()}”). Prefer YYYY-MM-DD for calendar days or a full local ISO datetime.`,
    };
  }
  return { ok: true, start, end };
}
