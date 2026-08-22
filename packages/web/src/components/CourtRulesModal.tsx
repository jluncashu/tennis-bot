import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { WeekdayPicker } from "./WeekdayPicker";
import { listAvailabilityRules, createAvailabilityRule, deleteAvailabilityRule, type ApiAvailabilityRule } from "../api/availabilityRules.api";
import { listPriceRules, createPriceRule, deletePriceRule, type ApiPriceRule } from "../api/priceRules.api";
import { getErrorMessage } from "../api/auth.api";
import type { ApiCourt } from "../api/courts.api";

interface CourtRulesModalProps {
  court: ApiCourt;
  onClose: () => void;
  onChanged: () => void; // hours/pricing feed the calendar's open-hours range and booking prices
}

type Tab = "hours" | "pricing";

function formatTime(t: string): string {
  return t.slice(0, 5); // HH:MM:SS -> HH:MM
}

export function CourtRulesModal({ court, onClose, onChanged }: CourtRulesModalProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("hours");

  const [rules, setRules] = useState<ApiAvailabilityRule[]>([]);
  const [priceRules, setPriceRulesState] = useState<ApiPriceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [days, setDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("22:00");
  const [priceRon, setPriceRon] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function refresh() {
    setLoading(true);
    Promise.all([listAvailabilityRules(court.id), listPriceRules(court.id)])
      .then(([a, p]) => {
        setRules(a);
        setPriceRulesState(p);
        setLoadError(null);
      })
      .catch((err) => setLoadError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, [court.id]);

  function toggleDay(day: number) {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  async function handleAdd() {
    if (days.length === 0) return setSaveError(t("courtRules.pickDay"));
    if (endTime <= startTime) return setSaveError(t("courtRules.endAfterStart"));
    if (tab === "pricing" && (!priceRon || Number(priceRon) < 0)) return setSaveError(t("courtRules.validPrice"));

    setSaving(true);
    setSaveError(null);
    try {
      if (tab === "hours") {
        await Promise.all(days.map((dayOfWeek) => createAvailabilityRule(court.id, { dayOfWeek, startTime, endTime })));
      } else {
        await Promise.all(
          days.map((dayOfWeek) => createPriceRule(court.id, { dayOfWeek, startTime, endTime, priceRon: Number(priceRon) }))
        );
      }
      setDays([]);
      refresh();
      onChanged();
    } catch (err) {
      setSaveError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRule(id: string) {
    try {
      await deleteAvailabilityRule(court.id, id);
      refresh();
      onChanged();
    } catch (err) {
      setLoadError(getErrorMessage(err));
    }
  }

  async function handleDeletePriceRule(id: string) {
    try {
      await deletePriceRule(court.id, id);
      refresh();
      onChanged();
    } catch (err) {
      setLoadError(getErrorMessage(err));
    }
  }

  const sortedRules = [...rules].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));
  const sortedPriceRules = [...priceRules].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{court.name} — {t("courtRules.headerSuffix")}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-1 border-b border-slate-200 px-6 pt-3">
          <button
            type="button"
            onClick={() => setTab("hours")}
            className={`rounded-t-md px-3 py-2 text-sm font-medium ${
              tab === "hours" ? "border-b-2 border-emerald-600 text-emerald-700" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t("courtRules.hoursTab")}
          </button>
          <button
            type="button"
            onClick={() => setTab("pricing")}
            className={`rounded-t-md px-3 py-2 text-sm font-medium ${
              tab === "pricing" ? "border-b-2 border-emerald-600 text-emerald-700" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t("courtRules.pricingTab")}
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {loadError && <p className="mb-3 text-sm text-red-600">{t("courtRules.loadErrorPrefix", { error: loadError })}</p>}

          {loading ? (
            <p className="text-sm text-slate-500">{t("common.loading")}</p>
          ) : (
            <>
              <div className="space-y-3 rounded-md border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  {tab === "hours" ? t("courtRules.addHours") : t("courtRules.addPricing")}
                </p>
                <WeekdayPicker selected={days} onToggle={toggleDay} />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600">{t("courtRules.start")}</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600">{t("courtRules.end")}</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                {tab === "pricing" && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600">{t("courtRules.priceLabel")}</label>
                    <input
                      type="number"
                      min={0}
                      value={priceRon}
                      onChange={(e) => setPriceRon(e.target.value)}
                      placeholder={t("courtRules.pricePlaceholder")}
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                )}
                {saveError && <p className="text-sm text-red-600">{saveError}</p>}
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={saving}
                  className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {saving ? t("common.adding") : t("common.add")}
                </button>
              </div>

              <div className="mt-4 space-y-1.5">
                {tab === "hours" &&
                  (sortedRules.length === 0 ? (
                    <p className="text-sm text-slate-500">{t("courtRules.noHoursYet")}</p>
                  ) : (
                    sortedRules.map((r) => (
                      <div key={r.id} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm">
                        <span>
                          <strong className="font-medium text-slate-900">{t(`common.weekdaysShort.${r.dayOfWeek}`)}</strong> ·{" "}
                          {formatTime(r.startTime)}–{formatTime(r.endTime)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteRule(r.id)}
                          className="text-xs font-medium text-red-600 hover:text-red-700"
                        >
                          {t("common.remove")}
                        </button>
                      </div>
                    ))
                  ))}

                {tab === "pricing" &&
                  (sortedPriceRules.length === 0 ? (
                    <p className="text-sm text-slate-500">{t("courtRules.noPriceRulesYet")}</p>
                  ) : (
                    sortedPriceRules.map((r) => (
                      <div key={r.id} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm">
                        <span>
                          <strong className="font-medium text-slate-900">{t(`common.weekdaysShort.${r.dayOfWeek}`)}</strong> ·{" "}
                          {formatTime(r.startTime)}–{formatTime(r.endTime)} · {r.priceRon} {t("courtRules.ron")}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeletePriceRule(r.id)}
                          className="text-xs font-medium text-red-600 hover:text-red-700"
                        >
                          {t("common.remove")}
                        </button>
                      </div>
                    ))
                  ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
