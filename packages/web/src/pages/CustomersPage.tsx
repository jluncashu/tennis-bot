import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { listContacts, type ApiContact } from "../api/contacts.api";
import { getErrorMessage } from "../api/auth.api";
import { CustomerDetailModal } from "../components/CustomerDetailModal";

export function CustomersPage() {
  const { t } = useTranslation();
  const [contacts, setContacts] = useState<ApiContact[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ApiContact | null>(null);

  useEffect(() => {
    listContacts()
      .then(setContacts)
      .catch((err) => setLoadError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => (c.name?.toLowerCase().includes(q) ?? false) || c.phone.toLowerCase().includes(q));
  }, [contacts, search]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t("customers.title")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("customers.subtitle")}</p>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("customers.searchPlaceholder")}
          className="w-64 rounded-full border-0 bg-slate-100 px-4 py-1.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
        />
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        {loadError && <p className="p-4 text-sm text-red-600">{t("customers.loadErrorPrefix", { error: loadError })}</p>}
        {!loadError && loading && <p className="p-4 text-sm text-slate-500">{t("common.loading")}</p>}
        {!loadError && !loading && filtered.length === 0 && (
          <p className="p-4 text-sm text-slate-500">
            {contacts.length === 0 ? t("customers.noneYet") : t("customers.noneMatch")}
          </p>
        )}

        {!loadError && !loading && filtered.length > 0 && (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">{t("customers.colName")}</th>
                <th className="px-4 py-3">{t("customers.colPhone")}</th>
                <th className="px-4 py-3">{t("customers.colBookings")}</th>
                <th className="px-4 py-3">{t("customers.colLastBooking")}</th>
                <th className="px-4 py-3">{t("customers.colCustomerSince")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <tr key={c.id} onClick={() => setSelected(c)} className="cursor-pointer hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{c.name ?? t("common.emptyValue")}</td>
                  <td className="px-4 py-3 text-slate-600">{c.phone}</td>
                  <td className="px-4 py-3 text-slate-600">{c.bookingsCount}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.lastBookingDate ? dayjs(c.lastBookingDate).format("MMM D, YYYY") : t("common.emptyValue")}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{dayjs(c.createdAt).format("MMM D, YYYY")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && <CustomerDetailModal contact={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
