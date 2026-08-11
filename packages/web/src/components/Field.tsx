import { InputHTMLAttributes, ReactNode } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: ReactNode;
}

export function Field({ label, icon, id, name, ...inputProps }: FieldProps) {
  const inputId = id ?? name;

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative mt-1">
        {icon && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          name={name}
          className={`block w-full rounded-md border border-slate-300 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
            icon ? "pl-9 pr-3" : "px-3"
          }`}
          {...inputProps}
        />
      </div>
    </div>
  );
}

export default Field;
