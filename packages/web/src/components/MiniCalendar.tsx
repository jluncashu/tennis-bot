import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { addDays, addMonths, startOfDay, startOfMonth, startOfWeek } from "../lib/date";
import { useCalendarStore } from "../store/calendar.store";

function ChevronLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function buildMonthGrid(viewMonth: Date): Date[] {
  const monthStart = startOfMonth(viewMonth);
  const gridStart = startOfWeek(monthStart);
  const nextMonthStart = addMonths(monthStart, 1);
  const daysBetween = Math.round((nextMonthStart.getTime() - gridStart.getTime()) / 86_400_000);
  const weeks = Math.ceil(daysBetween / 7);
  return Array.from({ length: weeks * 7 }, (_, i) => addDays(gridStart, i));
}

export function MiniCalendar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const goToDate = useCalendarStore((s) => s.goToDate);

  const today = startOfDay(new Date());
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(today));
  const [selected, setSelected] = useState(today);

  const cells = buildMonthGrid(viewMonth);

  function handleSelect(date: Date) {
    setSelected(date);
    goToDate(date);
    if (location.pathname !== "/reservations") navigate("/reservations");
  }

  return (
    <div className="px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700">{dayjs(viewMonth).format("MMMM YYYY")}</span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            aria-label={t("miniCalendar.previousMonth")}
            onClick={() => setViewMonth((m) => addMonths(m, -1))}
            className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <ChevronLeftIcon />
          </button>
          <button
            type="button"
            aria-label={t("miniCalendar.nextMonth")}
            onClick={() => setViewMonth((m) => addMonths(m, 1))}
            className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <ChevronRightIcon />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {(t("common.weekdaysMin", { returnObjects: true }) as string[]).map((label, i) => (
          <span key={i} className="text-[10px] font-medium text-slate-400">
            {label}
          </span>
        ))}

        {cells.map((date) => {
          const inMonth = date.getMonth() === viewMonth.getMonth();
          const isToday = date.getTime() === today.getTime();
          const isSelected = date.getTime() === selected.getTime();

          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => handleSelect(date)}
              className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[11px] transition-colors ${
                isSelected
                  ? "bg-slate-900 font-semibold text-white"
                  : isToday
                    ? "font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-300"
                    : inMonth
                      ? "text-slate-700 hover:bg-slate-100"
                      : "text-slate-300 hover:bg-slate-100"
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
