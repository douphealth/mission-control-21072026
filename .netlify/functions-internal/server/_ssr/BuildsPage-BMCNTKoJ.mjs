import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { A as useDuplicateItem, Z as useUpdateData, x as useBuildProjects } from "./useTableData-BUruD6H7.mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { L as Search, T as SquareCheckBig, X as Plus, h as Trash2, nt as Pen, rn as ExternalLink, un as Copy } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as FormTagsInput, i as FormSelect, n as FormInput, o as FormTextarea, r as FormModal, t as FormField } from "./FormModal-D0EgfRmB.mjs";
import { n as useBulkActions, t as BulkActionBar } from "./BulkActionBar-CAKTOtt7.mjs";
import { n as useConfirmDialog, t as ConfirmDialog } from "./ConfirmDialog-Cy6Yh3O-.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/BuildsPage-BMCNTKoJ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var platformStyle = {
	bolt: {
		badge: "bg-blue-500/10 text-blue-500",
		emoji: "⚡",
		label: "Bolt"
	},
	lovable: {
		badge: "bg-purple-500/10 text-purple-500",
		emoji: "💜",
		label: "Lovable"
	},
	replit: {
		badge: "bg-green-500/10 text-green-500",
		emoji: "🟢",
		label: "Replit"
	}
};
var statusOrder = {
	ideation: 0,
	building: 1,
	testing: 2,
	deployed: 3
};
var emptyBuild = {
	name: "",
	platform: "bolt",
	projectUrl: "",
	deployedUrl: "",
	description: "",
	techStack: [],
	status: "ideation",
	startedDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
	lastWorkedOn: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
	nextSteps: "",
	githubRepo: ""
};
function BuildsPage() {
	const buildProjects = useBuildProjects();
	const updateData = useUpdateData();
	const duplicateItem = useDuplicateItem();
	const [search, setSearch] = (0, import_react.useState)("");
	const [filterPlatform, setFilterPlatform] = (0, import_react.useState)("all");
	const [modalOpen, setModalOpen] = (0, import_react.useState)(false);
	const [editId, setEditId] = (0, import_react.useState)(null);
	const [form, setForm] = (0, import_react.useState)(emptyBuild);
	const bulk = useBulkActions();
	const cd = useConfirmDialog();
	const filtered = buildProjects.filter((b) => filterPlatform === "all" || b.platform === filterPlatform).filter((b) => b.name.toLowerCase().includes(search.toLowerCase()));
	const openAdd = () => {
		setEditId(null);
		setForm(emptyBuild);
		setModalOpen(true);
	};
	const openEdit = (b) => {
		setEditId(b.id);
		const { id, ...rest } = b;
		setForm(rest);
		setModalOpen(true);
	};
	const saveForm = () => {
		if (!form.name.trim()) return;
		const now = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
		if (editId) updateData({ buildProjects: buildProjects.map((b) => b.id === editId ? {
			...b,
			...form,
			lastWorkedOn: now
		} : b) });
		else updateData({ buildProjects: [{
			id: Math.random().toString(36).slice(2, 10),
			...form,
			startedDate: now,
			lastWorkedOn: now
		}, ...buildProjects] });
		setModalOpen(false);
	};
	const deleteBuild = (id) => {
		cd.confirm({
			title: "Delete Project",
			description: "This build project will be permanently removed.",
			onConfirm: () => {
				updateData({ buildProjects: buildProjects.filter((b) => b.id !== id) });
				toast.success("Project deleted");
			}
		});
	};
	const duplicateBuild = async (id) => {
		if (await duplicateItem("buildProjects", id, { status: "ideation" })) toast.success("Project duplicated");
	};
	const uf = (field, val) => setForm((f) => ({
		...f,
		[field]: val
	}));
	const bulkDelete = (0, import_react.useCallback)(() => {
		if (bulk.selectedCount === 0) return;
		cd.confirm({
			title: `Delete ${bulk.selectedCount} Project(s)`,
			description: `This will permanently remove ${bulk.selectedCount} build projects.`,
			onConfirm: () => {
				updateData({ buildProjects: buildProjects.filter((b) => !bulk.selectedIds.has(b.id)) });
				toast.success(`${bulk.selectedCount} projects deleted`);
				bulk.clearSelection();
			}
		});
	}, [
		bulk,
		buildProjects,
		updateData,
		cd
	]);
	const bulkUpdateStatus = (0, import_react.useCallback)((status) => {
		const now = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
		updateData({ buildProjects: buildProjects.map((b) => bulk.selectedIds.has(b.id) ? {
			...b,
			status,
			lastWorkedOn: now
		} : b) });
		toast.success(`${bulk.selectedCount} projects updated`);
		bulk.clearSelection();
	}, [
		bulk,
		buildProjects,
		updateData
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4 sm:space-y-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between flex-wrap gap-2 sm:gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-xl sm:text-2xl font-bold text-foreground",
					children: "Build Projects"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-xs sm:text-sm text-muted-foreground mt-0.5",
					children: [buildProjects.length, " projects across platforms"]
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
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 16 }), " New Project"]
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
							value: "ideation",
							label: "💭 Ideation"
						},
						{
							value: "building",
							label: "🔨 Building"
						},
						{
							value: "testing",
							label: "🧪 Testing"
						},
						{
							value: "deployed",
							label: "🚀 Deployed"
						}
					]
				}]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col sm:flex-row items-stretch sm:items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center bg-secondary rounded-xl px-3 py-2 gap-2 flex-1 sm:max-w-xs",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
						size: 14,
						className: "text-muted-foreground"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: search,
						onChange: (e) => setSearch(e.target.value),
						placeholder: "Search projects...",
						className: "bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex items-center gap-1 bg-secondary rounded-xl p-1 overflow-x-auto hide-scrollbar",
					children: [
						"all",
						"bolt",
						"lovable",
						"replit"
					].map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => setFilterPlatform(p),
						className: `px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${filterPlatform === p ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`,
						children: p === "all" ? "All" : `${platformStyle[p]?.emoji} ${platformStyle[p]?.label}`
					}, p))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4",
				children: filtered.map((bp, i) => {
					const ps = platformStyle[bp.platform] || platformStyle.bolt;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						onClick: bulk.bulkMode ? () => bulk.toggleSelect(bp.id) : void 0,
						className: `card-elevated p-4 sm:p-5 space-y-3 group ${bulk.bulkMode ? "cursor-pointer" : ""} ${bulk.isSelected(bp.id) ? "ring-1 ring-primary/30 border-primary/50" : ""}`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-start justify-between",
								children: [
									bulk.bulkMode && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "mr-2",
										children: bulk.isSelected(bp.id) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareCheckBig, {
											size: 16,
											className: "text-primary"
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-4 h-4 rounded border border-muted-foreground/30" })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
										className: "font-semibold text-card-foreground truncate",
										children: bp.name
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: `text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${ps.badge}`,
										children: [
											ps.emoji,
											" ",
											bp.platform
										]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-muted-foreground line-clamp-2",
								children: bp.description
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex items-center gap-1 overflow-x-auto hide-scrollbar",
								children: [
									"ideation",
									"building",
									"testing",
									"deployed"
								].map((s, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-1 flex-shrink-0",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `w-2.5 h-2.5 rounded-full transition-colors ${statusOrder[bp.status] >= idx ? "bg-primary" : "bg-muted"}` }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: `text-[10px] ${statusOrder[bp.status] >= idx ? "text-card-foreground font-medium" : "text-muted-foreground"}`,
											children: s
										}),
										idx < 3 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `w-4 sm:w-5 h-0.5 rounded transition-colors ${statusOrder[bp.status] > idx ? "bg-primary" : "bg-muted"}` })
									]
								}, s))
							}),
							bp.techStack.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex flex-wrap gap-1",
								children: bp.techStack.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[10px] px-1.5 py-0.5 rounded-md bg-secondary text-secondary-foreground",
									children: t
								}, t))
							}),
							bp.nextSteps && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-xs text-muted-foreground/80 italic",
								children: ["💡 Next: ", bp.nextSteps]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex gap-2 pt-1 flex-wrap",
								children: [
									bp.projectUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
										href: bp.projectUrl,
										target: "_blank",
										rel: "noopener noreferrer",
										className: "text-xs text-primary hover:underline flex items-center gap-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { size: 12 }), " Open"]
									}),
									bp.deployedUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
										href: bp.deployedUrl,
										target: "_blank",
										rel: "noopener noreferrer",
										className: "text-xs text-muted-foreground hover:text-foreground",
										children: "🚀 Live"
									}),
									bp.githubRepo && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
										href: bp.githubRepo,
										target: "_blank",
										rel: "noopener noreferrer",
										className: "text-xs text-muted-foreground hover:text-foreground",
										children: "📂 GitHub"
									}),
									!bulk.bulkMode && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "ml-auto flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => duplicateBuild(bp.id),
												className: "text-muted-foreground hover:text-blue-500 p-1.5 rounded-lg hover:bg-secondary transition-colors",
												title: "Duplicate",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { size: 14 })
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => openEdit(bp),
												className: "text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-secondary transition-colors",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pen, { size: 14 })
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => deleteBuild(bp.id),
												className: "text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/10 transition-colors",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 14 })
											})
										]
									})
								]
							})
						]
					}, bp.id);
				})
			}),
			filtered.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "text-center py-16 text-muted-foreground",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-5xl mb-3",
						children: "🛠️"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-medium",
						children: "No build projects found"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: openAdd,
						className: "mt-3 text-sm text-primary hover:underline",
						children: "+ Create your first project"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(FormModal, {
				open: modalOpen,
				onClose: () => setModalOpen(false),
				title: editId ? "Edit Project" : "New Build Project",
				onSubmit: saveForm,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
						label: "Project Name *",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
							value: form.name,
							onChange: (v) => uf("name", v),
							placeholder: "My AI App"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-3 sm:gap-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
							label: "Platform",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormSelect, {
								value: form.platform,
								onChange: (v) => uf("platform", v),
								options: [
									{
										value: "bolt",
										label: "⚡ Bolt"
									},
									{
										value: "lovable",
										label: "💜 Lovable"
									},
									{
										value: "replit",
										label: "🟢 Replit"
									}
								]
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
							label: "Status",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormSelect, {
								value: form.status,
								onChange: (v) => uf("status", v),
								options: [
									{
										value: "ideation",
										label: "Ideation"
									},
									{
										value: "building",
										label: "Building"
									},
									{
										value: "testing",
										label: "Testing"
									},
									{
										value: "deployed",
										label: "Deployed"
									}
								]
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
						label: "Description",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormTextarea, {
							value: form.description,
							onChange: (v) => uf("description", v),
							placeholder: "What does this project do?",
							rows: 2
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
						label: "Project URL",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
							value: form.projectUrl,
							onChange: (v) => uf("projectUrl", v),
							placeholder: "https://bolt.new/..."
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
						label: "Deployed URL",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
							value: form.deployedUrl,
							onChange: (v) => uf("deployedUrl", v),
							placeholder: "https://my-app.vercel.app"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
						label: "GitHub Repo",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
							value: form.githubRepo,
							onChange: (v) => uf("githubRepo", v),
							placeholder: "https://github.com/..."
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
						label: "Tech Stack",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormTagsInput, {
							value: form.techStack,
							onChange: (v) => uf("techStack", v),
							placeholder: "React, Supabase, etc."
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
						label: "Next Steps",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
							value: form.nextSteps,
							onChange: (v) => uf("nextSteps", v),
							placeholder: "What to do next..."
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConfirmDialog, { ...cd.dialogProps })
		]
	});
}
//#endregion
export { BuildsPage as default };
