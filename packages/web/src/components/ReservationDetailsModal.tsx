import { useState } from "react";
import type { Reservation, ReservationStatus } from "../mocks/reservations.mock";

interface ReservationDetailsModalProps {
  reservation: Reservation;
  onClose: () => void;
  onSave: (status: ReservationStatus) => void;
}

const STATUS_OPTIONS: ReservationStatus[] = ["confirmed", "pending", "cancelled"];

export function ReservationDetailsModal({ reservation, onClose, onSave }: ReservationDetailsModalProps) {
  const [status, setStatus] = useState<ReservationStatus>(reservation.status);
  const [saving, setSaving] = useState(false);

  function handleSave() {
    setSaving(true);
    onSave(status);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Reservation</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <span className="block text-sm font-medium text-slate-700">Client name</span>
            <p className="mt-1 text-sm text-slate-900">{reservation.customerName}</p>
          </div>
          <div>
            <span className="block text-sm font-medium text-slate-700">Telephone number</span>
            <p className="mt-1 text-sm text-slate-900">{reservation.customerPhone}</p>
          </div>
          <div>
            <label htmlFor="reservationStatus" className="block text-sm font-medium text-slate-700">
              Status
            </label>
            <select
              id="reservationStatus"
              value={status}
              onChange={(e) => setStatus(e.target.value as ReservationStatus)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
