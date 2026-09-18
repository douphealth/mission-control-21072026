import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { T as useCredentials } from "./useTableData-BUruD6H7.mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { Cn as CircleCheck, G as RefreshCw, Ht as Globe, In as Bug, X as Plus, Xn as Activity, _n as Clock, _t as Lock, d as TriangleAlert, h as Trash2, nt as Pen, rn as ExternalLink } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { i as FormSelect, n as FormInput, o as FormTextarea, r as FormModal, t as FormField } from "./FormModal-D0EgfRmB.mjs";
import { n as useConfirmDialog, t as ConfirmDialog } from "./ConfirmDialog-Cy6Yh3O-.mjs";
import { r as probeEndpoint } from "./integrations.functions-BjRj_6uH.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/OpenClawPage-TdX6_7EB.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var STORAGE_KEY = "mc-services";
function loadServices() {
	try {
		const raw = typeof window === "undefined" ? null : localStorage.getItem(STORAGE_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}
var emptyForm = {
	name: "",
	url: "",
	status: "operational",
	category: "API",
	notes: "",
	lastChecked: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
};
function StatusBadge({ status }) {
	const { cls, label } = {
		operational: {
			cls: "badge-success",
			label: "🟢 Operational"
		},
		degraded: {
			cls: "badge-warning",
			label: "🟡 Degraded"
		},
		outage: {
			cls: "badge-destructive",
			label: "🔴 Outage"
		},
		maintenance: {
			cls: "badge-info",
			label: "🔵 Maintenance"
		}
	}[status];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: `badge ${cls}`,
		children: label
	});
}
function OpenClawPage() {
	const credentials = useCredentials();
	const [services, setServices] = (0, import_react.useState)([]);
	const [checking, setChecking] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		setServices(loadServices());
	}, []);
	(0, import_react.useEffect)(() => {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(services));
		} catch {}
	}, [services]);
	const checkAll = async () => {
		const targets = services.filter((s) => s.url);
		if (!targets.length) {
			toast.error("Add a service URL first");
			return;
		}
		setChecking(true);
		try {
			const results = await Promise.all(targets.map(async (s) => ({
				s,
				r: await probeEndpoint({ data: { url: s.url } })
			})));
			setServices((prev) => prev.map((svc) => {
				const hit = results.find((x) => x.s.id === svc.id);
				if (!hit) return svc;
				const status = hit.r.ok ? "operational" : hit.r.status >= 500 || hit.r.status === 0 ? "outage" : "degraded";
				return {
					...svc,
					status,
					lastChecked: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
				};
			}));
			toast.success(`Checked ${results.length} service${results.length === 1 ? "" : "s"}`);
		} catch (e) {
			toast.error(String(e?.message ?? e));
		} finally {
			setChecking(false);
		}
	};
	const [modalOpen, setModalOpen] = (0, import_react.useState)(false);
	const [editId, setEditId] = (0, import_react.useState)(null);
	const [form, setForm] = (0, import_react.useState)(emptyForm);
	const ocCreds = credentials.filter((c) => c.service.toLowerCase().includes("openclaw") || c.label.toLowerCase().includes("openclaw"));
	const operational = services.filter((s) => s.status === "operational").length;
	const issues = services.filter((s) => s.status !== "operational").length;
	const openAdd = () => {
		setEditId(null);
		setForm({
			...emptyForm,
			lastChecked: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
		});
		setModalOpen(true);
	};
	const openEdit = (s) => {
		setEditId(s.id);
		const { id, ...rest } = s;
		setForm(rest);
		setModalOpen(true);
	};
	const save = () => {
		if (!form.name.trim()) {
			toast.error("Name is required");
			return;
		}
		if (editId) {
			setServices((prev) => prev.map((s) => s.id === editId ? {
				...s,
				...form
			} : s));
			toast.success("Service updated");
		} else {
			setServices((prev) => [{
				id: Math.random().toString(36).slice(2),
				...form
			}, ...prev]);
			toast.success("Service added");
		}
		setModalOpen(false);
	};
	const cd = useConfirmDialog();
	const del = (id) => {
		cd.confirm({
			title: "Remove Service",
			description: "This service entry will be permanently removed.",
			onConfirm: () => {
				setServices((prev) => prev.filter((s) => s.id !== id));
				toast.success("Removed");
			}
		});
	};
	const uf = (k, v) => setForm((f) => ({
		...f,
		[k]: v
	}));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4 sm:space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between flex-wrap gap-2 sm:gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "text-xl sm:text-2xl font-bold flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bug, {
						size: 20,
						className: "text-violet-500"
					}), " OpenClaw"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground mt-0.5",
					children: "Track OpenClaw services and API endpoints"
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
							href: "https://openclaw.io",
							target: "_blank",
							rel: "noopener noreferrer",
							className: "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Activity, {
								size: 12,
								className: "animate-pulse"
							}), " System Status"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => void checkAll(),
							disabled: checking,
							className: "btn-secondary text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, {
								size: 13,
								className: checking ? "animate-spin" : ""
							}), " Check now"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: openAdd,
							className: "btn-primary text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 14 }), " Add Service"]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-3 gap-2 sm:gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "card-glass p-4 flex items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, {
								size: 17,
								className: "text-emerald-500"
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xl font-bold",
							children: operational
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs text-muted-foreground",
							children: "Operational"
						})] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "card-glass p-4 flex items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, {
								size: 17,
								className: "text-red-500"
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xl font-bold",
							children: issues
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs text-muted-foreground",
							children: "Issues"
						})] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "card-glass p-4 flex items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Globe, {
								size: 17,
								className: "text-violet-500"
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xl font-bold",
							children: services.length
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs text-muted-foreground",
							children: "Services"
						})] })]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2",
				children: [services.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "card-glass p-8 text-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Globe, {
							size: 22,
							className: "mx-auto mb-2 opacity-40"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-sm font-bold text-foreground",
							children: "No services tracked yet"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mx-auto mt-1 max-w-md text-xs text-muted-foreground",
							children: [
								"Add a service with its URL and press ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Check now" }),
								" — status is measured by a real HTTP request, never assumed."
							]
						})
					]
				}), services.map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "card-elevated p-4 flex items-center gap-4 group",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `w-2.5 h-2.5 rounded-full shrink-0 ${s.status === "operational" ? "bg-emerald-500" : s.status === "degraded" ? "bg-amber-500" : s.status === "outage" ? "bg-red-500" : "bg-blue-500"}` }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex-1 min-w-0",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 flex-wrap",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-semibold text-foreground",
											children: s.name
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { status: s.status }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "badge-muted",
											children: s.category
										})
									]
								}),
								s.url && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
									href: s.url,
									target: "_blank",
									rel: "noopener noreferrer",
									className: "text-[11px] text-primary hover:underline flex items-center gap-1 mt-0.5",
									children: [
										s.url,
										" ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { size: 9 })
									]
								}),
								s.notes && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[11px] text-muted-foreground mt-0.5",
									children: s.notes
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-[10px] text-muted-foreground flex items-center gap-1 shrink-0",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { size: 9 }),
								" ",
								s.lastChecked
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => openEdit(s),
									className: "p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pen, { size: 12 })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => del(s.id),
									className: "p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 12 })
								}),
								s.url && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
									href: s.url,
									target: "_blank",
									rel: "noopener noreferrer",
									className: "p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary transition-colors",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { size: 12 })
								})
							]
						})
					]
				}, s.id))]
			}),
			ocCreds.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
					className: "text-sm font-bold flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, {
						size: 13,
						className: "text-primary"
					}), " Saved Credentials"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid grid-cols-1 sm:grid-cols-2 gap-3",
					children: ocCreds.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "card-glass p-3 space-y-1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-semibold text-sm",
								children: c.label
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs text-muted-foreground",
								children: c.username
							}),
							c.url && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
								href: c.url,
								target: "_blank",
								rel: "noopener noreferrer",
								className: "text-[11px] text-primary hover:underline flex items-center gap-1",
								children: ["Open ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { size: 9 })]
							})
						]
					}, c.id))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(FormModal, {
				open: modalOpen,
				onClose: () => setModalOpen(false),
				title: editId ? "Edit Service" : "Add Service",
				onSubmit: save,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
						label: "Service Name *",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
							value: form.name,
							onChange: (v) => uf("name", v),
							placeholder: "OpenClaw API v2"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
						label: "URL",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
							value: form.url,
							onChange: (v) => uf("url", v),
							placeholder: "https://api.openclaw.io"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
							label: "Status",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormSelect, {
								value: form.status,
								onChange: (v) => uf("status", v),
								options: [
									{
										value: "operational",
										label: "Operational"
									},
									{
										value: "degraded",
										label: "Degraded"
									},
									{
										value: "outage",
										label: "Outage"
									},
									{
										value: "maintenance",
										label: "Maintenance"
									}
								]
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
							label: "Category",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
								value: form.category,
								onChange: (v) => uf("category", v),
								placeholder: "API, Dashboard, etc."
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
						label: "Notes",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormTextarea, {
							value: form.notes,
							onChange: (v) => uf("notes", v),
							rows: 2,
							placeholder: "Additional notes..."
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConfirmDialog, { ...cd.dialogProps })
		]
	});
}
//#endregion
export { OpenClawPage as default };
