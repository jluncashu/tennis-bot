import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { listContactBookings, type ApiContact, type ApiContactBooking } from "../../../api/contacts.api";
import { getErrorMessage } from "../../../api/auth.api";

interface CustomerDetailModalProps {
  contact: ApiContact;
  onClose: () => void;
}

function formatTimeRange(startTime: string, endTime: string): string {
  return `${startTime.slice(0, 5)}–${endTime.slice(0, 5)}`;
}

export function CustomerDetailModal({ contact, onClose }: CustomerDetailModalProps) {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState<ApiContactBooking[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listContactBookings(contact.id)
      .then(setBookings)
      .catch((err) => setLoadError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [contact.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{contact.name ?? contact.phone}</h2>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="block text-sm font-medium text-slate-700">{t("customerDetail.phone")}</span>
              <p className="mt-1 text-sm text-slate-900">{contact.phone}</p>
            </div>
            <div>
              <span className="block text-sm font-medium text-slate-700">{t("customerDetail.customerSince")}</span>
              <p className="mt-1 text-sm text-slate-900">{dayjs(contact.createdAt).format("MMM D, YYYY")}</p>
            </div>
          </div>

          <div>
            <span className="block text-sm font-medium text-slate-700">{t("customerDetail.bookingHistory")}</span>

            {loadError && <p className="mt-2 text-sm text-red-600">{t("customerDetail.loadErrorPrefix", { error: loadError })}</p>}
            {!loadError && loading && <p className="mt-2 text-sm text-slate-500">{t("common.loading")}</p>}
            {!loadError && !loading && bookings.length === 0 && (
              <p className="mt-2 text-sm text-slate-500">{t("customerDetail.noneYet")}</p>
            )}

            {!loadError && !loading && bookings.length > 0 && (
              <ul className="mt-2 max-h-64 space-y-1.5 overflow-y-auto">
                {bookings.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm"
                  >
                    <span className="text-slate-900">
                      {dayjs(b.date).format("ddd, D MMM YYYY")} · {b.courtName} · {formatTimeRange(b.startTime, b.endTime)}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        b.status === "confirmed" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                      }`}
                    >
                      {b.status === "confirmed" ? t("customerDetail.statusConfirmed") : t("customerDetail.statusCancelled")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
