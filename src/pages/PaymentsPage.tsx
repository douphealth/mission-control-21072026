import {
  usePayments,
  useAddItem,
  useUpdateItem,
  useDeleteItem,
  useBulkPatch,
  useBulkDeleteItems,
  useDuplicateItem,
} from "@/hooks/useTableData";
import { useState, useRef, useEffect } from "react";
import "@/operate-workspaces.css";
import {
  dueState,
  direction,
  financeCsv,
  localToday,
  moneySummary,
  paymentStatus,
  paymentStatusPatch,
  validatePayment,
  paymentMatchesPeriod,
  ledgerEvidenceUrl,
  amountInMinorUnits,
} from "@/lib/financeLedger";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  DollarSign,
  RefreshCw,
  CheckSquare,
  Copy,
  ArrowUpRight,
  ArrowDownLeft,
  ReceiptText,
  ExternalLink,
  CalendarDays,
} from "lucide-react";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import FormModal, { FormField, FormInput, FormTextarea, FormSelect } from "@/components/FormModal";
import type { Payment } from "@/lib/store";
import { toast } from "sonner";
import { useBulkActions } from "@/hooks/useBulkActions";
import BulkActionBar from "@/components/BulkActionBar";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import ConfirmDialog from "@/components/ConfirmDialog";

const typeIcons = {
  income: ArrowDownLeft,
  expense: ArrowUpRight,
  invoice: ReceiptText,
  subscription: RefreshCw,
};
const statusBadge: Record<string, string> = {
  paid: "badge-success",
  pending: "badge-warning",
  overdue: "badge-destructive",
  cancelled: "badge-muted",
};

const emptyPayment: Omit<Payment, "id"> = {
  title: "",
  amount: 0,
  currency: "USD",
  type: "expense",
  status: "pending",
  category: "General",
  from: "",
  to: "",
  dueDate: new Date().toISOString().split("T")[0],
  paidDate: "",
  recurring: false,
  recurringInterval: "",
  linkedProject: "",
  notes: "",
  createdAt: new Date().toISOString().split("T")[0],
};

export default function PaymentsPage() {
  const payments = usePayments();
  const addItem = useAddItem();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const bulkPatch = useBulkPatch();
  const bulkDeleteItems = useBulkDeleteItems();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const duplicateItem = useDuplicateItem();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCurrency, setFilterCurrency] = useState("all");
  const [evidence, setEvidence] = useState("all");
  const [period, setPeriod] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const today = localToday();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyPayment);
  const bulk = useBulkActions<Payment>();
  const cd = useConfirmDialog();

  const monthStart = `${today.slice(0, 7)}-01`;
  const priorMonth = new Date(`${monthStart}T12:00:00`);
  priorMonth.setMonth(priorMonth.getMonth() - 1);
  const previousEnd = new Date(`${monthStart}T12:00:00`);
  previousEnd.setDate(0);
  const from =
    period === "month"
      ? monthStart
      : period === "previous"
        ? localToday(priorMonth)
        : period === "year"
          ? `${today.slice(0, 4)}-01-01`
          : period === "custom"
            ? customFrom
            : "";
  const to =
    period === "month" || period === "year"
      ? today
      : period === "previous"
        ? localToday(previousEnd)
        : period === "custom"
          ? customTo
          : "";
  const invalidPeriod = !!from && !!to && from > to;
  useEffect(() => {
    bulk.clearSelection();
  }, [search, filterType, filterCurrency, filterStatus, evidence, from, to, bulk.clearSelection]);
  const filtered = payments
    .filter((p) => filterType === "all" || p.type === filterType)
    .filter((p) => filterCurrency === "all" || p.currency?.trim().toUpperCase() === filterCurrency)
    .filter(
      (p) =>
        evidence === "all" ||
        (p.evidenceStatus === "confirmed" ? "confirmed" : "unverified") === evidence,
    )
    .filter((p) => !invalidPeriod && paymentMatchesPeriod(p, from, to))
    .filter((p) => filterStatus === "all" || paymentStatus(p, today) === filterStatus)
    .filter((p) =>
      [p.title, p.category, p.from, p.to, p.sourceRef, p.linkedProject]
        .join(" ")
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const selectedPayments = filtered.filter((p) => bulk.selectedIds.has(p.id));
  const currencySummary = moneySummary(filtered);
  const currencyRows = Object.entries(currencySummary).sort(([a], [b]) => a.localeCompare(b));
  const overdueCount = payments.filter((p) => dueState(p, today) === "overdue").length;
  const upcoming = payments
    .filter((p) => ["overdue", "upcoming"].includes(dueState(p, today)))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);
  const exportCsv = () => {
    const url = URL.createObjectURL(
      new Blob([financeCsv(filtered)], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "mission-control-payments-" + today + ".csv";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const openAdd = () => {
    setError("");
    setEditId(null);
    setForm({ ...emptyPayment, dueDate: today, createdAt: today, currency: "EUR" });
    setModalOpen(true);
  };
  const openEdit = (p: Payment) => {
    setError("");
    setEditId(p.id);
    const { id, ...rest } = p;
    setForm({ ...emptyPayment, ...rest, currency: p.currency || "" });
    setModalOpen(true);
  };
  async function operation(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (failure) {
      const message =
        failure instanceof Error
          ? failure.message
          : "The record could not be saved. Your draft is still available.";
      setError(message);
      toast.error("Not saved", { description: message });
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const saveForm = () =>
    void operation(async () => {
      const record = {
        ...form,
        title: form.title.trim(),
        currency: form.currency.trim().toUpperCase(),
        source: form.source || ("manual" as const),
        evidenceStatus: form.evidenceStatus || ("unverified" as const),
        paidDate: form.status === "paid" ? form.paidDate : "",
      };
      const issue = validatePayment(record, today);
      if (issue) throw new Error(issue);
      if (editId) await updateItem<Payment>("payments", editId, record);
      else await addItem<Payment>("payments", { ...record, createdAt: today });
      setModalOpen(false);
      toast.success(editId ? "Payment updated" : "Payment added");
    });
  const deletePayment = (id: string) =>
    cd.confirm({
      title: "Delete payment record?",
      description:
        "This removes the ledger entry. It does not cancel a subscription or a bank payment.",
      onConfirm: () =>
        void operation(async () => {
          await deleteItem("payments", id);
          toast.success("Payment record deleted");
        }),
    });
  const duplicatePayment = (id: string) =>
    void operation(async () => {
      const newId = await duplicateItem("payments", id, {
        status: "pending",
        paidDate: "",
        evidenceStatus: "unverified",
        source: "manual",
        sourceRef: "",
        sourceUrl: "",
        verifiedAt: undefined,
      });
      if (newId)
        toast.success("New payment draft created", {
          description: "Confirmation and receipt references were cleared for the new record.",
        });
    });
  const markPaid = (id: string) =>
    void operation(async () => {
      const payment = payments.find((row) => row.id === id);
      if (!payment) throw new Error("This record no longer exists.");
      const patch = paymentStatusPatch("paid", today);
      const issue = validatePayment({ ...payment, ...patch }, today);
      if (issue) throw new Error(`Edit this record first: ${issue}`);
      await updateItem<Payment>("payments", id, patch);
      toast.success("Payment recorded in the ledger", {
        description: "No funds transferred. Add the receipt in Edit to confirm the evidence.",
      });
    });
  const uf = (field: keyof typeof form, val: any) => setForm((f) => ({ ...f, [field]: val }));
  const fmt = (amount: number, currency: string) => {
    if (!Number.isFinite(amount)) return "Invalid amount";
    const normalized = (currency || "").trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(normalized)) return `${amount.toLocaleString()} · currency missing`;
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: normalized }).format(
        amount,
      );
    } catch {
      return `${amount.toLocaleString()} ${normalized}`;
    }
  };
  const bulkDelete = () => {
    if (!selectedPayments.length) return;
    cd.confirm({
      title: `Delete ${selectedPayments.length} payment records?`,
      description:
        "Selected ledger records will be removed. No bank transactions or subscriptions are changed.",
      onConfirm: () =>
        void operation(async () => {
          await bulkDeleteItems(
            "payments",
            selectedPayments.map((p) => p.id),
          );
          toast.success(`${selectedPayments.length} payment records deleted`);
          bulk.clearSelection();
        }),
    });
  };
  const bulkUpdateStatus = (status: string) =>
    void operation(async () => {
      if (!selectedPayments.length) return;
      const patch = paymentStatusPatch(status as Payment["status"], today);
      if (status === "paid") {
        const invalid = selectedPayments.find((p) => validatePayment({ ...p, ...patch }, today));
        if (invalid)
          throw new Error(
            `Edit “${invalid.title}” before recording it paid: ${validatePayment({ ...invalid, ...patch }, today)}`,
          );
      }
      await bulkPatch(
        "payments",
        selectedPayments.map((p) => p.id),
        patch,
      );
      toast.success(`${selectedPayments.length} records updated`);
      bulk.clearSelection();
    });
  const invalidCurrencyCount = payments.filter(
    (p) => !/^[A-Z]{3}$/.test((p.currency || "").trim().toUpperCase()),
  ).length;
  const invalidAmountCount = payments.filter(
    (p) => amountInMinorUnits(p.amount, (p.currency || "").toUpperCase()) === null,
  ).length;
  const unverifiedCount = payments.filter((p) => p.evidenceStatus !== "confirmed").length;

  return (
    <div className="mc-operate mc-finance space-y-5">
      <PageHeader
        icon={DollarSign}
        eyebrow="Finance"
        title="Finance"
        stats={[
          { label: "Recorded entries", value: payments.length },
          { label: "Overdue", value: overdueCount, tone: "amber" },
          { label: "Need confirmation", value: unverifiedCount },
        ]}
        tone="accent"
        subtitle={
          overdueCount > 0
            ? `${overdueCount} overdue. Income, expenses and subscriptions, kept separate by currency.`
            : "Income, expenses and subscriptions, kept separate by currency."
        }
        actions={
          <>
            <button
              onClick={bulk.toggleBulkMode}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-semibold transition-all ${bulk.bulkMode ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-secondary/50 text-muted-foreground hover:text-foreground border border-border/20"}`}
            >
              <CheckSquare size={15} /> {bulk.bulkMode ? "Cancel" : "Bulk"}
            </button>
            <button
              onClick={exportCsv}
              className="btn-secondary text-xs"
              disabled={!filtered.length}
            >
              Export CSV
            </button>
            <button
              disabled={busy}
              onClick={openAdd}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition shadow-lg shadow-primary/20"
            >
              <Plus size={16} /> New record
            </button>
          </>
        }
      />

      {error && !modalOpen && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {invalidCurrencyCount > 0 && (
        <p
          role="status"
          className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm"
        >
          {invalidCurrencyCount} record(s) need a valid currency and are excluded from totals. Edit
          the original records to correct them.
        </p>
      )}

      <section className="op-scope-panel" aria-label="Finance reporting scope">
        <div className="op-scope-heading">
          <CalendarDays size={18} />
          <div>
            <h2>Reporting period</h2>
            <p>Paid entries use payment dates. Open entries use due dates.</p>
          </div>
        </div>
        <div className="op-scope-controls">
          <select
            aria-label="Finance reporting period"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          >
            <option value="all">All recorded dates</option>
            <option value="month">This month to date</option>
            <option value="previous">Last month</option>
            <option value="year">This year to date</option>
            <option value="custom">Custom dates</option>
          </select>
          <select
            aria-label="Financial evidence filter"
            value={evidence}
            onChange={(event) => setEvidence(event.target.value)}
          >
            <option value="all">All evidence states</option>
            <option value="confirmed">Confirmed references</option>
            <option value="unverified">Need confirmation</option>
          </select>
          {period === "custom" && (
            <>
              <label>
                From
                <input
                  aria-label="Finance period start"
                  type="date"
                  value={customFrom}
                  onChange={(event) => setCustomFrom(event.target.value)}
                />
              </label>
              <label>
                To
                <input
                  aria-label="Finance period end"
                  type="date"
                  value={customTo}
                  onChange={(event) => setCustomTo(event.target.value)}
                />
              </label>
            </>
          )}
        </div>
        {invalidPeriod && (
          <p role="alert" className="text-sm text-destructive">
            Choose an end date on or after the start date.
          </p>
        )}
        {(from || to) && (
          <p className="op-scope-note">
            {from || "Any start"} → {to || "Any end"} · Undated entries are excluded from this
            period.
          </p>
        )}
      </section>
      {invalidAmountCount > 0 && (
        <p
          role="status"
          className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm"
        >
          {invalidAmountCount} record(s) have invalid amounts or unsupported decimal precision and
          are excluded from totals. Edit those records to repair them.
        </p>
      )}
      {bulk.bulkMode && (
        <BulkActionBar
          selectedCount={selectedPayments.length}
          totalCount={filtered.length}
          onSelectAll={() => bulk.selectAll(filtered)}
          allSelected={selectedPayments.length === filtered.length && filtered.length > 0}
          onDelete={bulkDelete}
          dropdowns={[
            {
              label: "Set Status...",
              onSelect: bulkUpdateStatus,
              options: [
                { value: "paid", label: "✅ Paid" },
                { value: "pending", label: "⏳ Pending" },
                { value: "overdue", label: "🔴 Overdue" },
                { value: "cancelled", label: "❌ Cancelled" },
              ],
            },
          ]}
        />
      )}

      <section className="grid gap-3 md:grid-cols-2">
        <div className="card-glass p-4">
          <h2 className="text-sm font-semibold">Next payments &amp; collections</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {overdueCount} overdue · settled income and outgoing costs are reported separately
          </p>
          {upcoming.length ? (
            <div className="mt-3 space-y-2">
              {upcoming.map((p) => (
                <div
                  key={p.id}
                  className="flex justify-between gap-3 border-t border-border/30 pt-2 text-xs"
                >
                  <span className="min-w-0 truncate">
                    {p.title} · {p.dueDate}
                  </span>
                  <span className="shrink-0 font-semibold">{fmt(p.amount, p.currency)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">No upcoming recorded obligations.</p>
          )}
        </div>
        <div className="card-glass p-4">
          <h2 className="text-sm font-semibold">Financial integrity</h2>
          <p className="mt-2 text-xs text-muted-foreground">
            {payments.filter((p) => p.evidenceStatus === "confirmed").length} entries have
            supporting references. {unverifiedCount} still need confirmation. Totals use the
            reporting period and all active filters below. This ledger records your information; it
            does not connect to a bank or transfer funds.
          </p>
        </div>
      </section>
      {/* Currency-safe summary — never add unlike currencies together. */}
      <div className="card-elevated overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 px-4 py-3">
          <div>
            <div className="text-sm font-bold text-foreground">Recorded cash flow</div>
            <div className="text-[10px] text-muted-foreground">
              {filtered.length} matching records · reporting period and filters applied · currencies
              kept separate
            </div>
          </div>
          <span className="badge badge-primary">
            {currencyRows.length || 0} {currencyRows.length === 1 ? "currency" : "currencies"}
          </span>
        </div>
        {currencyRows.length === 0 ? (
          <div className="px-4 py-5 text-sm text-muted-foreground">
            {payments.length > 0
              ? "No records match this reporting scope. Adjust the period or filters to calculate totals."
              : "Add real finance records to calculate totals."}
          </div>
        ) : (
          <div className="divide-y divide-border/35">
            {currencyRows.map(([currency, row]) => (
              <div
                key={currency}
                className="grid grid-cols-2 gap-2 px-4 py-3 sm:grid-cols-[100px_repeat(5,minmax(0,1fr))] sm:items-center"
              >
                <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
                  <span className="rounded-lg bg-secondary px-2 py-1 font-mono text-xs font-black text-foreground">
                    {currency}
                  </span>
                </div>
                {[
                  { label: "Income", value: row.income, color: "text-success" },
                  { label: "Expenses", value: row.expenses, color: "text-destructive" },
                  {
                    label: "Net",
                    value: row.income - row.expenses,
                    color: row.income - row.expenses >= 0 ? "text-success" : "text-destructive",
                  },
                  { label: "Payable", value: row.payable, color: "text-warning" },
                  { label: "Receivable", value: row.receivable, color: "text-primary" },
                ].map((metric) => (
                  <div key={metric.label} className="rounded-xl bg-secondary/35 px-3 py-2">
                    <div className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                      {metric.label}
                    </div>
                    <div className={`mt-0.5 text-sm font-extrabold ${metric.color}`}>
                      {fmt(metric.value, currency)}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="flex items-center bg-secondary rounded-xl px-3 py-2 gap-2 flex-1 sm:max-w-xs">
          <Search size={14} className="text-muted-foreground" />
          <input
            value={search}
            aria-label="Search finance records"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search records, providers or references…"
            className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full"
          />
        </div>
        <div className="flex items-center gap-1 bg-secondary rounded-xl p-1 overflow-x-auto hide-scrollbar">
          {["all", "income", "expense", "invoice", "subscription"].map((t) => (
            <button
              key={t}
              aria-pressed={filterType === t}
              onClick={() => setFilterType(t)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all whitespace-nowrap ${filterType === t ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t === "all" ? `All` : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Payment status"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="min-h-11 rounded-xl border border-border bg-secondary px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="overdue">Overdue by due date</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          aria-label="Payment currency"
          value={filterCurrency}
          onChange={(event) => setFilterCurrency(event.target.value)}
          className="min-h-11 rounded-xl border border-border bg-secondary px-3 py-2 text-sm"
        >
          <option value="all">All currencies</option>
          {[...new Set(payments.map((p) => p.currency?.trim().toUpperCase()).filter(Boolean))]
            .sort()
            .map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
        </select>
        <span className="text-xs text-muted-foreground">
          {filtered.length} of {payments.length} records
        </span>
      </div>
      {/* Payment List */}
      <div className="space-y-2">
        {filtered.map((payment) => {
          const TypeIcon = typeIcons[payment.type] || ReceiptText;
          const evidenceUrl = ledgerEvidenceUrl(payment.sourceUrl);
          return (
            <div
              key={payment.id}
              className={`card-elevated p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 group ${bulk.bulkMode ? "cursor-pointer" : ""} ${bulk.isSelected(payment.id) ? "ring-1 ring-primary/30 border-primary/50" : ""}`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {bulk.bulkMode && (
                  <label className="inline-flex min-h-11 min-w-11 items-center justify-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={bulk.isSelected(payment.id)}
                      disabled={busy}
                      onChange={() => bulk.toggleSelect(payment.id)}
                      aria-label={`Select ${payment.title}`}
                    />
                  </label>
                )}
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-secondary flex items-center justify-center text-lg flex-shrink-0">
                  <TypeIcon size={19} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={(event) => {
                        event.stopPropagation();
                        openEdit(payment);
                      }}
                      className="text-left text-sm font-semibold text-card-foreground hover:text-primary break-words"
                    >
                      {payment.title}
                    </button>
                    {payment.recurring && (
                      <RefreshCw size={10} className="text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{payment.category}</span>
                    <span className="text-xs text-muted-foreground">
                      {(payment.source || "manual").replaceAll("-", " ")}
                    </span>
                    {evidenceUrl && (
                      <a
                        href={evidenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex min-h-8 items-center gap-1 text-xs text-primary"
                      >
                        Evidence <ExternalLink size={12} />
                      </a>
                    )}
                    {payment.sourceRef && (
                      <span
                        className="max-w-64 truncate text-xs text-muted-foreground"
                        title={payment.sourceRef}
                      >
                        Ref: {payment.sourceRef}
                      </span>
                    )}
                    {payment.linkedProject && (
                      <span className="text-[10px] text-primary hidden sm:inline">
                        • {payment.linkedProject}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3">
                <div className="text-left sm:text-right flex-shrink-0">
                  <div
                    className={`text-sm font-bold ${payment.type === "income" || payment.type === "invoice" ? "text-success" : "text-card-foreground"}`}
                  >
                    {direction(payment) === "in" ? "+" : "-"}
                    {fmt(payment.amount, payment.currency)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {payment.status === "paid"
                      ? `Recorded paid ${payment.paidDate || "— date missing"}`
                      : payment.dueDate
                        ? `Due ${payment.dueDate}`
                        : ""}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span
                    className={`${statusBadge[paymentStatus(payment, today)]} text-[10px] flex-shrink-0`}
                  >
                    {paymentStatus(payment, today)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {payment.evidenceStatus === "confirmed" ? "Marked confirmed" : "Unconfirmed"}
                  </span>
                </div>
                {!bulk.bulkMode && (
                  <div className="flex flex-wrap items-center gap-1">
                    {(payment.status === "pending" || payment.status === "overdue") && (
                      <button
                        disabled={busy}
                        onClick={() => markPaid(payment.id)}
                        className="min-h-11 text-xs text-success hover:underline px-2.5"
                      >
                        Record paid
                      </button>
                    )}
                    <button
                      disabled={busy}
                      onClick={() => duplicatePayment(payment.id)}
                      className="op-icon-button text-muted-foreground hover:text-primary"
                      aria-label={`Duplicate ${payment.title}`}
                    >
                      <Copy size={12} />
                    </button>
                    <button
                      aria-label={`Edit ${payment.title}`}
                      disabled={busy}
                      onClick={() => openEdit(payment)}
                      className="op-icon-button text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      aria-label={`Delete ${payment.title}`}
                      disabled={busy}
                      onClick={() => deletePayment(payment.id)}
                      className="op-icon-button text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <EmptyState
          icon={DollarSign}
          title="No payments found"
          description={
            payments.length
              ? "No records match these filters. Change the search, type, status, currency, period or evidence filter."
              : "Add your first real income, expense, invoice or subscription. Amounts stay separate by currency and confirmation status."
          }
          action={
            payments.length ? (
              <button
                className="btn-secondary text-sm"
                onClick={() => {
                  setSearch("");
                  setFilterType("all");
                  setFilterStatus("all");
                  setFilterCurrency("all");
                  setEvidence("all");
                  setPeriod("all");
                }}
              >
                Clear filters
              </button>
            ) : (
              <button onClick={openAdd} className="btn-primary text-sm">
                <Plus size={13} /> Add payment record
              </button>
            )
          }
        />
      )}

      <ConfirmDialog {...cd.dialogProps} />
      <FormModal
        open={modalOpen}
        onClose={() => {
          if (!lock.current) setModalOpen(false);
        }}
        title={editId ? "Edit Payment" : "Add Payment"}
        onSubmit={saveForm}
        submitLabel={busy ? "Saving…" : "Save record"}
        size="lg"
      >
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <fieldset disabled={busy} className="space-y-4">
          <FormField label="Title *">
            <FormInput
              value={form.title}
              onChange={(v) => uf("title", v)}
              placeholder="Payment description"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Amount">
              <FormInput
                value={String(form.amount)}
                onChange={(v) => uf("amount", parseFloat(v) || 0)}
                type="number"
                placeholder="0.00"
              />
            </FormField>
            <FormField label="Type">
              <FormSelect
                value={form.type}
                onChange={(v) => uf("type", v)}
                options={[
                  { value: "income", label: "💰 Income" },
                  { value: "expense", label: "💸 Expense" },
                  { value: "invoice", label: "📄 Invoice" },
                  { value: "subscription", label: "🔄 Subscription" },
                ]}
              />
            </FormField>
            <FormField label="Status">
              <FormSelect
                value={form.status}
                onChange={(v) =>
                  setForm((f) => ({ ...f, ...paymentStatusPatch(v as Payment["status"], today) }))
                }
                options={[
                  { value: "paid", label: "Paid" },
                  { value: "pending", label: "Pending" },
                  { value: "overdue", label: "Overdue" },
                  { value: "cancelled", label: "Cancelled" },
                ]}
              />
            </FormField>
            <FormField label="Category">
              <FormInput
                value={form.category}
                onChange={(v) => uf("category", v)}
                placeholder="Freelance, Hosting, etc."
              />
            </FormField>
            <FormField label="Due Date">
              <FormInput value={form.dueDate} onChange={(v) => uf("dueDate", v)} type="date" />
            </FormField>
            <FormField label="Paid Date">
              <FormInput value={form.paidDate} onChange={(v) => uf("paidDate", v)} type="date" />
            </FormField>
            <FormField label="From">
              <FormInput value={form.from} onChange={(v) => uf("from", v)} placeholder="Payer" />
            </FormField>
            <FormField label="To">
              <FormInput value={form.to} onChange={(v) => uf("to", v)} placeholder="Payee" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Currency">
              <FormInput
                value={form.currency}
                onChange={(v) => uf("currency", v.trim().toUpperCase())}
                placeholder="EUR"
              />
            </FormField>
            <FormField label="Billing frequency">
              <FormSelect
                value={form.recurringInterval || ""}
                onChange={(v) => setForm((f) => ({ ...f, recurring: !!v, recurringInterval: v }))}
                options={[
                  { value: "", label: "One-time / unknown" },
                  { value: "monthly", label: "Monthly" },
                  { value: "yearly", label: "Yearly" },
                  { value: "weekly", label: "Weekly" },
                ]}
              />
            </FormField>
            <FormField label="Evidence">
              <FormSelect
                value={form.evidenceStatus || "unverified"}
                onChange={(v) => uf("evidenceStatus", v)}
                options={[
                  { value: "unverified", label: "Needs confirmation" },
                  { value: "confirmed", label: "Confirmed with supporting reference" },
                ]}
              />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Record source">
              <FormSelect
                value={form.source || "manual"}
                onChange={(v) => uf("source", v)}
                options={[
                  { value: "manual", label: "Manual entry" },
                  { value: "email-receipt", label: "Email receipt" },
                  { value: "email-invoice", label: "Email invoice" },
                  { value: "stripe", label: "Stripe record" },
                  { value: "bank", label: "Bank record" },
                  { value: "other", label: "Other" },
                ]}
              />
            </FormField>
            <FormField label="Receipt / transaction reference">
              <FormInput
                value={form.sourceRef || ""}
                onChange={(v) => uf("sourceRef", v)}
                placeholder="Reference from the original source"
              />
            </FormField>
          </div>
          <FormField label="Evidence URL (optional)">
            <FormInput
              value={form.sourceUrl || ""}
              onChange={(v) => uf("sourceUrl", v)}
              placeholder="https://…"
            />
          </FormField>
          <p className="text-xs text-muted-foreground">
            Source labels describe the evidence you recorded. They do not establish a live bank or
            Stripe connection.
          </p>
          <FormField label="Linked Project">
            <FormInput
              value={form.linkedProject}
              onChange={(v) => uf("linkedProject", v)}
              placeholder="Project name"
            />
          </FormField>
          <FormField label="Notes">
            <FormTextarea
              value={form.notes}
              onChange={(v) => uf("notes", v)}
              placeholder="Additional notes..."
              rows={2}
            />
          </FormField>
        </fieldset>
      </FormModal>
    </div>
  );
}
