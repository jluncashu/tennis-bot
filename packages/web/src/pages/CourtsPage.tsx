import { FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { createCourt, deleteCourt, listCourts, updateCourt, type ApiCourt } from "../api/courts.api";
import { getErrorMessage } from "../api/auth.api";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { CourtRulesModal } from "../components/CourtRulesModal";

export function CourtsPage() {
  const { t } = useTranslation();
  const [courts, setCourts] = useState<ApiCourt[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [slotDurationMinutes, setSlotDurationMinutes] = useState("");
  const [covered, setCovered] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlotDuration, setEditSlotDuration] = useState("");
  const [editCovered, setEditCovered] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<ApiCourt | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [rulesTarget, setRulesTarget] = useState<ApiCourt | null>(null);

  function refreshCourts() {
    return listCourts()
      .then((data) => {
        setCourts(data);
        setLoadError(null);
      })
      .catch((err) => setLoadError(getErrorMessage(err)));
  }

  useEffect(() => {
    refreshCourts().finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setSaveError(t("courts.nameRequired"));

    setSaving(true);
    setSaveError(null);
    try {
      await createCourt({
        name: name.trim(),
        slotDurationMinutes: slotDurationMinutes ? Number(slotDurationMinutes) : undefined,
        covered,
      });
      setName("");
      setSlotDurationMinutes("");
      setCovered(false);
      await refreshCourts();
    } catch (err) {
      setSaveError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function startEdit(court: ApiCourt) {
    setEditingId(court.id);
    setEditName(court.name);
    setEditSlotDuration(court.slotDurationMinutes ? String(court.slotDurationMinutes) : "");
    setEditCovered(court.covered);
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  async function handleSaveEdit(id: string) {
    if (!editName.trim()) return setEditError(t("courts.nameRequired"));

    setEditSaving(true);
    setEditError(null);
    try {
      await updateCourt(id, {
        name: editName.trim(),
        slotDurationMinutes: editSlotDuration ? Number(editSlotDuration) : undefined,
        covered: editCovered,
      });
      setEditingId(null);
      await refreshCourts();
    } catch (err) {
      setEditError(getErrorMessage(err));
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteCourt(deleteTarget.id);
      setDeleteTarget(null);
      await refreshCourts();
    } catch (err) {
      setDeleteError(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-slate-900">{t("courts.title")}</h1>
      <p className="mt-1 text-sm text-slate-500">{t("courts.subtitle")}</p>

      <section className="mt-6 max-w-md rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-900">{t("courts.createTitle")}</h2>

        <form onSubmit={handleCreate} className="mt-4 space-y-4">
          <div>
            <label htmlFor="courtName" className="block text-sm font-medium text-slate-700">
              {t("courts.nameLabel")}
            </label>
            <input
              id="courtName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("courts.namePlaceholder")}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label htmlFor="courtSlotDuration" className="block text-sm font-medium text-slate-700">
              {t("courts.slotDurationLabel")}
            </label>
            <p className="mt-0.5 text-xs text-slate-500">{t("courts.slotDurationHint")}</p>
            <input
              id="courtSlotDuration"
              type="number"
              min={1}
              value={slotDurationMinutes}
              onChange={(e) => setSlotDurationMinutes(e.target.value)}
              placeholder="60"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <span className="block text-sm font-medium text-slate-700">{t("courts.courtType")}</span>
            <div className="mt-1 flex gap-1.5">
              <button
                type="button"
                onClick={() => setCovered(false)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ring-1 ring-inset ${
                  !covered ? "bg-emerald-600 text-white ring-emerald-600" : "text-slate-600 ring-slate-300 hover:bg-slate-100"
                }`}
              >
                {t("courts.outdoor")}
              </button>
              <button
                type="button"
                onClick={() => setCovered(true)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ring-1 ring-inset ${
                  covered ? "bg-emerald-600 text-white ring-emerald-600" : "text-slate-600 ring-slate-300 hover:bg-slate-100"
                }`}
              >
                {t("courts.indoor")}
              </button>
            </div>
          </div>

          {saveError && <p className="text-sm text-red-600">{saveError}</p>}

          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? t("common.adding") : t("courts.addCourt")}
          </button>
        </form>
      </section>

      <section className="mt-6 max-w-md rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-900">{t("courts.existingTitle")}</h2>

        {loadError && <p className="mt-3 text-sm text-red-600">{t("courts.loadErrorPrefix", { error: loadError })}</p>}
        {!loadError && loading && <p className="mt-3 text-sm text-slate-500">{t("common.loading")}</p>}
        {!loadError && !loading && courts.length === 0 && (
          <p className="mt-3 text-sm text-slate-500">{t("courts.noneYet")}</p>
        )}

        {courts.length > 0 && (
          <ul className="mt-3 space-y-2">
            {courts.map((court) => {
              const isEditing = editingId === court.id;
              return (
                <li key={court.id} className="rounded-md border border-slate-200 px-3 py-2">
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder={t("courts.editNamePlaceholder")}
                        className="block w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <input
                        type="number"
                        min={1}
                        value={editSlotDuration}
                        onChange={(e) => setEditSlotDuration(e.target.value)}
                        placeholder={t("courts.editSlotDurationPlaceholder")}
                        className="block w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditCovered(false)}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                            !editCovered
                              ? "bg-emerald-600 text-white ring-emerald-600"
                              : "text-slate-600 ring-slate-300 hover:bg-slate-100"
                          }`}
                        >
                          {t("courts.outdoor")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditCovered(true)}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                            editCovered
                              ? "bg-emerald-600 text-white ring-emerald-600"
                              : "text-slate-600 ring-slate-300 hover:bg-slate-100"
                          }`}
                        >
                          {t("courts.indoor")}
                        </button>
                      </div>
                      {editError && <p className="text-xs text-red-600">{editError}</p>}
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={editSaving}
                          className="rounded-md px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60"
                        >
                          {t("common.cancel")}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(court.id)}
                          disabled={editSaving}
                          className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {editSaving ? t("common.saving") : t("common.save")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{court.name}</p>
                        <p className="text-xs text-slate-500">
                          {court.covered ? t("courts.indoor") : t("courts.outdoor")} ·{" "}
                          {court.slotDurationMinutes
                            ? t("courts.minSlots", { count: court.slotDurationMinutes })
                            : t("courts.defaultSlotDuration")}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setRulesTarget(court)}
                          className="rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-100"
                        >
                          {t("courts.hoursAndPricing")}
                        </button>
                        <button
                          type="button"
                          onClick={() => startEdit(court)}
                          className="rounded-md px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600 hover:bg-emerald-50"
                        >
                          {t("common.edit")}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteTarget(court);
                            setDeleteError(null);
                          }}
                          className="rounded-md px-2.5 py-1 text-xs font-medium text-red-600 ring-1 ring-inset ring-red-300 hover:bg-red-50"
                        >
                          {t("common.delete")}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {deleteTarget && (
        <ConfirmDialog
          title={t("courts.deleteConfirmTitle", { name: deleteTarget.name })}
          message={t("courts.deleteConfirmMessage", { name: deleteTarget.name })}
          confirming={deleting}
          error={deleteError}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {rulesTarget && (
        <CourtRulesModal court={rulesTarget} onClose={() => setRulesTarget(null)} onChanged={() => {}} />
      )}
    </div>
  );
}
