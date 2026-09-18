import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { A as useDuplicateItem, B as useRepos, Z as useUpdateData } from "./useTableData-BUruD6H7.mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { C as Star, L as Search, T as SquareCheckBig, U as Rocket, Wt as GitFork, X as Plus, cn as Database, h as Trash2, mn as CodeXml, nt as Pen, rn as ExternalLink, un as Copy } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as FormTagsInput, i as FormSelect, n as FormInput, o as FormTextarea, r as FormModal, t as FormField } from "./FormModal-D0EgfRmB.mjs";
import { n as useBulkActions, t as BulkActionBar } from "./BulkActionBar-CAKTOtt7.mjs";
import { n as useConfirmDialog, t as ConfirmDialog } from "./ConfirmDialog-Cy6Yh3O-.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/GitHubPage-CYCtZJw9.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var langColors = {
	TypeScript: "bg-blue-500",
	JavaScript: "bg-yellow-400",
	Python: "bg-blue-400",
	PHP: "bg-purple-500",
	HTML: "bg-orange-500",
	Go: "bg-sky-400",
	Rust: "bg-orange-600",
	Ruby: "bg-red-500"
};
var DB_TYPES = [
	{
		value: "",
		label: "None"
	},
	{
		value: "supabase",
		label: "🟢 Supabase"
	},
	{
		value: "firebase",
		label: "🔥 Firebase"
	},
	{
		value: "neon",
		label: "⚡ Neon"
	},
	{
		value: "planetscale",
		label: "🪐 PlanetScale"
	},
	{
		value: "railway",
		label: "🚂 Railway"
	},
	{
		value: "mongodb",
		label: "🍃 MongoDB"
	},
	{
		value: "postgres",
		label: "🐘 PostgreSQL"
	},
	{
		value: "mysql",
		label: "🐬 MySQL"
	},
	{
		value: "other",
		label: "📦 Other"
	}
];
var emptyRepo = {
	name: "",
	url: "",
	description: "",
	language: "TypeScript",
	stars: 0,
	forks: 0,
	status: "active",
	demoUrl: "",
	progress: 0,
	topics: [],
	lastUpdated: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
	devPlatformUrl: "",
	deploymentUrl: "",
	dbType: void 0,
	dbUrl: "",
	dbDashboardUrl: "",
	dbName: "",
	dbNotes: ""
};
function GitHubPage() {
	const repos = useRepos();
	const updateData = useUpdateData();
	const duplicateItem = useDuplicateItem();
	const [search, setSearch] = (0, import_react.useState)("");
	const [modalOpen, setModalOpen] = (0, import_react.useState)(false);
	const [editId, setEditId] = (0, import_react.useState)(null);
	const [form, setForm] = (0, import_react.useState)(emptyRepo);
	const bulk = useBulkActions();
	const cd = useConfirmDialog();
	const filtered = repos.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase()));
	const openAdd = () => {
		setEditId(null);
		setForm(emptyRepo);
		setModalOpen(true);
	};
	const openEdit = (r) => {
		setEditId(r.id);
		const { id, ...rest } = r;
		setForm(rest);
		setModalOpen(true);
	};
	const saveForm = () => {
		if (!form.name.trim()) return;
		if (editId) updateData({ repos: repos.map((r) => r.id === editId ? {
			...r,
			...form
		} : r) });
		else updateData({ repos: [{
			id: Math.random().toString(36).slice(2, 10),
			...form
		}, ...repos] });
		setModalOpen(false);
	};
	const deleteRepo = (id) => {
		cd.confirm({
			title: "Delete Repository",
			description: "This repository entry will be permanently removed.",
			onConfirm: () => {
				updateData({ repos: repos.filter((r) => r.id !== id) });
				toast.success("Repository deleted");
			}
		});
	};
	const duplicateRepo = async (id) => {
		if (await duplicateItem("repos", id)) toast.success("Repo duplicated");
	};
	const uf = (field, val) => setForm((f) => ({
		...f,
		[field]: val
	}));
	const bulkDelete = (0, import_react.useCallback)(() => {
		if (bulk.selectedCount === 0) return;
		cd.confirm({
			title: `Delete ${bulk.selectedCount} Repo(s)`,
			description: `This will permanently remove ${bulk.selectedCount} repositories.`,
			onConfirm: () => {
				updateData({ repos: repos.filter((r) => !bulk.selectedIds.has(r.id)) });
				toast.success(`${bulk.selectedCount} repos deleted`);
				bulk.clearSelection();
			}
		});
	}, [
		bulk,
		repos,
		updateData,
		cd
	]);
	const bulkUpdateStatus = (0, import_react.useCallback)((status) => {
		updateData({ repos: repos.map((r) => bulk.selectedIds.has(r.id) ? {
			...r,
			status
		} : r) });
		toast.success(`${bulk.selectedCount} repos updated`);
		bulk.clearSelection();
	}, [
		bulk,
		repos,
		updateData
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4 sm:space-y-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between flex-wrap gap-2 sm:gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-xl sm:text-2xl font-bold text-foreground",
					children: "GitHub Projects"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-xs sm:text-sm text-muted-foreground mt-0.5",
					children: [repos.length, " repositories"]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: bulk.toggleBulkMode,
						className: `flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-semibold transition-all ${bulk.bulkMode ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-secondary/50 text-muted-foreground hover:text-foreground border border-border/20"}`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareCheckBig, { size: 15 }),
							" ",
							bulk.bulkMode ? "Cancel" : "Bulk"
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: openAdd,
						className: "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition shadow-lg shadow-primary/20",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 16 }), " Add Repo"]
					})]
				})]
			}),
			bulk.bulkMode && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BulkActionBar, {
				selectedCount: bulk.selectedCount,
				totalCount: filtered.length,
				onSelectAll: () => bulk.selectAll(filtered),
				allSelected: bulk.selectedCount === filtered.length && filtered.length > 0,
				onDelete: bulkDelete,
				dropdowns: [{
					label: "Set Status...",
					onSelect: bulkUpdateStatus,
					options: [
						{
							value: "active",
							label: "✅ Active"
						},
						{
							value: "stable",
							label: "🟢 Stable"
						},
						{
							value: "paused",
							label: "⏸️ Paused"
						},
						{
							value: "archived",
							label: "📦 Archived"
						}
					]
				}]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center bg-secondary rounded-xl px-3 py-2 gap-2 w-full sm:max-w-xs",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
					size: 14,
					className: "text-muted-foreground"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: search,
					onChange: (e) => setSearch(e.target.value),
					placeholder: "Search repos...",
					className: "bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4",
				children: filtered.map((repo, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					onClick: bulk.bulkMode ? () => bulk.toggleSelect(repo.id) : void 0,
					className: `card-elevated p-4 sm:p-5 space-y-3 group ${bulk.bulkMode ? "cursor-pointer" : ""} ${bulk.isSelected(repo.id) ? "ring-1 ring-primary/30 border-primary/50" : ""}`,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-start justify-between",
							children: [
								bulk.bulkMode && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mr-2",
									children: bulk.isSelected(repo.id) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareCheckBig, {
										size: 16,
										className: "text-primary"
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-4 h-4 rounded border border-muted-foreground/30" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
									href: repo.url,
									target: "_blank",
									rel: "noopener noreferrer",
									className: "font-semibold text-card-foreground hover:text-primary transition-colors truncate",
									children: repo.name
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: `badge-${repo.status === "active" ? "success" : repo.status === "stable" ? "info" : repo.status === "paused" ? "warning" : "muted"} flex-shrink-0`,
									children: repo.status
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted-foreground line-clamp-2",
							children: repo.description
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-3 text-xs text-muted-foreground",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "flex items-center gap-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `w-2.5 h-2.5 rounded-full ${langColors[repo.language] || "bg-muted-foreground"}` }), repo.language]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "flex items-center gap-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Star, { size: 12 }), repo.stars]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "flex items-center gap-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GitFork, { size: 12 }), repo.forks]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex justify-between text-xs text-muted-foreground mb-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Progress" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [repo.progress, "%"] })]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-1.5 rounded-full bg-secondary overflow-hidden",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "h-full rounded-full bg-primary transition-all",
								style: { width: `${repo.progress}%` }
							})
						})] }),
						repo.topics.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex flex-wrap gap-1",
							children: repo.topics.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[10px] px-1.5 py-0.5 rounded-md bg-secondary text-secondary-foreground",
								children: t
							}, t))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 pt-1 flex-wrap",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
									href: repo.url,
									target: "_blank",
									rel: "noopener noreferrer",
									className: "flex items-center gap-1 text-xs text-primary hover:underline",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { size: 12 }), " Repo"]
								}),
								repo.demoUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
									href: repo.demoUrl,
									target: "_blank",
									rel: "noopener noreferrer",
									className: "flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground",
									children: "🌐 Demo"
								}),
								repo.devPlatformUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
									href: repo.devPlatformUrl,
									target: "_blank",
									rel: "noopener noreferrer",
									className: "flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CodeXml, { size: 12 }), " Platform"]
								}),
								repo.deploymentUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
									href: repo.deploymentUrl,
									target: "_blank",
									rel: "noopener noreferrer",
									className: "flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Rocket, { size: 12 }), " Deploy"]
								}),
								repo.dbType && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "flex items-center gap-1 text-xs text-muted-foreground",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Database, { size: 11 }),
										" ",
										DB_TYPES.find((d) => d.value === repo.dbType)?.label || repo.dbType
									]
								}),
								repo.dbDashboardUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
									href: repo.dbDashboardUrl,
									target: "_blank",
									rel: "noopener noreferrer",
									className: "flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground",
									children: "🔗 DB"
								}),
								!bulk.bulkMode && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "ml-auto flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => duplicateRepo(repo.id),
											className: "text-muted-foreground hover:text-blue-500 p-1.5 rounded-lg hover:bg-secondary transition-colors",
											title: "Duplicate",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { size: 14 })
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => openEdit(repo),
											className: "text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-secondary transition-colors",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pen, { size: 14 })
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => deleteRepo(repo.id),
											className: "text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/10 transition-colors",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 14 })
										})
									]
								})
							]
						})
					]
				}, repo.id))
			}),
			filtered.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "text-center py-16 text-muted-foreground",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-5xl mb-3",
						children: "🐙"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-medium",
						children: "No repositories found"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: openAdd,
						className: "mt-3 text-sm text-primary hover:underline",
						children: "+ Add your first repo"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(FormModal, {
				open: modalOpen,
				onClose: () => setModalOpen(false),
				title: editId ? "Edit Repository" : "Add Repository",
				onSubmit: saveForm,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
						label: "Repo Name *",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
							value: form.name,
							onChange: (v) => uf("name", v),
							placeholder: "my-awesome-repo"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
						label: "GitHub URL",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
							value: form.url,
							onChange: (v) => uf("url", v),
							placeholder: "https://github.com/user/repo"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
						label: "Description",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormTextarea, {
							value: form.description,
							onChange: (v) => uf("description", v),
							placeholder: "What does this repo do?",
							rows: 2
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-3 sm:gap-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
								label: "Language",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormSelect, {
									value: form.language,
									onChange: (v) => uf("language", v),
									options: [
										"TypeScript",
										"JavaScript",
										"Python",
										"PHP",
										"HTML",
										"Go",
										"Rust",
										"Ruby"
									].map((l) => ({
										value: l,
										label: l
									}))
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
								label: "Status",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormSelect, {
									value: form.status,
									onChange: (v) => uf("status", v),
									options: [
										{
											value: "active",
											label: "Active"
										},
										{
											value: "stable",
											label: "Stable"
										},
										{
											value: "paused",
											label: "Paused"
										},
										{
											value: "archived",
											label: "Archived"
										}
									]
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
								label: "Stars",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
									value: String(form.stars),
									onChange: (v) => uf("stars", parseInt(v) || 0),
									type: "number"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
								label: "Progress %",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
									value: String(form.progress),
									onChange: (v) => uf("progress", Math.min(100, parseInt(v) || 0)),
									type: "number"
								})
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
						label: "Demo URL",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
							value: form.demoUrl,
							onChange: (v) => uf("demoUrl", v),
							placeholder: "https://demo.example.com"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
						label: "Dev Platform URL",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
							value: form.devPlatformUrl || "",
							onChange: (v) => uf("devPlatformUrl", v),
							placeholder: "https://bolt.new/..., lovable.dev/..., replit.com/..."
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
						label: "Deployment Gateway URL",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
							value: form.deploymentUrl || "",
							onChange: (v) => uf("deploymentUrl", v),
							placeholder: "https://vercel.com/..., cloudways.com/..., netlify.app/..."
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
						label: "Topics",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormTagsInput, {
							value: form.topics,
							onChange: (v) => uf("topics", v),
							placeholder: "Add topic and press Enter"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "border-t border-border/30 pt-4 mt-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2 mb-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Database, {
									size: 14,
									className: "text-primary"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[11px] font-semibold text-muted-foreground uppercase tracking-wide",
									children: "Database Connection"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-2 gap-3 sm:gap-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
									label: "DB Type",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormSelect, {
										value: form.dbType || "",
										onChange: (v) => uf("dbType", v || void 0),
										options: DB_TYPES
									})
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
									label: "DB Name",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
										value: form.dbName || "",
										onChange: (v) => uf("dbName", v),
										placeholder: "my-project-db"
									})
								})]
							}),
							form.dbType && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
									label: "DB URL / Connection String",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
										value: form.dbUrl || "",
										onChange: (v) => uf("dbUrl", v),
										placeholder: form.dbType === "supabase" ? "https://xxxxx.supabase.co" : "postgresql://..."
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
									label: "DB Dashboard URL",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
										value: form.dbDashboardUrl || "",
										onChange: (v) => uf("dbDashboardUrl", v),
										placeholder: form.dbType === "supabase" ? "https://supabase.com/dashboard/project/xxxxx" : "https://..."
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
									label: "DB Notes",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormTextarea, {
										value: form.dbNotes || "",
										onChange: (v) => uf("dbNotes", v),
										placeholder: "API keys, special config notes...",
										rows: 2
									})
								})
							] })
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConfirmDialog, { ...cd.dialogProps })
		]
	});
}
//#endregion
export { GitHubPage as default };
