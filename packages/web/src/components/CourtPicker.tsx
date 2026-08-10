interface CourtPickerProps {
  courts: string[];
  active: string;
  onChange: (court: string) => void;
}

export function CourtPicker({ courts, active, onChange }: CourtPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {courts.map((court) => (
        <button
          key={court}
          type="button"
          onClick={() => onChange(court)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            court === active
              ? "bg-emerald-600 text-white"
              : "bg-white text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-100"
          }`}
        >
          {court}
        </button>
      ))}
    </div>
  );
}
