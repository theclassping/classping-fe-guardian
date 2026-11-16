"use client";

// "Album Digital" on the activity report: opens the PDF of whatever the list shows in a new tab. When the list
// shows everything there is no range, so the button first asks for an academic year and semester.
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BookHeart } from "lucide-react";
import { activityDayKey, dayRangeOf, formatSelection, todayKey } from "@/features/activities/filter";
import { parseActivityListState } from "@/features/activities/list-state";
import type { Activity } from "@/features/activities/types";
import { MAX_PHOTOS_PER_PDF, albumFileName, downloadPartsFor } from "@/features/album/core/model";
import { periodParam, type Period } from "@/features/album/core/period";
import { academicYearLabel, academicYearsOf, monthPhotoCountsFor, semesterLabel, semesterPeriod, type Semester } from "@/features/album/semester";

const albumHref = (subject: string, period: Period) => `/api/album/${albumFileName(subject, period)}?period=${encodeURIComponent(periodParam(period))}`;

/** `subject` names the child in the PDF's file name. */
export default function AlbumButton({ items, subject }: { items: readonly Activity[]; subject: string }) {
  const searchParams = useSearchParams();
  const { mode, date } = parseActivityListState(searchParams);
  if (mode === "all") return <SemesterChooser items={items} subject={subject} />;
  const { start, end } = dayRangeOf(mode, date);
  return (
    <a className="outline-button album-button" href={albumHref(subject, { kind: "range", from: start, to: end })} target="_blank" rel="noopener">
      <BookHeart /> Album Digital <small>{formatSelection(mode, date)}</small>
    </a>
  );
}

function SemesterChooser({ items, subject }: { items: readonly Activity[]; subject: string }) {
  const dated = useMemo(() => items.map((item) => ({ day: activityDayKey(item), photos: item.photos })), [items]);
  const years = useMemo(() => academicYearsOf(dated.flatMap((item) => (item.day ? [item.day] : [])), todayKey()), [dated]);
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(years[0]);
  const [semester, setSemester] = useState<Semester>(1);
  const period = semesterPeriod(year, semester);
  const months = monthPhotoCountsFor(dated, period);
  const photos = months.reduce((sum, month) => sum + month.photos, 0);
  const parts = photos > MAX_PHOTOS_PER_PDF ? downloadPartsFor({ period, monthPhotoCounts: months }) : [];
  return (
    <div className="album-chooser">
      <button type="button" className="outline-button album-button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <BookHeart /> Album Digital <small>Pilih semester</small>
      </button>
      {open && (
        <div className="panel album-chooser-panel" role="dialog" aria-label="Pilih semester album">
          <label>
            Tahun ajaran
            <select value={year} onChange={(event) => setYear(Number(event.target.value))}>
              {years.map((value) => <option key={value} value={value}>{academicYearLabel(value)}</option>)}
            </select>
          </label>
          <fieldset>
            <legend>Semester</legend>
            {([1, 2] as const).map((value) => (
              <label key={value}>
                <input type="radio" name="album-semester" checked={semester === value} onChange={() => setSemester(value)} /> {semesterLabel(year, value)}
              </label>
            ))}
          </fieldset>
          {photos === 0 ? (
            <p className="album-chooser-note">Belum ada foto di semester ini.</p>
          ) : parts.length > 1 ? (
            <>
              <p className="album-chooser-note">{photos} foto, lebih dari {MAX_PHOTOS_PER_PDF} per PDF, jadi album dibuka per bagian.</p>
              {parts.map((part) => (
                <a key={part.label} className="outline-button" href={albumHref(subject, part.period)} target="_blank" rel="noopener">{part.label} ({part.photos} foto)</a>
              ))}
            </>
          ) : (
            <a className="primary-button" href={albumHref(subject, period)} target="_blank" rel="noopener">Buka album ({photos} foto)</a>
          )}
        </div>
      )}
    </div>
  );
}
