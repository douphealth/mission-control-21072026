import {
  useCredentials,
  useAddItem,
  useUpdateItem,
  useDeleteItem,
  useDuplicateItem,
  useBulkAddItems,
  useBulkPatch,
  useBulkDeleteItems,
} from "@/hooks/useTableData";
import { useMemo, useState, useCallback, useEffect } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  Shield,
  Lock,
  Unlock,
  KeyRound,
  User,
  CheckSquare,
  Rows3,
  LayoutGrid,
  List,
  ChevronsUpDown,
  Upload,
  X,
  FileSpreadsheet,
  WandSparkles,
  CheckCircle2,
} from "lucide-react";
import EmptyState from "@/components/EmptyState";
import FormModal, {
  FormField,
  FormInput,
  FormTextarea,
  FormSelect,
} from "@/components/FormModal";
import type { CredentialVault } from "@/lib/db";
import { toast } from "sonner";
import { encrypt, decryptOrNull } from "@/lib/encryption";
import { useBulkActions } from "@/hooks/useBulkActions";
import BulkActionBar from "@/components/BulkActionBar";
import ConfirmDialog from "@/components/ConfirmDialog";
import { todayISO } from "@/lib/overdue";
import {
  parseCredentialBatch,
  type CredentialDraft,
  type CredentialBatchParseResult,
} from "@/lib/credentialBulk";

const CATEGORIES = [
  "General",
  "Infrastructure",
  "Hosting",
  "Development",
  "Payments",
  "Social",
  "Email",
  "Analytics",
  "AI Tools",
  "Security",
  "Other",
];

const emptyForm: Omit<CredentialVault, "id"> = {
  label: "",
  service: "",
  url: "",
  username: "",
  password: "",
  apiKey: "",
  notes: "",
  category: "General",
  createdAt: todayISO(),
};

const categoryColors: Record<string, string> = {
  Infrastructure: "text-blue-500 bg-blue-500/10",
  Hosting: "text-violet-500 bg-violet-500/10",
  Development: "text-emerald-500 bg-emerald-500/10",
  Payments: "text-amber-500 bg-amber-500/10",
  Social: "text-pink-500 bg-pink-500/10",
  Email: "text-cyan-500 bg-cyan-500/10",
  Analytics: "text-orange-500 bg-orange-500/10",
  "AI Tools": "text-purple-500 bg-purple-500/10",
  Security: "text-red-500 bg-red-500/10",
  General: "text-zinc-500 bg-zinc-500/10",
  Other: "text-zinc-500 bg-zinc-500/10",
};

type SortMode = "label" | "service" | "category" | "newest";
type ViewMode = "cards" | "compact";

async function copyText(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error(`Could not copy ${label.toLowerCase()}`);
  }
}

function loginUrl(url: string) {
  const value = url.trim();
  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function MaskedField({
  value,
  label,
  isVisible,
  onReveal,
  onCopy,
  isMasterLocked,
  decryptedValue,
}: {
  value: string;
  label: string;
  isVisible: boolean;
  onReveal: () => void;
  onCopy: () => void;
  isMasterLocked: boolean;
  decryptedValue?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="w-16 shrink-0 text-[11px] text-muted-foreground">{label}</span>
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <span className="flex-1 truncate font-mono text-[11px] text-foreground">
          {isVisible && !isMasterLocked ? decryptedValue || value : "••••••••"}
        </span>
        <button
          type="button"
          onClick={onReveal}
          className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label={isVisible ? `Hide ${label}` : `Reveal ${label}`}
        >
          {isVisible && !isMasterLocked ? <EyeOff size={12} /> : <Eye size={12} />}
        </button>
        <button
          type="button"
          onClick={onCopy}
          className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label={`Copy ${label}`}
        >
          <Copy size={12} />
        </button>
      </div>
    </div>
  );
}

function BulkAddModal({
  open,
  onClose,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  onImport: (items: CredentialDraft[]) => Promise<void>;
}) {
  const [raw, setRaw] = useState("");
  const [parsed, setParsed] = useState<CredentialBatchParseResult>(() =>
    parseCredentialBatch(""),
  );
  const [categoryOverride, setCategoryOverride] = useState("");
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setParsed(parseCredentialBatch(raw));
  }, [raw, open]);

  const resetAndClose = () => {
    setRaw("");
    setParsed(parseCredentialBatch(""));
    setCategoryOverride("");
    setImporting(false);
    onClose();
  };

  const importNow = async () => {
    if (!parsed.items.length || importing) return;
    setImporting(true);
    try {
      const items = categoryOverride
        ? parsed.items.map((item) => ({ ...item, category: categoryOverride }))
        : parsed.items;
      await onImport(items);
      resetAndClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bulk import failed");
      setImporting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center sm:p-4"
      onClick={resetAndClose}
    >
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" />
      <div
        className="relative flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl bg-card shadow-2xl sm:max-h-[90vh] sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-6">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-primary">
              <Rows3 size={13} />
              Bulk credential intake
            </div>
            <h2 className="mt-1 text-lg font-bold text-foreground">Paste many credentials at once</h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
              Paste from Excel/Sheets, CSV/TSV, JSON, key:value blocks, pipe rows, or your existing
              multi-site hosting credential dump. Passwords and API keys are encrypted before storage.
            </p>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="rounded-xl p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[1.05fr_.95fr]">
          <div className="min-h-0 overflow-y-auto border-b border-border p-4 sm:p-6 lg:border-b-0 lg:border-r">
            <div className="mb-3 flex flex-wrap gap-2">
              {[
                "Spreadsheet paste",
                "CSV / TSV",
                "Key:value blocks",
                "JSON",
                "Hosting dump",
              ].map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-border/60 bg-secondary/40 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground"
                >
                  {label}
                </span>
              ))}
            </div>
            <textarea
              value={raw}
              onChange={(event) => setRaw(event.target.value)}
              autoFocus
              spellCheck={false}
              placeholder={"Label\tService\tURL\tUsername\tPassword\tAPI Key\tCategory\nCloudflare\tCloudflare\tdash.cloudflare.com\tme@example.com\t...\t...\tInfrastructure\n\nOr:\nLabel: GitHub\nUsername: me@example.com\nPassword: ..."}
              className="min-h-[360px] w-full resize-y rounded-2xl border border-border/60 bg-secondary/30 p-4 font-mono text-xs leading-relaxed text-foreground outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
            />
            <div className="mt-3 rounded-2xl border border-border/50 bg-background/50 p-3">
              <p className="text-[11px] font-bold text-foreground">Fastest format</p>
              <p className="mt-1 font-mono text-[10px] leading-relaxed text-muted-foreground">
                Label | Service | URL | Username | Password | API Key | Category | Notes
              </p>
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-foreground">Import preview</p>
                <p className="text-[10px] text-muted-foreground">
                  {parsed.items.length
                    ? `${parsed.items.length} credential${parsed.items.length === 1 ? "" : "s"} detected · ${parsed.format}`
                    : "Paste credentials to preview them here"}
                </p>
              </div>
              {parsed.items.length > 0 && (
                <CheckCircle2 size={18} className="text-emerald-500" />
              )}
            </div>

            <div className="mt-4">
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Optional category override
              </label>
              <select
                value={categoryOverride}
                onChange={(event) => setCategoryOverride(event.target.value)}
                className="w-full rounded-xl border border-border/50 bg-secondary px-3 py-2.5 text-xs text-foreground outline-none"
              >
                <option value="">Keep detected categories</option>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    Set all to {category}
                  </option>
                ))}
              </select>
            </div>

            {parsed.errors.length > 0 && (
              <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3">
                {parsed.errors.slice(0, 5).map((error) => (
                  <p key={error} className="text-[10px] leading-relaxed text-amber-700 dark:text-amber-300">
                    {error}
                  </p>
                ))}
              </div>
            )}

            <div className="mt-4 space-y-2">
              {parsed.items.slice(0, 50).map((item, index) => (
                <div
                  key={`${item.label}-${index}`}
                  className="rounded-2xl border border-border/50 bg-secondary/25 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-foreground">{item.label}</p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {item.service || item.url || item.username || "Credential"}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-primary/8 px-2 py-1 text-[9px] font-bold text-primary">
                      {categoryOverride || item.category}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] text-muted-foreground">
                    {item.username && <span>user ✓</span>}
                    {item.password && <span>password ✓</span>}
                    {item.apiKey && <span>API key ✓</span>}
                    {item.url && <span>URL ✓</span>}
                  </div>
                </div>
              ))}
              {parsed.items.length > 50 && (
                <p className="py-2 text-center text-[10px] text-muted-foreground">
                  + {parsed.items.length - 50} more credentials
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-secondary/15 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <Shield size={12} className="text-emerald-500" />
            Plaintext exists only in this import screen until encrypted for storage.
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={resetAndClose}
              className="rounded-xl bg-secondary px-4 py-2.5 text-xs font-semibold text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void importNow()}
              disabled={!parsed.items.length || importing}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-40"
            >
              <Upload size={13} />
              {importing ? "Encrypting & adding…" : `Add ${parsed.items.length || ""} credentials`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CredentialsPage() {
  const credentials = useCredentials();
  const addItem = useAddItem();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const duplicateItem = useDuplicateItem();
  const bulkAddItems = useBulkAddItems();
  const bulkPatch = useBulkPatch();
  const bulkDeleteItems = useBulkDeleteItems();

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("label");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkAddOpen, setBulkAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<CredentialVault, "id">>(emptyForm);
  const [masterLocked, setMasterLocked] = useState(true);
  const [decryptedCache, setDecryptedCache] = useState<
    Record<string, { password?: string; apiKey?: string }>
  >({});
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false);
  const bulk = useBulkActions<CredentialVault>();

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(credentials.map((credential) => credential.category))).sort()],
    [credentials],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = credentials.filter((credential) => {
      const matchSearch =
        !q ||
        credential.label.toLowerCase().includes(q) ||
        credential.service.toLowerCase().includes(q) ||
        credential.category.toLowerCase().includes(q) ||
        credential.username.toLowerCase().includes(q) ||
        credential.url.toLowerCase().includes(q) ||
        (credential.notes || "").toLowerCase().includes(q) ||
        (credential.tags || []).some((tag) => tag.toLowerCase().includes(q));
      const matchCategory =
        filterCategory === "all" || credential.category === filterCategory;
      return matchSearch && matchCategory;
    });

    return [...result].sort((a, b) => {
      if (sortMode === "newest") return (b.createdAt || "").localeCompare(a.createdAt || "");
      if (sortMode === "service")
        return (a.service || a.label).localeCompare(b.service || b.label);
      if (sortMode === "category")
        return a.category.localeCompare(b.category) || a.label.localeCompare(b.label);
      return a.label.localeCompare(b.label);
    });
  }, [credentials, filterCategory, search, sortMode]);

  const secretCount = useMemo(
    () => credentials.filter((credential) => credential.password || credential.apiKey).length,
    [credentials],
  );

  const lockVault = useCallback(() => {
    setMasterLocked(true);
    setRevealed(new Set());
    setDecryptedCache({});
  }, []);

  const toggleVault = () => {
    if (masterLocked) {
      setMasterLocked(false);
      toast.success("Vault unlocked for this session");
    } else {
      lockVault();
    }
  };

  const ensureDecrypted = async (credential: CredentialVault) => {
    if (decryptedCache[credential.id]) return decryptedCache[credential.id];
    const [password, apiKey] = await Promise.all([
      credential.password ? decryptOrNull(credential.password) : Promise.resolve(""),
      credential.apiKey ? decryptOrNull(credential.apiKey) : Promise.resolve(""),
    ]);
    const values = {
      password: password ?? undefined,
      apiKey: apiKey ?? undefined,
    };
    setDecryptedCache((previous) => ({ ...previous, [credential.id]: values }));
    return values;
  };

  const toggleReveal = async (credential: CredentialVault) => {
    if (masterLocked) {
      toast.error("Unlock the vault first");
      return;
    }
    if (!revealed.has(credential.id)) {
      const values = await ensureDecrypted(credential);
      if (
        (credential.password && values.password === undefined) ||
        (credential.apiKey && values.apiKey === undefined)
      ) {
        toast.error("Some secrets could not be decrypted with this vault key");
      }
    }
    setRevealed((previous) => {
      const next = new Set(previous);
      if (next.has(credential.id)) next.delete(credential.id);
      else next.add(credential.id);
      return next;
    });
  };

  const copySecret = async (
    credential: CredentialVault,
    field: "password" | "apiKey",
    label: string,
  ) => {
    if (masterLocked) {
      toast.error("Unlock the vault first");
      return;
    }
    const values = await ensureDecrypted(credential);
    const decrypted = values[field];
    if (!decrypted) {
      toast.error(`${label} could not be decrypted with this vault key`);
      return;
    }
    await copyText(decrypted, label);
  };

  const openAdd = () => {
    setEditId(null);
    setForm({ ...emptyForm, createdAt: todayISO() });
    setModalOpen(true);
  };

  const openEdit = async (credential: CredentialVault) => {
    setEditId(credential.id);
    const { id, ...rest } = credential;
    const [password, apiKey] = await Promise.all([
      rest.password ? decryptOrNull(rest.password) : Promise.resolve(""),
      rest.apiKey ? decryptOrNull(rest.apiKey) : Promise.resolve(""),
    ]);
    if (password === null || apiKey === null) {
      toast.error(
        "Some secrets could not be decrypted. Those fields will stay unchanged unless replaced.",
      );
    }
    setForm({
      ...rest,
      password: password ?? "",
      apiKey: apiKey ?? "",
    });
    setModalOpen(true);
  };

  const saveForm = async () => {
    if (!form.label.trim()) {
      toast.error("Label is required");
      return;
    }

    try {
      const password = form.password ? await encrypt(form.password) : "";
      const apiKey = form.apiKey ? await encrypt(form.apiKey) : "";
      const encrypted = { ...form, password, apiKey };

      if (editId) {
        await updateItem<CredentialVault>("credentials", editId, encrypted);
        setDecryptedCache((previous) => {
          const next = { ...previous };
          delete next[editId];
          return next;
        });
        toast.success("Credential updated");
      } else {
        await addItem<CredentialVault>("credentials", encrypted);
        toast.success("Credential added");
      }
      setModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Credential encryption failed");
    }
  };

  const importCredentials = async (items: CredentialDraft[]) => {
    const norm = (value: string | undefined) => (value || "").trim().toLowerCase();
    const host = (value: string | undefined) =>
      norm(value).replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];

    const identity = (item: Pick<CredentialVault, "label" | "service" | "url" | "username">) => {
      const urlHost = host(item.url);
      const service = norm(item.service);
      const username = norm(item.username);
      return urlHost || service
        ? `${urlHost}|${service}|${username}`
        : `label|${norm(item.label)}`;
    };

    const existingByIdentity = new Map(
      credentials.map((credential) => [identity(credential), credential] as const),
    );
    const newItems: Omit<CredentialVault, "id">[] = [];
    let enriched = 0;

    for (const item of items) {
      const password = item.password ? await encrypt(item.password) : "";
      const apiKey = item.apiKey ? await encrypt(item.apiKey) : "";
      const encrypted: Omit<CredentialVault, "id"> = { ...item, password, apiKey };
      const existing = existingByIdentity.get(identity(encrypted));

      if (!existing) {
        newItems.push(encrypted);
        continue;
      }

      // Existing records are enriched, never destructively overwritten by a
      // bulk paste. Secrets are filled only when the stored field is empty.
      const changes: Partial<CredentialVault> = {};
      if (!existing.service && encrypted.service) changes.service = encrypted.service;
      if (!existing.url && encrypted.url) changes.url = encrypted.url;
      if (!existing.username && encrypted.username) changes.username = encrypted.username;
      if (!existing.password && encrypted.password) changes.password = encrypted.password;
      if (!existing.apiKey && encrypted.apiKey) changes.apiKey = encrypted.apiKey;
      if ((!existing.notes || existing.notes.length < encrypted.notes.length) && encrypted.notes) {
        changes.notes = existing.notes && !encrypted.notes.includes(existing.notes)
          ? `${existing.notes}\n${encrypted.notes}`
          : encrypted.notes;
      }
      if (
        existing.category === "General" &&
        encrypted.category &&
        encrypted.category !== "General"
      ) {
        changes.category = encrypted.category;
      }
      const mergedTags = Array.from(
        new Set([...(existing.tags || []), ...(encrypted.tags || [])]),
      );
      if (mergedTags.length > (existing.tags || []).length) changes.tags = mergedTags;

      if (Object.keys(changes).length) {
        await updateItem<CredentialVault>("credentials", existing.id, changes);
        enriched++;
      }
    }

    if (newItems.length) await bulkAddItems<CredentialVault>("credentials", newItems);

    toast.success(
      `${items.length} credential${items.length === 1 ? "" : "s"} processed securely`,
      {
        description: [
          newItems.length ? `${newItems.length} added` : "",
          enriched ? `${enriched} existing enriched` : "",
          items.length - newItems.length - enriched > 0
            ? `${items.length - newItems.length - enriched} unchanged`
            : "",
        ]
          .filter(Boolean)
          .join(" · "),
      },
    );
  };

  const confirmDeleteSingle = useCallback(async () => {
    if (!pendingDeleteId) return;
    await deleteItem("credentials", pendingDeleteId);
    toast.success("Credential deleted");
    setPendingDeleteId(null);
  }, [pendingDeleteId, deleteItem]);

  const confirmBulkDelete = useCallback(async () => {
    const ids = [...bulk.selectedIds];
    if (!ids.length) return;
    await bulkDeleteItems("credentials", ids);
    toast.success(`${ids.length} credentials deleted`);
    bulk.clearSelection();
    setPendingBulkDelete(false);
  }, [bulk, bulkDeleteItems]);

  const bulkUpdateCategory = useCallback(
    async (category: string) => {
      const ids = [...bulk.selectedIds];
      if (!ids.length) return;
      await bulkPatch("credentials", ids, { category });
      toast.success(`${ids.length} credentials moved to ${category}`);
      bulk.clearSelection();
    },
    [bulk, bulkPatch],
  );

  const handleDuplicate = async (id: string) => {
    await duplicateItem("credentials", id);
    toast.success("Credential duplicated");
  };

  const uf = <K extends keyof typeof form>(field: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [field]: value }));

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="overflow-hidden rounded-3xl border border-border/50 bg-card shadow-[0_24px_80px_-60px_hsl(var(--foreground)/0.45)]">
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-card to-violet-500/5 p-5 sm:p-6">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.17em] text-primary">
                <KeyRound size={14} />
                Credential workspace
              </div>
              <h1 className="mt-2 text-2xl font-black tracking-[-0.035em] text-foreground sm:text-3xl">
                Find, use, edit or add credentials in seconds.
              </h1>
              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {credentials.length} records · {secretCount} with encrypted secrets · AES-256-GCM
                at rest. Bulk paste from spreadsheets, CSV, JSON or credential dumps.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={toggleVault}
                className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3.5 text-xs font-bold transition ${
                  masterLocked
                    ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/15 dark:text-amber-400"
                    : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15 dark:text-emerald-400"
                }`}
              >
                {masterLocked ? <Lock size={14} /> : <Unlock size={14} />}
                {masterLocked ? "Unlock vault" : "Lock vault"}
              </button>
              <button
                type="button"
                onClick={() => setBulkAddOpen(true)}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-primary/20 bg-primary/8 px-3.5 text-xs font-bold text-primary hover:bg-primary/12"
              >
                <FileSpreadsheet size={14} />
                Bulk add
              </button>
              <button
                type="button"
                onClick={openAdd}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-3.5 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/15"
              >
                <Plus size={14} />
                Add credential
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-2 border-t border-border/40 p-3 sm:grid-cols-3 sm:p-4">
          <div className="rounded-2xl border border-border/40 bg-secondary/20 p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              Find fast
            </p>
            <p className="mt-1 text-xs font-semibold text-foreground">
              Search labels, services, usernames, URLs, notes and tags
            </p>
          </div>
          <div className="rounded-2xl border border-border/40 bg-secondary/20 p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              Use fast
            </p>
            <p className="mt-1 text-xs font-semibold text-foreground">
              Open login, copy username, reveal/copy secret without opening edit
            </p>
          </div>
          <div className="rounded-2xl border border-border/40 bg-secondary/20 p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              Maintain fast
            </p>
            <p className="mt-1 text-xs font-semibold text-foreground">
              Multi-select, recategorize, duplicate or delete in bulk
            </p>
          </div>
        </div>
      </section>

      {bulk.bulkMode && (
        <BulkActionBar
          selectedCount={bulk.selectedCount}
          totalCount={filtered.length}
          onSelectAll={() => bulk.selectAll(filtered)}
          allSelected={bulk.selectedCount === filtered.length && filtered.length > 0}
          onDelete={() => {
            if (bulk.selectedCount) setPendingBulkDelete(true);
          }}
          dropdowns={[
            {
              label: "Move to category…",
              onSelect: bulkUpdateCategory,
              options: CATEGORIES.map((category) => ({ value: category, label: category })),
            },
          ]}
        />
      )}

      <div className="rounded-2xl border border-border/50 bg-card p-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="flex min-h-10 flex-1 items-center gap-2 rounded-xl bg-secondary/60 px-3">
            <Search size={14} className="shrink-0 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search service, username, URL, tag, note…"
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="rounded-lg p-1 text-muted-foreground hover:bg-background"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto">
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              className="min-h-10 rounded-xl border border-border/40 bg-secondary/50 px-3 text-xs font-semibold text-foreground outline-none"
              aria-label="Sort credentials"
            >
              <option value="label">A–Z</option>
              <option value="service">Service</option>
              <option value="category">Category</option>
              <option value="newest">Newest</option>
            </select>

            <div className="flex rounded-xl border border-border/40 bg-secondary/40 p-1">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`rounded-lg p-2 ${viewMode === "cards" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}
                title="Card view"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("compact")}
                className={`rounded-lg p-2 ${viewMode === "compact" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}
                title="Compact view"
              >
                <List size={14} />
              </button>
            </div>

            <button
              type="button"
              onClick={bulk.toggleBulkMode}
              className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-xs font-bold ${
                bulk.bulkMode
                  ? "border-destructive/30 bg-destructive/8 text-destructive"
                  : "border-border/40 bg-secondary/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              <CheckSquare size={14} />
              {bulk.bulkMode ? "Exit bulk" : "Select"}
            </button>
          </div>
        </div>

        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setFilterCategory(category)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                filterCategory === category
                  ? "bg-primary/10 text-primary"
                  : "bg-secondary/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {masterLocked && !bulk.bulkMode && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 sm:p-4">
          <Shield size={16} className="mt-0.5 shrink-0 text-amber-500" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-amber-600 dark:text-amber-400">
              Secrets are hidden
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Unlock only when you need to reveal or copy a password/API key. Usernames and URLs
              remain easy to find without exposing secrets.
            </p>
          </div>
        </div>
      )}

      <div
        className={
          viewMode === "cards"
            ? "grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
            : "space-y-2"
        }
      >
        {filtered.map((credential) => {
          const isRevealed = revealed.has(credential.id);
          const categoryColor =
            categoryColors[credential.category] || categoryColors.General;
          const openUrl = loginUrl(credential.url);

          return (
            <article
              key={credential.id}
              onClick={bulk.bulkMode ? () => bulk.toggleSelect(credential.id) : undefined}
              className={`group rounded-2xl border bg-card transition-all ${
                viewMode === "cards" ? "p-4" : "p-3"
              } ${
                bulk.isSelected(credential.id)
                  ? "border-primary/50 ring-2 ring-primary/10"
                  : "border-border/50 hover:border-primary/20 hover:shadow-md"
              } ${bulk.bulkMode ? "cursor-pointer" : ""}`}
            >
              <div className={viewMode === "compact" ? "flex items-center gap-3" : "space-y-3"}>
                <div className={`flex min-w-0 items-start justify-between gap-3 ${viewMode === "compact" ? "flex-1" : ""}`}>
                  <div className="flex min-w-0 items-center gap-2.5">
                    {bulk.bulkMode && (
                      <div className="shrink-0">
                        {bulk.isSelected(credential.id) ? (
                          <CheckSquare size={16} className="text-primary" />
                        ) : (
                          <div className="h-4 w-4 rounded border border-muted-foreground/30" />
                        )}
                      </div>
                    )}
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${categoryColor}`}>
                      {credential.label.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">{credential.label}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {credential.service || credential.category}
                        {credential.username ? ` · ${credential.username}` : ""}
                      </p>
                    </div>
                  </div>

                  {!bulk.bulkMode && viewMode === "cards" && (
                    <button
                      type="button"
                      onClick={() => void openEdit(credential)}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      title="Edit credential"
                    >
                      <Edit2 size={14} />
                    </button>
                  )}
                </div>

                {viewMode === "cards" && (
                  <>
                    <div className="space-y-1.5 rounded-xl bg-secondary/35 p-3">
                      {credential.username && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex w-16 shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                            <User size={9} /> User
                          </span>
                          <div className="flex min-w-0 flex-1 items-center gap-1">
                            <span className="flex-1 truncate font-mono text-[11px] text-foreground">
                              {credential.username}
                            </span>
                            <button
                              type="button"
                              onClick={() => void copyText(credential.username, "Username")}
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-background hover:text-foreground"
                            >
                              <Copy size={12} />
                            </button>
                          </div>
                        </div>
                      )}
                      {credential.password && (
                        <MaskedField
                          value={credential.password}
                          decryptedValue={decryptedCache[credential.id]?.password}
                          label="Password"
                          isVisible={isRevealed}
                          onReveal={() => void toggleReveal(credential)}
                          onCopy={() => void copySecret(credential, "password", "Password")}
                          isMasterLocked={masterLocked}
                        />
                      )}
                      {credential.apiKey && (
                        <MaskedField
                          value={credential.apiKey}
                          decryptedValue={decryptedCache[credential.id]?.apiKey}
                          label="API key"
                          isVisible={isRevealed}
                          onReveal={() => void toggleReveal(credential)}
                          onCopy={() => void copySecret(credential, "apiKey", "API key")}
                          isMasterLocked={masterLocked}
                        />
                      )}
                    </div>

                    {credential.notes && (
                      <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                        {credential.notes}
                      </p>
                    )}
                  </>
                )}

                {!bulk.bulkMode && (
                  <div className={`flex items-center gap-1.5 ${viewMode === "cards" ? "border-t border-border/30 pt-2" : "shrink-0"}`}>
                    {openUrl && (
                      <a
                        href={openUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-primary/8 px-2.5 text-[10px] font-bold text-primary hover:bg-primary/12"
                        title="Open login"
                      >
                        <ExternalLink size={11} />
                        <span className={viewMode === "compact" ? "hidden sm:inline" : ""}>Open</span>
                      </a>
                    )}
                    {credential.username && (
                      <button
                        type="button"
                        onClick={() => void copyText(credential.username, "Username")}
                        className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-secondary px-2.5 text-[10px] font-bold text-muted-foreground hover:text-foreground"
                        title="Copy username"
                      >
                        <Copy size={11} />
                        <span className={viewMode === "compact" ? "hidden sm:inline" : ""}>User</span>
                      </button>
                    )}
                    {credential.password && (
                      <button
                        type="button"
                        onClick={() => void copySecret(credential, "password", "Password")}
                        className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-secondary px-2.5 text-[10px] font-bold text-muted-foreground hover:text-foreground"
                        title="Copy password"
                      >
                        <KeyRound size={11} />
                        <span className={viewMode === "compact" ? "hidden sm:inline" : ""}>Pass</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void openEdit(credential)}
                      className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-secondary px-2.5 text-[10px] font-bold text-muted-foreground hover:text-foreground"
                      title="Edit"
                    >
                      <Edit2 size={11} />
                      <span className={viewMode === "compact" ? "hidden sm:inline" : ""}>Edit</span>
                    </button>

                    {viewMode === "cards" && (
                      <div className="ml-auto flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => void handleDuplicate(credential.id)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-blue-500/10 hover:text-blue-500"
                          title="Duplicate"
                        >
                          <Copy size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDeleteId(credential.id)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {viewMode === "cards" && (
                <div className="mt-3 flex items-center justify-between">
                  <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${categoryColor}`}>
                    {credential.category}
                  </span>
                  <span className="text-[9px] text-muted-foreground">{credential.createdAt}</span>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <EmptyState
          icon={KeyRound}
          tone="amber"
          title={search || filterCategory !== "all" ? "No credentials match" : "Your vault is empty"}
          description={
            search || filterCategory !== "all"
              ? "Clear the search or category filter."
              : "Add one credential or paste many at once."
          }
          action={
            !search && filterCategory === "all" ? (
              <>
                <button
                  type="button"
                  onClick={openAdd}
                  className="rounded-xl bg-secondary px-4 py-2 text-xs font-bold text-foreground"
                >
                  Add one
                </button>
                <button
                  type="button"
                  onClick={() => setBulkAddOpen(true)}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
                >
                  Bulk add
                </button>
              </>
            ) : undefined
          }
        />
      )}

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Edit Credential" : "Add Credential"}
        onSubmit={saveForm}
        submitLabel={editId ? "Save changes" : "Add credential"}
        size="lg"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Label *">
            <FormInput
              value={form.label}
              onChange={(value) => uf("label", value)}
              placeholder="Cloudflare — Main"
            />
          </FormField>
          <FormField label="Service">
            <FormInput
              value={form.service}
              onChange={(value) => uf("service", value)}
              placeholder="Cloudflare, GitHub, Stripe…"
            />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1.4fr_.6fr]">
          <FormField label="Login URL">
            <FormInput
              value={form.url}
              onChange={(value) => uf("url", value)}
              placeholder="https://login.service.com"
            />
          </FormField>
          <FormField label="Category">
            <FormSelect
              value={form.category}
              onChange={(value) => uf("category", value)}
              options={CATEGORIES.map((category) => ({ value: category, label: category }))}
            />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Username / Email">
            <FormInput
              value={form.username}
              onChange={(value) => uf("username", value)}
              placeholder="admin@example.com"
            />
          </FormField>
          <FormField label="Password">
            <FormInput
              value={form.password}
              onChange={(value) => uf("password", value)}
              type="password"
              placeholder="••••••••"
            />
          </FormField>
        </div>

        <FormField label="API Key / Token">
          <FormInput
            value={form.apiKey}
            onChange={(value) => uf("apiKey", value)}
            type="password"
            placeholder="sk_live_…"
          />
        </FormField>

        <FormField label="Notes">
          <FormTextarea
            value={form.notes}
            onChange={(value) => uf("notes", value)}
            placeholder="2FA details, account context, recovery information…"
            rows={3}
          />
        </FormField>

        <div className="flex items-center gap-2 rounded-xl bg-secondary/50 p-3 text-xs text-muted-foreground">
          <Shield size={12} className="shrink-0 text-emerald-500" />
          Passwords and API keys are encrypted with AES-256-GCM before storage.
        </div>
      </FormModal>

      <BulkAddModal
        open={bulkAddOpen}
        onClose={() => setBulkAddOpen(false)}
        onImport={importCredentials}
      />

      <ConfirmDialog
        open={pendingBulkDelete || pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteId(null);
            setPendingBulkDelete(false);
          }
        }}
        title={
          pendingBulkDelete
            ? `Delete ${bulk.selectedCount} Credential(s)`
            : "Delete Credential"
        }
        description={
          pendingBulkDelete
            ? `This will permanently remove ${bulk.selectedCount} credentials.`
            : "This credential will be permanently removed."
        }
        onConfirm={pendingBulkDelete ? confirmBulkDelete : confirmDeleteSingle}
      />
    </div>
  );
}
