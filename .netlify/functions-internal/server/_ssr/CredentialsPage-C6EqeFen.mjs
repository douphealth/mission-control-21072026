import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { A as useDuplicateItem, Q as useUpdateItem, T as useCredentials, _ as useAddItem, k as useDeleteItem } from "./useTableData-BUruD6H7.mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { A as Shield, L as Search, Mt as KeyRound, T as SquareCheckBig, X as Plus, _t as Lock, h as Trash2, nn as EyeOff, nt as Pen, o as User, rn as ExternalLink, tn as Eye, un as Copy, vt as LockOpen } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { i as FormSelect, n as FormInput, o as FormTextarea, r as FormModal, t as FormField } from "./FormModal-D0EgfRmB.mjs";
import { n as useBulkActions, t as BulkActionBar } from "./BulkActionBar-CAKTOtt7.mjs";
import { t as ConfirmDialog } from "./ConfirmDialog-Cy6Yh3O-.mjs";
import { n as encrypt, t as decryptOrNull } from "./encryption-BGmZWQtj.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/CredentialsPage-C6EqeFen.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var CATEGORIES = [
	"General",
	"Infrastructure",
	"Hosting",
	"Development",
	"Payments",
	"Social",
	"Email",
	"Analytics",
	"AI Tools",
	"Other"
];
var emptyForm = {
	label: "",
	service: "",
	url: "",
	username: "",
	password: "",
	apiKey: "",
	notes: "",
	category: "General",
	createdAt: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
};
var categoryColors = {
	Infrastructure: "text-blue-500 bg-blue-500/10",
	Hosting: "text-violet-500 bg-violet-500/10",
	Development: "text-emerald-500 bg-emerald-500/10",
	Payments: "text-amber-500 bg-amber-500/10",
	Social: "text-pink-500 bg-pink-500/10",
	Email: "text-cyan-500 bg-cyan-500/10",
	Analytics: "text-orange-500 bg-orange-500/10",
	"AI Tools": "text-purple-500 bg-purple-500/10",
	General: "text-zinc-500 bg-zinc-500/10",
	Other: "text-zinc-500 bg-zinc-500/10"
};
function MaskedField({ value, label, isVisible, onReveal, onCopy, isMasterLocked, decryptedValue }) {
	if (!value) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center justify-between gap-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "text-muted-foreground text-[11px] shrink-0 w-16",
			children: [label, ":"]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-1 flex-1 min-w-0",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-mono text-[11px] text-foreground truncate flex-1",
					children: isVisible && !isMasterLocked ? decryptedValue || value : "••••••••"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: onReveal,
					className: "p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground shrink-0 touch-manipulation",
					children: isVisible && !isMasterLocked ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeOff, { size: 12 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { size: 12 })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: onCopy,
					className: "p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground shrink-0 touch-manipulation",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { size: 12 })
				})
			]
		})]
	});
}
function CredentialsPage() {
	const credentials = useCredentials();
	const addItem = useAddItem();
	const updateItem = useUpdateItem();
	const deleteItem = useDeleteItem();
	const duplicateItem = useDuplicateItem();
	const [search, setSearch] = (0, import_react.useState)("");
	const [filterCategory, setFilterCategory] = (0, import_react.useState)("all");
	const [revealed, setRevealed] = (0, import_react.useState)(/* @__PURE__ */ new Set());
	const [modalOpen, setModalOpen] = (0, import_react.useState)(false);
	const [editId, setEditId] = (0, import_react.useState)(null);
	const [form, setForm] = (0, import_react.useState)(emptyForm);
	const [masterLocked, setMasterLocked] = (0, import_react.useState)(true);
	const [decryptedCache, setDecryptedCache] = (0, import_react.useState)({});
	const [pendingDeleteId, setPendingDeleteId] = (0, import_react.useState)(null);
	const [pendingBulkDelete, setPendingBulkDelete] = (0, import_react.useState)(false);
	const bulk = useBulkActions();
	const categories = ["all", ...Array.from(new Set(credentials.map((c) => c.category))).sort()];
	const filtered = credentials.filter((c) => {
		const q = search.toLowerCase();
		const matchSearch = !q || c.label.toLowerCase().includes(q) || c.service.toLowerCase().includes(q) || c.category.toLowerCase().includes(q) || (c.notes || "").toLowerCase().includes(q);
		const matchCat = filterCategory === "all" || c.category === filterCategory;
		return matchSearch && matchCat;
	});
	const toggleReveal = async (id, credential) => {
		if (masterLocked) {
			toast.error("Unlock the vault first");
			return;
		}
		if (credential && !decryptedCache[id]) {
			const [password, apiKey] = await Promise.all([credential.password ? decryptOrNull(credential.password) : Promise.resolve(""), credential.apiKey ? decryptOrNull(credential.apiKey) : Promise.resolve("")]);
			if (password === null || apiKey === null) toast.error("Some secrets could not be decrypted with this vault key");
			setDecryptedCache((prev) => ({
				...prev,
				[id]: {
					password: password ?? "⚠️ unable to decrypt",
					apiKey: apiKey ?? "⚠️ unable to decrypt"
				}
			}));
		}
		setRevealed((prev) => {
			const n = new Set(prev);
			if (n.has(id)) n.delete(id);
			else {
				n.add(id);
				setTimeout(() => setRevealed((p) => {
					const x = new Set(p);
					x.delete(id);
					return x;
				}), 15e3);
			}
			return n;
		});
	};
	const copySecret = async (rawValue, label) => {
		if (masterLocked) {
			toast.error("Unlock the vault first");
			return;
		}
		const decrypted = await decryptOrNull(rawValue);
		if (decrypted === null) {
			toast.error(`${label} could not be decrypted with this vault key`);
			return;
		}
		navigator.clipboard.writeText(decrypted);
		toast.success(`${label} copied to clipboard`);
	};
	const openAdd = () => {
		setEditId(null);
		setForm({
			...emptyForm,
			createdAt: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
		});
		setModalOpen(true);
	};
	const openEdit = async (c) => {
		setEditId(c.id);
		const { id, ...rest } = c;
		const decPassword = rest.password ? await decryptOrNull(rest.password) : "";
		const decApiKey = rest.apiKey ? await decryptOrNull(rest.apiKey) : "";
		if (decPassword === null || decApiKey === null) toast.error("Some secrets could not be decrypted — editing will not overwrite them unless you change the field");
		setForm({
			...rest,
			password: decPassword ?? "",
			apiKey: decApiKey ?? ""
		});
		setModalOpen(true);
	};
	const saveForm = async () => {
		if (!form.label.trim()) {
			toast.error("Label is required");
			return;
		}
		try {
			const encPassword = form.password ? await encrypt(form.password) : "";
			const encApiKey = form.apiKey ? await encrypt(form.apiKey) : "";
			const encrypted = {
				...form,
				password: encPassword,
				apiKey: encApiKey
			};
			if (editId) {
				await updateItem("credentials", editId, encrypted);
				toast.success("Credential updated");
			} else if (await addItem("credentials", encrypted)) toast.success("Credential added");
			else {
				toast.error("Duplicate credential — already exists");
				return;
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Credential encryption failed");
			return;
		}
		setModalOpen(false);
	};
	const handleDelete = (id) => setPendingDeleteId(id);
	const confirmDeleteSingle = (0, import_react.useCallback)(async () => {
		if (!pendingDeleteId) return;
		await deleteItem("credentials", pendingDeleteId);
		toast.success("Credential deleted");
		setPendingDeleteId(null);
	}, [pendingDeleteId, deleteItem]);
	const handleDuplicate = async (id) => {
		if (await duplicateItem("credentials", id)) toast.success("Credential duplicated");
	};
	const uf = (field, val) => setForm((f) => ({
		...f,
		[field]: val
	}));
	const closeDeleteDialog = (0, import_react.useCallback)(() => {
		setPendingDeleteId(null);
		setPendingBulkDelete(false);
	}, []);
	const bulkDelete = (0, import_react.useCallback)(() => {
		if (bulk.selectedCount === 0) return;
		setPendingBulkDelete(true);
	}, [bulk.selectedCount]);
	const confirmBulkDelete = (0, import_react.useCallback)(async () => {
		for (const id of bulk.selectedIds) await deleteItem("credentials", id);
		toast.success(`${bulk.selectedCount} credentials deleted`);
		bulk.clearSelection();
		closeDeleteDialog();
	}, [
		bulk,
		deleteItem,
		closeDeleteDialog
	]);
	const bulkUpdateCategory = (0, import_react.useCallback)(async (cat) => {
		for (const id of bulk.selectedIds) await updateItem("credentials", id, { category: cat });
		toast.success(`${bulk.selectedCount} credentials updated`);
		bulk.clearSelection();
	}, [bulk, updateItem]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4 sm:space-y-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between flex-wrap gap-2 sm:gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(KeyRound, {
						size: 20,
						className: "text-primary"
					}), " Credential Vault"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-xs sm:text-sm text-muted-foreground mt-0.5",
					children: [credentials.length, " credentials · AES-256-GCM encrypted"]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2 flex-wrap",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => setMasterLocked(!masterLocked),
							className: `flex items-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-xl text-sm font-semibold transition-all ${masterLocked ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"}`,
							children: [masterLocked ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { size: 14 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LockOpen, { size: 14 }), masterLocked ? "Locked" : "Open"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: bulk.toggleBulkMode,
							className: `flex items-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-xl text-sm font-semibold transition-all ${bulk.bulkMode ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-secondary/50 text-muted-foreground hover:text-foreground border border-border/20"}`,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareCheckBig, { size: 14 }),
								" ",
								bulk.bulkMode ? "Cancel" : "Bulk"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: openAdd,
							className: "flex items-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition shadow-lg shadow-primary/20",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 15 }), " Add"]
						})
					]
				})]
			}),
			bulk.bulkMode && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BulkActionBar, {
				selectedCount: bulk.selectedCount,
				totalCount: filtered.length,
				onSelectAll: () => bulk.selectAll(filtered),
				allSelected: bulk.selectedCount === filtered.length && filtered.length > 0,
				onDelete: bulkDelete,
				dropdowns: [{
					label: "Set Category...",
					onSelect: bulkUpdateCategory,
					options: CATEGORIES.map((c) => ({
						value: c,
						label: c
					}))
				}]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: masterLocked && !bulk.bulkMode && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 sm:p-4 flex items-start gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, {
					size: 16,
					className: "text-amber-500 shrink-0 mt-0.5"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex-1 min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-sm font-semibold text-amber-600 dark:text-amber-400",
						children: "Vault is Locked"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-muted-foreground mt-0.5",
						children: [
							"Tap ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Locked" }),
							" to reveal credentials. Auto-hides after 15s."
						]
					})]
				})]
			}) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col sm:flex-row gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center bg-secondary rounded-xl px-3 py-2 gap-2 flex-1 sm:max-w-xs",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
						size: 14,
						className: "text-muted-foreground shrink-0"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: search,
						onChange: (e) => setSearch(e.target.value),
						placeholder: "Search credentials...",
						className: "bg-transparent text-sm outline-none w-full text-foreground placeholder:text-muted-foreground"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex gap-1.5 overflow-x-auto hide-scrollbar",
					children: categories.map((cat) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => setFilterCategory(cat),
						className: `px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all whitespace-nowrap flex-shrink-0 ${filterCategory === cat ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground hover:text-foreground"}`,
						children: cat
					}, cat))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4",
				children: filtered.map((cred, i) => {
					const isRevealed = revealed.has(cred.id);
					const catColor = categoryColors[cred.category] || categoryColors.General;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						onClick: bulk.bulkMode ? () => bulk.toggleSelect(cred.id) : void 0,
						className: `card-elevated p-4 space-y-3 group ${bulk.bulkMode ? "cursor-pointer" : ""} ${bulk.isSelected(cred.id) ? "ring-1 ring-primary/30 border-primary/50" : ""}`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex items-start justify-between gap-2",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2.5 min-w-0",
									children: [
										bulk.bulkMode && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: bulk.isSelected(cred.id) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareCheckBig, {
											size: 16,
											className: "text-primary"
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-4 h-4 rounded border border-muted-foreground/30" }) }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: `w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${catColor}`,
											children: cred.label.charAt(0).toUpperCase()
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "min-w-0",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-sm font-semibold text-foreground truncate",
												children: cred.label
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-xs text-muted-foreground truncate",
												children: cred.service || cred.category
											})]
										})
									]
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "bg-secondary/40 rounded-xl p-3 space-y-1.5",
								children: [
									cred.username && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-muted-foreground text-[11px] shrink-0 w-16 flex items-center gap-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(User, { size: 9 }), " User:"]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-1 flex-1 min-w-0",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-mono text-[11px] text-foreground truncate flex-1",
												children: masterLocked ? "••••••" : cred.username
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => {
													if (masterLocked) {
														toast.error("Unlock vault");
														return;
													}
													navigator.clipboard.writeText(cred.username);
													toast.success("Username copied");
												},
												className: "p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground shrink-0 touch-manipulation",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { size: 12 })
											})]
										})]
									}),
									cred.password && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MaskedField, {
										value: cred.password,
										decryptedValue: decryptedCache[cred.id]?.password,
										label: "Pass",
										isVisible: isRevealed,
										onReveal: () => toggleReveal(cred.id, cred),
										onCopy: () => copySecret(cred.password, "Password"),
										isMasterLocked: masterLocked
									}),
									cred.apiKey && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MaskedField, {
										value: cred.apiKey,
										decryptedValue: decryptedCache[cred.id]?.apiKey,
										label: "API Key",
										isVisible: isRevealed,
										onReveal: () => toggleReveal(cred.id, cred),
										onCopy: () => copySecret(cred.apiKey, "API Key"),
										isMasterLocked: masterLocked
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: `badge text-[10px] ${catColor}`,
									children: cred.category
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[10px] text-muted-foreground",
									children: cred.createdAt
								})]
							}),
							cred.notes && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[11px] text-muted-foreground line-clamp-2",
								children: cred.notes
							}),
							!bulk.bulkMode && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-1 pt-1 border-t border-border/20 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity",
								children: [
									cred.url && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
										href: cred.url.match(/^https?:\/\//) ? cred.url : `https://${cred.url}`,
										target: "_blank",
										rel: "noopener noreferrer",
										className: "p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { size: 13 })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => handleDuplicate(cred.id),
										className: "p-1.5 rounded-lg text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors",
										title: "Duplicate",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { size: 13 })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "ml-auto flex items-center gap-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => openEdit(cred),
											className: "p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pen, { size: 13 })
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => handleDelete(cred.id),
											className: "p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 13 })
										})]
									})
								]
							})
						]
					}, cred.id);
				})
			}),
			filtered.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "text-center py-20 text-muted-foreground",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-6xl mb-4",
						children: "🔐"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-semibold text-base text-foreground",
						children: "No credentials found"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm mt-1",
						children: search ? "Try a different search term" : "Add your first credential to get started"
					}),
					!search && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: openAdd,
						className: "mt-4 flex items-center gap-2 mx-auto px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition shadow-lg shadow-primary/20",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 14 }), " Add Credential"]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(FormModal, {
				open: modalOpen,
				onClose: () => setModalOpen(false),
				title: editId ? "Edit Credential" : "Add Credential",
				onSubmit: saveForm,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
						label: "Label *",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
							value: form.label,
							onChange: (v) => uf("label", v),
							placeholder: "My Service Account"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-3 sm:gap-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
							label: "Service",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
								value: form.service,
								onChange: (v) => uf("service", v),
								placeholder: "Cloudflare, GitHub..."
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
							label: "Category",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormSelect, {
								value: form.category,
								onChange: (v) => uf("category", v),
								options: CATEGORIES.map((c) => ({
									value: c,
									label: c
								}))
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
						label: "URL",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
							value: form.url,
							onChange: (v) => uf("url", v),
							placeholder: "https://login.service.com"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-3 sm:gap-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
							label: "Username / Email",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
								value: form.username,
								onChange: (v) => uf("username", v),
								placeholder: "admin@example.com"
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
							label: "Password",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
								value: form.password,
								onChange: (v) => uf("password", v),
								type: "password",
								placeholder: "••••••••"
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
						label: "API Key / Token",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
							value: form.apiKey,
							onChange: (v) => uf("apiKey", v),
							type: "password",
							placeholder: "sk_live_..."
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
						label: "Notes",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormTextarea, {
							value: form.notes,
							onChange: (v) => uf("notes", v),
							placeholder: "Additional info, 2FA backup codes, etc.",
							rows: 2
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 rounded-xl p-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, {
							size: 12,
							className: "text-emerald-500 shrink-0"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Passwords & API keys are encrypted with AES-256-GCM before storing" })]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConfirmDialog, {
				open: pendingBulkDelete || pendingDeleteId !== null,
				onOpenChange: (open) => {
					if (!open) {
						setPendingDeleteId(null);
						setPendingBulkDelete(false);
					}
				},
				title: pendingBulkDelete ? `Delete ${bulk.selectedCount} Credential(s)` : "Delete Credential",
				description: pendingBulkDelete ? `This will permanently remove ${bulk.selectedCount} credentials.` : "This credential will be permanently removed.",
				onConfirm: pendingBulkDelete ? confirmBulkDelete : confirmDeleteSingle
			})
		]
	});
}
//#endregion
export { CredentialsPage as default };
