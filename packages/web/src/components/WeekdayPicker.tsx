export const WEEKDAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

interface WeekdayPickerProps {
  selected: number[]; // 0=Sun..6=Sat
  onToggle: (day: number) => void;
}

export function WeekdayPicker({ selected, onToggle }: WeekdayPickerProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {WEEKDAYS.map((d) => (
        <button
          key={d.value}
          type="button"
          onClick={() => onToggle(d.value)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ring-1 ring-inset ${
            selected.includes(d.value)
              ? "bg-emerald-600 text-white ring-emerald-600"
              : "text-slate-600 ring-slate-300 hover:bg-slate-100"
          }`}
        >
          {d.label}
        </button>
      ))}
    </div>
  );
}
