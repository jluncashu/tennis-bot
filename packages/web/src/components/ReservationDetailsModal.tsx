import { useState } from "react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import type { Reservation } from "../types/reservation";
import { cancelBooking } from "../api/bookings.api";
import { getErrorMessage } from "../api/auth.api";

interface ReservationDetailsModalProps {
  reservation: Reservation;
  onClose: () => void;
  onCancelled: () => void;
}

function formatTimeRange(startHour: number, durationMinutes: number): string {
  const start = dayjs().hour(Math.floor(startHour)).minute(Math.round((startHour % 1) * 60));
  return `${start.format("HH:mm")}–${start.add(durationMinutes, "minute").format("HH:mm")}`;
}

export function ReservationDetailsModal({ reservation, onClose, onCancelled }: ReservationDetailsModalProps) {
  const { t } = useTranslation();
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    setCancelling(true);
    setError(null);
    try {
      await cancelBooking(reservation.id);
      onCancelled();
    } catch (err) {
      setError(getErrorMessage(err));
      setCancelling(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{t("reservationDetails.title")}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <span className="block text-sm font-medium text-slate-700">{t("reservationDetails.clientName")}</span>
            <p className="mt-1 text-sm text-slate-900">{reservation.customerName}</p>
          </div>
          <div>
            <span className="block text-sm font-medium text-slate-700">{t("reservationDetails.telephone")}</span>
            <p className="mt-1 text-sm text-slate-900">{reservation.customerPhone}</p>
          </div>
          <div>
            <span className="block text-sm font-medium text-slate-700">{t("reservationDetails.courtAndTime")}</span>
            <p className="mt-1 text-sm text-slate-900">
              {reservation.court} · {dayjs(reservation.date).format("ddd, D MMM")} ·{" "}
              {formatTimeRange(reservation.startHour, reservation.durationMinutes ?? 60)}
            </p>
          </div>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
              {t("reservationDetails.cancelErrorPrefix", { error })}
            </p>
          )}

          <button
            type="button"
            onClick={handleCancel}
            disabled={cancelling}
            className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelling ? t("reservationDetails.cancelling") : t("reservationDetails.cancelBooking")}
          </button>
        </div>
      </div>
    </div>
  );
}
