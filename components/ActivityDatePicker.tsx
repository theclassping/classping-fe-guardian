"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import {
  calendarWeeks,
  dayOfMonth,
  formatDayKey,
  formatMonth,
  formatSchoolWeek,
  isWeekend,
  monthKeyOf,
  schoolWeekOf,
  shiftMonth,
  todayKey,
  type DayKey,
} from "@/lib/activityFilter";

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

type Props = {
  mode: "day" | "week";
  value: DayKey;
  onChange: (value: DayKey) => void;
};

/**
 * A calendar popover. In week mode, clicking (or hovering) any day marks the
 * whole Monday-to-Friday block that contains it; in day mode it marks that day.
 */
export default function ActivityDatePicker({ mode, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => shiftMonth(value, 0));
  const [hovered, setHovered] = useState<DayKey | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  const today = todayKey();

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  function show() {
    setMonth(shiftMonth(value, 0));
    setHovered(null);
    setOpen((current) => !current);
  }

  function pick(day: DayKey) {
    onChange(day);
    setOpen(false);
  }

  const rangeOf = (day: DayKey) => (mode === "week" ? schoolWeekOf(day) : { start: day, end: day });
  const selected = rangeOf(value);
  const preview = hovered && hovered !== value ? rangeOf(hovered) : null;
  const inRange = (day: DayKey, range: { start: DayKey; end: DayKey }) => day >= range.start && day <= range.end;
  const label = mode === "week" ? formatSchoolWeek(value) : formatDayKey(value);

  return (
    <div className="date-picker-field" ref={root}>
      <button type="button" className="date-picker-trigger" aria-haspopup="dialog" aria-expanded={open} aria-controls={id} onClick={show}>
        <CalendarDays aria-hidden="true" />
        <span>{label}</span>
      </button>
      {open && (
        <div className="date-popover" id={id} role="dialog" aria-label={mode === "week" ? "Pilih minggu" : "Pilih tanggal"}>
          <div className="date-popover-head">
            <button type="button" aria-label="Bulan sebelumnya" onClick={() => setMonth((current) => shiftMonth(current, -1))}><ChevronLeft /></button>
            <strong aria-live="polite">{formatMonth(month)}</strong>
            <button type="button" aria-label="Bulan berikutnya" onClick={() => setMonth((current) => shiftMonth(current, 1))}><ChevronRight /></button>
          </div>
          <p className="date-popover-hint">{mode === "week" ? "Klik tanggal mana pun untuk memilih minggu Senin sampai Jumat." : "Klik tanggal untuk melihat aktivitas hari itu."}</p>
          <table className="calendar" onMouseLeave={() => setHovered(null)}>
            <thead><tr>{WEEKDAYS.map((name) => <th key={name} scope="col" abbr={name}>{name}</th>)}</tr></thead>
            <tbody>
              {calendarWeeks(month).map((week) => (
                <tr key={week[0]}>
                  {week.map((day) => {
                    const isSelected = inRange(day, selected);
                    const isPreview = Boolean(preview && inRange(day, preview));
                    const classes = [
                      monthKeyOf(day) !== monthKeyOf(month) ? "outside" : "",
                      isWeekend(day) && mode === "week" ? "weekend" : "",
                      isSelected ? "selected" : "",
                      isSelected && day === selected.start ? "range-start" : "",
                      isSelected && day === selected.end ? "range-end" : "",
                      isPreview ? "preview" : "",
                      day === today ? "today" : "",
                    ].filter(Boolean).join(" ");
                    return (
                      <td key={day} className={classes}>
                        <button
                          type="button"
                          aria-label={formatDayKey(day)}
                          aria-pressed={day === value}
                          onMouseEnter={() => setHovered(day)}
                          onFocus={() => setHovered(day)}
                          onClick={() => pick(day)}
                        >
                          {dayOfMonth(day)}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
