import { useTranslation } from "react-i18next";

export const WEEKDAY_VALUES = [1, 2, 3, 4, 5, 6, 0];

interface WeekdayPickerProps {
  selected: number[]; // 0=Sun..6=Sat
  onToggle: (day: number) => void;
}

export function WeekdayPicker({ selected, onToggle }: WeekdayPickerProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-1.5">
      {WEEKDAY_VALUES.map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onToggle(value)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ring-1 ring-inset ${
            selected.includes(value)
              ? "bg-emerald-600 text-white ring-emerald-600"
              : "text-slate-600 ring-slate-300 hover:bg-slate-100"
          }`}
        >
          {t(`common.weekdaysShort.${value}`)}
        </button>
      ))}
    </div>
  );
}
