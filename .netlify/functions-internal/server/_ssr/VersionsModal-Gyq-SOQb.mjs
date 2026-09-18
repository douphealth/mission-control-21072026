import { i as __toESM } from "../_runtime.mjs";
import { p as isSupabaseConnected } from "./supabase-D3pMiuZg.mjs";
import { a as importVersionFile, c as renameVersion, d as saveVersion, f as setDeviceLabel, i as getDeviceLabel, n as deleteVersion, o as listVersions, r as downloadVersionFile, t as SNAPSHOTS_SCHEMA_SQL, u as restoreVersion } from "./versions-CwXqq8sp.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { D as Sparkles, H as RotateCcw, Lt as History, M as ShieldCheck, O as Smartphone, On as Check, Rt as HardDrive, X as Plus, h as Trash2, hn as Cloud, n as X, on as Download, s as Upload, tt as Pencil, yt as LoaderCircle } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/VersionsModal-Gyq-SOQb.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function timeAgo(iso) {
	const diff = Date.now() - new Date(iso).getTime();
	const m = Math.round(diff / 6e4);
	if (m < 1) return "just now";
	if (m < 60) return `${m}m ago`;
	const h = Math.round(m / 60);
	if (h < 24) return `${h}h ago`;
	const d = Math.round(h / 24);
	if (d < 30) return `${d}d ago`;
	return new Date(iso).toLocaleDateString();
}
function fmtSize(n) {
	if (n < 1024) return `${n} B`;
	if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
	return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
function VersionsModal({ open, onClose }) {
	const [versions, setVersions] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [busyId, setBusyId] = (0, import_react.useState)(null);
	const [savingNew, setSavingNew] = (0, import_react.useState)(false);
	const [name, setName] = (0, import_react.useState)("");
	const [renaming, setRenaming] = (0, import_react.useState)(null);
	const [renameVal, setRenameVal] = (0, import_react.useState)("");
	const [device, setDevice] = (0, import_react.useState)(getDeviceLabel());
	const [confirmRestore, setConfirmRestore] = (0, import_react.useState)(null);
	const fileRef = (0, import_react.useRef)(null);
	const cloud = isSupabaseConnected();
	const refresh = async () => {
		setLoading(true);
		try {
			setVersions(await listVersions());
		} catch (e) {
			toast.error(e?.message || "Could not load versions");
		} finally {
			setLoading(false);
		}
	};
	(0, import_react.useEffect)(() => {
		if (open) refresh();
	}, [open]);
	const handleSave = async () => {
		setSavingNew(true);
		try {
			const meta = await saveVersion({
				name,
				type: "manual"
			});
			toast.success(`Saved "${meta.name}"`);
			setName("");
			await refresh();
		} catch (e) {
			toast.error(e?.message || "Save failed");
		} finally {
			setSavingNew(false);
		}
	};
	const handleRestore = async (v) => {
		setBusyId(v.id);
		try {
			const r = await restoreVersion(v.id);
			toast.success(`Restored ${r.restored} items from "${v.name}"`);
			setConfirmRestore(null);
			await refresh();
		} catch (e) {
			toast.error(e?.message || "Restore failed");
		} finally {
			setBusyId(null);
		}
	};
	const handleDelete = async (v) => {
		setBusyId(v.id);
		try {
			await deleteVersion(v.id);
			await refresh();
			toast.success("Deleted");
		} catch (e) {
			toast.error(e?.message || "Delete failed");
		} finally {
			setBusyId(null);
		}
	};
	const handleRename = async (v) => {
		if (!renameVal.trim()) {
			setRenaming(null);
			return;
		}
		try {
			await renameVersion(v.id, renameVal);
			toast.success("Renamed");
		} catch (e) {
			toast.error(e?.message || "Rename failed");
		}
		setRenaming(null);
		await refresh();
	};
	const handleImport = async (file) => {
		try {
			const m = await importVersionFile(file);
			toast.success(`Imported "${m.name}"`);
			await refresh();
		} catch (e) {
			toast.error(e?.message || "Import failed");
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: open && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm",
			onClick: onClose
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "pointer-events-auto w-full max-w-3xl max-h-[90vh] flex flex-col bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3 px-6 py-4 border-b border-border/40",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-[var(--shadow-primary)]",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(History, {
									size: 18,
									className: "text-primary-foreground"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "text-lg font-semibold text-foreground",
									children: "Versions"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-muted-foreground/80",
									children: "Save, restore, and sync versions of all your data — across every device."
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: onClose,
								className: "p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { size: 18 })
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "px-6 py-3 flex flex-wrap items-center gap-3 text-xs border-b border-border/30 bg-secondary/20",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: `flex items-center gap-1.5 ${cloud ? "text-success" : "text-muted-foreground"}`,
							children: [cloud ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cloud, { size: 13 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HardDrive, { size: 13 }), cloud ? "Cloud sync · versions are available on every device" : "Local-only · connect Cloud Sync to share versions across devices"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "ml-auto flex items-center gap-1.5 text-muted-foreground",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Smartphone, { size: 13 }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: device,
								onChange: (e) => {
									setDevice(e.target.value);
									setDeviceLabel(e.target.value);
								},
								className: "bg-transparent border-b border-border/40 focus:border-primary outline-none text-xs px-1 max-w-[140px]",
								title: "This device's name (used to label versions)"
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "px-6 py-4 border-b border-border/30 flex flex-col sm:flex-row gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: name,
								onChange: (e) => setName(e.target.value),
								onKeyDown: (e) => {
									if (e.key === "Enter") handleSave();
								},
								placeholder: "Name this version (optional) — e.g. \"Before reorg\"",
								className: "flex-1 px-3 py-2 rounded-lg bg-background border border-border/50 focus:border-primary outline-none text-sm"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: handleSave,
								disabled: savingNew,
								className: "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium shadow-[var(--shadow-primary)] hover:opacity-95 disabled:opacity-50",
								children: [savingNew ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, {
									size: 14,
									className: "animate-spin"
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 14 }), "Save version"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => fileRef.current?.click(),
								className: "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm",
								title: "Import a .mcversion.json file",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { size: 14 }), " Import"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								ref: fileRef,
								type: "file",
								accept: "application/json,.json",
								hidden: true,
								onChange: (e) => {
									const f = e.target.files?.[0];
									if (f) handleImport(f);
									e.currentTarget.value = "";
								}
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex-1 overflow-auto",
						children: loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "p-12 flex items-center justify-center text-muted-foreground",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "animate-spin" })
						}) : versions.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "p-12 text-center text-muted-foreground text-sm",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "mx-auto mb-3 opacity-50" }),
								"No versions yet. Click ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Save version" }),
								" above — or just keep editing, auto-snapshots run in the background."
							]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "divide-y divide-border/30",
							children: versions.map((v) => {
								const total = Object.values(v.counts || {}).reduce((a, b) => a + b, 0);
								const isRen = renaming === v.id;
								const busy = busyId === v.id;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
									className: "px-6 py-3 hover:bg-secondary/30 group",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-3",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: `w-2 h-2 rounded-full flex-shrink-0 ${v.type === "manual" ? "bg-primary" : v.type === "safety" ? "bg-amber-500" : "bg-muted-foreground/40"}`,
												title: v.type
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex-1 min-w-0",
												children: [isRen ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex items-center gap-1",
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
															autoFocus: true,
															value: renameVal,
															onChange: (e) => setRenameVal(e.target.value),
															onKeyDown: (e) => {
																if (e.key === "Enter") handleRename(v);
																if (e.key === "Escape") setRenaming(null);
															},
															className: "flex-1 px-2 py-1 text-sm bg-background border border-primary rounded outline-none"
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
															onClick: () => handleRename(v),
															className: "p-1 text-success",
															children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { size: 14 })
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
															onClick: () => setRenaming(null),
															className: "p-1 text-muted-foreground",
															children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { size: 14 })
														})
													]
												}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "text-sm font-medium text-foreground truncate",
													children: v.name
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "text-[11px] text-muted-foreground flex flex-wrap gap-x-2 mt-0.5",
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: timeAgo(v.createdAt) }),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "·" }),
														/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [total, " items"] }),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "·" }),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: fmtSize(v.sizeBytes) }),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "·" }),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "truncate",
															children: v.device
														}),
														v.type !== "manual" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "·" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "capitalize",
															children: v.type
														})] })
													]
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														onClick: () => {
															setRenameVal(v.name);
															setRenaming(v.id);
														},
														title: "Rename",
														className: "p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground",
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { size: 13 })
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														onClick: () => downloadVersionFile(v),
														title: "Download",
														className: "p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground",
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { size: 13 })
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														onClick: () => handleDelete(v),
														disabled: busy,
														title: "Delete",
														className: "p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive",
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 13 })
													})
												]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												onClick: () => setConfirmRestore(v),
												disabled: busy,
												className: "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition",
												children: [busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, {
													size: 12,
													className: "animate-spin"
												}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { size: 12 }), "Restore"]
											})
										]
									})
								}, v.id);
							})
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "px-6 py-3 border-t border-border/30 text-[11px] text-muted-foreground flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, {
							size: 13,
							className: "text-success"
						}), "Restoring always creates a \"safety\" version of your current data first — nothing is ever lost."]
					})
				]
			})
		}),
		confirmRestore && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4",
			onClick: () => setConfirmRestore(null),
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl",
				onClick: (e) => e.stopPropagation(),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-base font-semibold mb-2",
						children: "Restore this version?"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm text-muted-foreground mb-4",
						children: [
							"Your current data will be replaced with ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: confirmRestore.name }),
							". A safety version of right-now will be saved automatically, so you can undo this in one click."
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-2 justify-end",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => setConfirmRestore(null),
							className: "px-4 py-2 rounded-lg bg-secondary text-sm",
							children: "Cancel"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => handleRestore(confirmRestore),
							className: "px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { size: 14 }), " Restore"]
						})]
					})
				]
			})
		})
	] }) });
}
//#endregion
export { SNAPSHOTS_SCHEMA_SQL, VersionsModal as default };
