import { i as __toESM } from "../_runtime.mjs";
import { i as deduplicateItems } from "./supabase-D3pMiuZg.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { S as useBulkAddItems } from "./useTableData-BUruD6H7.mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { A as Shield, Cn as CircleCheck, Dn as ChevronDown, E as Split, Ft as Image$1, G as RefreshCw, H as RotateCcw, Ln as Brain, On as Check, Tn as ChevronRight, U as Rocket, Wn as ArrowRight, d as TriangleAlert, h as Trash2, i as WandSparkles, jn as Camera, kt as Layers, n as X, on as Download, s as Upload, t as Zap, yn as Clipboard, z as ScanLine } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { C as generateTemplate, S as autonomousImport, _ as aiAutonomousImport, b as TARGET_META$1, g as useIsMobile, v as aiImageImport, w as normalizeItems, x as autoMapFields } from "./routes-qm6I9RAb.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/BulkImportModal-Cg-cPc4F.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var TARGET_GRADIENTS = {
	websites: "from-blue-500 to-cyan-500",
	links: "from-purple-500 to-pink-500",
	tasks: "from-amber-500 to-orange-500",
	repos: "from-green-500 to-emerald-500",
	buildProjects: "from-orange-500 to-red-500",
	credentials: "from-red-500 to-rose-500",
	payments: "from-emerald-500 to-teal-500",
	notes: "from-indigo-500 to-violet-500",
	ideas: "from-yellow-500 to-amber-500",
	habits: "from-cyan-500 to-blue-500"
};
var CONFIDENCE_STYLES = {
	high: {
		bg: "bg-emerald-500/10",
		text: "text-emerald-500",
		border: "border-emerald-500/20",
		label: "High Confidence",
		icon: Shield
	},
	medium: {
		bg: "bg-amber-500/10",
		text: "text-amber-500",
		border: "border-amber-500/20",
		label: "Medium",
		icon: TriangleAlert
	},
	low: {
		bg: "bg-red-500/10",
		text: "text-red-500",
		border: "border-red-500/20",
		label: "Low",
		icon: TriangleAlert
	}
};
function extractDomain(url) {
	try {
		return new URL(url.startsWith("http") ? url : "https://" + url).hostname.replace(/^www\./, "");
	} catch {
		return url;
	}
}
function BulkImportModal({ open, onClose }) {
	const bulkAddItems = useBulkAddItems();
	const isMobile = useIsMobile();
	const [phase, setPhase] = (0, import_react.useState)("input");
	const [rawText, setRawText] = (0, import_react.useState)("");
	const [images, setImages] = (0, import_react.useState)([]);
	const [result, setResult] = (0, import_react.useState)(null);
	const [expandedItems, setExpandedItems] = (0, import_react.useState)(/* @__PURE__ */ new Set());
	const [importCount, setImportCount] = (0, import_react.useState)(0);
	const [importProgress, setImportProgress] = (0, import_react.useState)(0);
	const [skippedDupes, setSkippedDupes] = (0, import_react.useState)(0);
	const [autoClipboardDone, setAutoClipboardDone] = (0, import_react.useState)(false);
	const [removedCategories, setRemovedCategories] = (0, import_react.useState)(/* @__PURE__ */ new Set());
	const fileRef = (0, import_react.useRef)(null);
	const imageRef = (0, import_react.useRef)(null);
	const cameraRef = (0, import_react.useRef)(null);
	const textareaRef = (0, import_react.useRef)(null);
	const reset = (0, import_react.useCallback)(() => {
		setPhase("input");
		setRawText("");
		setImages([]);
		setResult(null);
		setExpandedItems(/* @__PURE__ */ new Set());
		setImportCount(0);
		setImportProgress(0);
		setSkippedDupes(0);
		setAutoClipboardDone(false);
		setRemovedCategories(/* @__PURE__ */ new Set());
	}, []);
	(0, import_react.useEffect)(() => {
		if (!open || autoClipboardDone) return;
		setAutoClipboardDone(true);
		(async () => {
			try {
				const text = await navigator.clipboard.readText();
				if (text && text.trim().length > 5 && text.trim().length < 1e5) {
					setRawText(text);
					toast("📋 Clipboard data detected — hit Analyze to import!", { duration: 3e3 });
				}
			} catch {}
		})();
	}, [open, autoClipboardDone]);
	(0, import_react.useEffect)(() => {
		if (!open) {
			const t = setTimeout(reset, 300);
			return () => clearTimeout(t);
		}
	}, [open, reset]);
	const handleAnalyze = (0, import_react.useCallback)(async (text, fileName) => {
		if (!text.trim()) return;
		setPhase("analyzing");
		await new Promise((r) => setTimeout(r, 100));
		try {
			let importResult;
			try {
				importResult = await aiAutonomousImport(text, fileName);
				if (importResult.totalItems === 0) throw new Error("AI returned no items");
			} catch (aiErr) {
				console.warn("AI import fallback →", aiErr);
				importResult = autonomousImport(text, fileName);
			}
			if (importResult.totalItems === 0 && importResult.parsedData.rows.length === 0) {
				toast.error("Could not detect any importable data. Try another format.");
				setPhase("input");
				return;
			}
			let totalSkipped = 0;
			for (const cat of importResult.categories) {
				const unique = await deduplicateItems(cat.target, cat.items);
				const dupeCount = cat.items.length - unique.length;
				totalSkipped += dupeCount;
				cat.items = unique;
			}
			importResult.categories = importResult.categories.filter((c) => c.items.length > 0);
			importResult.totalItems = importResult.categories.reduce((s, c) => s + c.items.length, 0);
			setSkippedDupes(totalSkipped);
			setResult(importResult);
			if (importResult.totalItems > 0) {
				setPhase("review");
				const catLabels = importResult.categories.map((c) => `${c.items.length} ${c.meta.label}`).join(", ");
				const dupeMsg = totalSkipped > 0 ? ` (${totalSkipped} duplicates filtered)` : "";
				if (importResult.categories.length > 1) toast.success(`Multi-category detected: ${catLabels}${dupeMsg}`);
				else if (importResult.categories[0]?.confidence === "high") toast.success(`Detected ${catLabels} with high confidence!${dupeMsg}`);
				else toast(`Detected ${catLabels}. Verify category below.${dupeMsg}`, { icon: "🔍" });
			} else if (totalSkipped > 0) {
				toast(`All ${totalSkipped} items already exist — nothing new to import.`, { icon: "🔄" });
				setPhase("input");
			} else {
				toast.error("Data was parsed but no valid items could be created.");
				setPhase("input");
			}
		} catch (err) {
			console.error("Import analysis error:", err);
			toast.error("Failed to analyze data. Try a different format.");
			setPhase("input");
		}
	}, []);
	const compressImage = (0, import_react.useCallback)((file) => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onerror = () => reject(/* @__PURE__ */ new Error("Could not read image"));
			reader.onload = () => {
				const img = new Image();
				img.onerror = () => reject(/* @__PURE__ */ new Error("Invalid image"));
				img.onload = () => {
					const scale = Math.min(1, 1800 / Math.max(img.width, img.height));
					const w = Math.round(img.width * scale);
					const h = Math.round(img.height * scale);
					const canvas = document.createElement("canvas");
					canvas.width = w;
					canvas.height = h;
					const ctx = canvas.getContext("2d");
					if (!ctx) {
						resolve(reader.result);
						return;
					}
					ctx.drawImage(img, 0, 0, w, h);
					resolve(canvas.toDataURL("image/jpeg", .9));
				};
				img.src = reader.result;
			};
			reader.readAsDataURL(file);
		});
	}, []);
	const addImages = (0, import_react.useCallback)(async (files) => {
		const imgs = files.filter((f) => f.type.startsWith("image/")).slice(0, 6);
		if (imgs.length === 0) return false;
		try {
			const encoded = await Promise.all(imgs.map(compressImage));
			setImages((prev) => [...prev, ...encoded].slice(0, 6));
			toast.success(`${encoded.length} image${encoded.length > 1 ? "s" : ""} ready — hit "Read Handwriting"`);
		} catch {
			toast.error("Could not process that image.");
		}
		return true;
	}, [compressImage]);
	const handleAnalyzeImages = (0, import_react.useCallback)(async (imgs, note) => {
		if (imgs.length === 0) return;
		setPhase("analyzing");
		try {
			const importResult = await aiImageImport(imgs, void 0, note.trim() || void 0);
			if (importResult.totalItems === 0) {
				toast.error("No readable items found in the image. Try a sharper, well-lit photo.");
				setPhase("input");
				return;
			}
			let totalSkipped = 0;
			for (const cat of importResult.categories) {
				const unique = await deduplicateItems(cat.target, cat.items);
				totalSkipped += cat.items.length - unique.length;
				cat.items = unique;
			}
			importResult.categories = importResult.categories.filter((c) => c.items.length > 0);
			importResult.totalItems = importResult.categories.reduce((s, c) => s + c.items.length, 0);
			setSkippedDupes(totalSkipped);
			setResult(importResult);
			if (importResult.totalItems > 0) {
				setPhase("review");
				const catLabels = importResult.categories.map((c) => `${c.items.length} ${c.meta.label}`).join(", ");
				toast.success(`Handwriting recognised: ${catLabels}${totalSkipped > 0 ? ` (${totalSkipped} duplicates filtered)` : ""}`);
			} else {
				toast(`Everything in that photo already exists.`, { icon: "🔄" });
				setPhase("input");
			}
		} catch (err) {
			console.error("Image import error:", err);
			toast.error(err?.message || "Could not read that image. Try again.");
			setPhase("input");
		}
	}, []);
	const handleFile = (0, import_react.useCallback)((e) => {
		const file = e.target.files?.[0];
		if (!file) return;
		e.target.value = "";
		if (file.type.startsWith("image/")) {
			addImages([file]);
			return;
		}
		const reader = new FileReader();
		reader.onload = (ev) => {
			let text = ev.target?.result;
			if (file.type.startsWith("application/") && !file.type.includes("json") && !file.type.includes("xml")) text = text.replace(/[^\x20-\x7E\u00A0-\uFFFF\n\r\t]/g, " ").replace(/\s{3,}/g, "\n").trim();
			if (text.length < 10) {
				toast.error(`Could not read "${file.name}". Try converting to .txt or .csv.`);
				return;
			}
			setRawText(text);
			handleAnalyze(text, file.name);
		};
		reader.readAsText(file);
	}, [handleAnalyze, addImages]);
	const handlePaste = (0, import_react.useCallback)(async () => {
		try {
			const text = await navigator.clipboard.readText();
			if (!text.trim()) {
				toast.error("Clipboard is empty.");
				return;
			}
			setRawText(text);
			handleAnalyze(text);
		} catch {
			toast.error("Clipboard access denied. Paste manually into the text area.");
		}
	}, [handleAnalyze]);
	const handleRetarget = (0, import_react.useCallback)(async (catIndex, newTarget) => {
		if (!result) return;
		if (!result.categories[catIndex]) return;
		const { parsedData } = result;
		const fieldMap = autoMapFields(parsedData.sourceFields, newTarget);
		const allItems = normalizeItems(parsedData.rows, newTarget, fieldMap);
		const items = await deduplicateItems(newTarget, allItems);
		const updated = { ...result };
		updated.categories = [...result.categories];
		updated.categories[catIndex] = {
			target: newTarget,
			meta: TARGET_META$1[newTarget],
			confidence: items.length > 0 ? "medium" : "low",
			items,
			fieldMap,
			score: 0
		};
		updated.totalItems = updated.categories.reduce((s, c) => s + c.items.length, 0);
		setResult(updated);
	}, [result]);
	const handleRemoveCategory = (0, import_react.useCallback)((catIndex) => {
		if (!result) return;
		const updated = { ...result };
		updated.categories = result.categories.filter((_, i) => i !== catIndex);
		updated.totalItems = updated.categories.reduce((s, c) => s + c.items.length, 0);
		setResult(updated);
	}, [result]);
	const handleImport = (0, import_react.useCallback)(async () => {
		if (!result || result.categories.length === 0) return;
		setPhase("importing");
		let total = 0;
		const totalItems = result.totalItems;
		for (const cat of result.categories) {
			const batchSize = 50;
			for (let i = 0; i < cat.items.length; i += batchSize) {
				const batch = cat.items.slice(i, i + batchSize);
				await bulkAddItems(cat.target, batch);
				total += batch.length;
				setImportProgress(Math.round(total / totalItems * 100));
			}
		}
		setImportCount(total);
		setPhase("done");
		toast.success(`Successfully imported ${total} items!`);
	}, [result, bulkAddItems]);
	const handleExpressImport = (0, import_react.useCallback)(async () => {
		if (!rawText.trim()) return;
		setPhase("analyzing");
		await new Promise((r) => setTimeout(r, 200));
		try {
			let importResult;
			try {
				importResult = await aiAutonomousImport(rawText);
				if (importResult.totalItems === 0) throw new Error("AI returned no items");
			} catch (aiErr) {
				console.warn("AI express fallback →", aiErr);
				importResult = autonomousImport(rawText);
			}
			let totalSkipped = 0;
			for (const cat of importResult.categories) {
				const unique = await deduplicateItems(cat.target, cat.items);
				totalSkipped += cat.items.length - unique.length;
				cat.items = unique;
			}
			importResult.categories = importResult.categories.filter((c) => c.items.length > 0);
			importResult.totalItems = importResult.categories.reduce((s, c) => s + c.items.length, 0);
			setResult(importResult);
			if (importResult.totalItems === 0) {
				toast(totalSkipped > 0 ? "All items already exist." : "No importable data detected.", { icon: "⚠️" });
				setPhase("input");
				return;
			}
			setPhase("importing");
			let total = 0;
			for (const cat of importResult.categories) {
				await bulkAddItems(cat.target, cat.items);
				total += cat.items.length;
			}
			setImportCount(total);
			setImportProgress(100);
			setPhase("done");
			const catLabels = importResult.categories.map((c) => `${c.items.length} ${c.meta.label}`).join(", ");
			toast.success(`⚡ Express imported: ${catLabels}!`);
		} catch (err) {
			console.error("Express import error:", err);
			toast.error("Express import failed. Try standard import.");
			setPhase("input");
		}
	}, [rawText, bulkAddItems]);
	const handleDownloadTemplate = (0, import_react.useCallback)((target) => {
		const csv = generateTemplate(target);
		const blob = new Blob([csv], { type: "text/csv" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${target}-template.csv`;
		a.click();
		URL.revokeObjectURL(url);
		toast.success(`Downloaded ${TARGET_META$1[target].label} template!`);
	}, []);
	const handleTextareaPaste = (0, import_react.useCallback)((e) => {
		const imgFiles = Array.from(e.clipboardData.files || []).filter((f) => f.type.startsWith("image/"));
		if (imgFiles.length > 0) {
			e.preventDefault();
			addImages(imgFiles);
			return;
		}
		const text = e.clipboardData.getData("text");
		if (text && text.trim().length > 10) setTimeout(() => handleAnalyze(text), 100);
	}, [handleAnalyze, addImages]);
	const handleDrop = (0, import_react.useCallback)((e) => {
		e.preventDefault();
		e.stopPropagation();
		const dropped = Array.from(e.dataTransfer.files || []);
		if (dropped.some((f) => f.type.startsWith("image/"))) {
			addImages(dropped);
			return;
		}
		const file = dropped[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (ev) => {
				let text = ev.target?.result;
				if (file.type.startsWith("application/") && !file.type.includes("json") && !file.type.includes("xml")) text = text.replace(/[^\x20-\x7E\u00A0-\uFFFF\n\r\t]/g, " ").replace(/\s{3,}/g, "\n").trim();
				if (text.length < 10) {
					toast.error(`Could not read "${file.name}". Try converting to .txt or .csv.`);
					return;
				}
				setRawText(text);
				handleAnalyze(text, file.name);
			};
			reader.readAsText(file);
			return;
		}
		const text = e.dataTransfer.getData("text");
		if (text) {
			setRawText(text);
			handleAnalyze(text);
		}
	}, [handleAnalyze, addImages]);
	const stats = (0, import_react.useMemo)(() => {
		if (!result) return null;
		return {
			totalParsedRows: result.parsedData.rows.length,
			totalValidItems: result.totalItems,
			detectedFormat: result.parsedData.detectedFormat,
			sourceFields: result.parsedData.sourceFields
		};
	}, [result]);
	result?.categories.filter((_, i) => !removedCategories.has(String(i)));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: open && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4",
		onClick: onClose,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-foreground/20 backdrop-blur-md" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative w-full sm:max-w-4xl bg-card/95 backdrop-blur-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col border border-border/40 overflow-hidden",
			onClick: (e) => e.stopPropagation(),
			onDrop: handleDrop,
			onDragOver: (e) => {
				e.preventDefault();
				e.stopPropagation();
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative px-4 sm:px-6 py-4 sm:py-5 border-b border-border/30",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-transparent pointer-events-none" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative flex items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20",
									children: phase === "done" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, {
										size: 20,
										className: "text-white"
									}) : phase === "analyzing" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Brain, {
										size: 20,
										className: "text-white animate-pulse"
									}) : phase === "review" && (result?.categories.length ?? 0) > 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Split, {
										size: 20,
										className: "text-white"
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WandSparkles, {
										size: 20,
										className: "text-white"
									})
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "text-base sm:text-lg font-bold text-card-foreground",
									children: phase === "input" ? "Smart Import" : phase === "analyzing" ? "Analyzing..." : phase === "review" ? (result?.categories.length ?? 0) > 1 ? "Multi-Category Import" : "Review & Import" : phase === "importing" ? "Importing..." : "Import Complete!"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[10px] sm:text-xs text-muted-foreground",
									children: phase === "input" ? "Paste anything — ultra-smart NLP engine handles the rest" : phase === "analyzing" ? "Running NLP analysis + content-aware detection..." : phase === "review" ? `${result?.totalItems ?? 0} items across ${result?.categories.length ?? 0} ${(result?.categories.length ?? 0) === 1 ? "category" : "categories"}` : phase === "importing" ? `${importProgress}% complete...` : `${importCount} items imported successfully`
								})] })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => {
									reset();
									onClose();
								},
								className: "p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-all",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { size: 18 })
							})]
						}),
						(phase === "analyzing" || phase === "importing") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "absolute bottom-0 left-0 right-0 h-0.5 bg-border/20",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-full bg-gradient-to-r from-primary to-accent" })
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5",
					children: [
						phase === "input" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-start gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-primary/8 via-accent/5 to-primary/3 border border-primary/10",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Brain, {
										size: 20,
										className: "text-primary flex-shrink-0 mt-0.5"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-sm font-semibold text-card-foreground",
										children: "Ultra-Smart NLP Engine v15"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "text-[10px] sm:text-xs text-muted-foreground leading-relaxed",
										children: [
											"Paste ",
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "any data" }),
											" — CSV, JSON, markdown tables, HTML tables, plain text, URL lists, key:value blocks, or even natural language. Auto-detects categories, parses dates like \"tomorrow\" or \"next Monday\", extracts priorities, and splits mixed data into multiple categories."
										]
									})] })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
										ref: textareaRef,
										value: rawText,
										onChange: (e) => setRawText(e.target.value),
										onPaste: handleTextareaPaste,
										placeholder: `Just paste anything here — I'll figure it out:\n\n• "Fix the login bug by tomorrow [high]"\n• CSV/TSV with headers\n• JSON arrays or objects\n• Markdown tables (| col | col |)\n• HTML tables (<table>...)\n• URLs, emails, credentials\n• Key: Value blocks\n• "$500 invoice from Client Alpha due next Friday"\n• Mixed data — I auto-split into categories!`,
										rows: isMobile ? 7 : 10,
										className: "w-full px-4 py-3.5 rounded-2xl bg-secondary/50 text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none placeholder:text-muted-foreground/50 font-mono leading-relaxed border border-border/30",
										autoFocus: !isMobile
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-col sm:flex-row gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											onClick: handlePaste,
											className: "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-all",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clipboard, { size: 14 }), " Paste from Clipboard"]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex-1 flex gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												onClick: () => handleAnalyze(rawText),
												disabled: !rawText.trim(),
												className: "flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-blue-600 text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-primary/25 disabled:opacity-40 disabled:cursor-not-allowed",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Zap, { size: 14 }), " Analyze & Detect"]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												onClick: handleExpressImport,
												disabled: !rawText.trim(),
												title: "Skip review — import directly",
												className: "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-40 disabled:cursor-not-allowed",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Rocket, { size: 14 }),
													" ",
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "hidden sm:inline",
														children: "Express"
													})
												]
											})]
										})]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "rounded-2xl border border-primary/20 bg-primary/5 p-3.5 space-y-3",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-start gap-2.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Camera, {
													size: 15,
													className: "text-white"
												})
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "min-w-0",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "text-xs font-bold text-card-foreground",
													children: "Snap your handwritten notes"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "text-[10px] text-muted-foreground",
													children: "Photograph a to-do list, ideas, credentials or a whiteboard — AI reads the handwriting and files everything automatically."
												})]
											})]
										}),
										images.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "flex gap-2 overflow-x-auto pb-1",
											children: images.map((src, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "relative shrink-0",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
													src,
													alt: `Note photo ${i + 1}`,
													className: "w-20 h-20 object-cover rounded-xl border border-border/40"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													onClick: () => setImages((prev) => prev.filter((_, j) => j !== i)),
													className: "absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center shadow",
													children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { size: 11 })
												})]
											}, i))
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex flex-col sm:flex-row gap-2",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
													onClick: () => cameraRef.current?.click(),
													className: "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-all",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Camera, { size: 14 }), " Take Photo"]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
													onClick: () => imageRef.current?.click(),
													className: "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-all",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Image$1, { size: 14 }), " Choose Image"]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
													onClick: () => handleAnalyzeImages(images, rawText),
													disabled: images.length === 0,
													className: "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-primary/25 disabled:opacity-40 disabled:cursor-not-allowed",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScanLine, { size: 14 }), " Read Handwriting"]
												})
											]
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									onClick: () => fileRef.current?.click(),
									className: "border-2 border-dashed border-border/30 rounded-2xl p-6 text-center cursor-pointer hover:border-primary/30 hover:bg-primary/3 transition-all group",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-center gap-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, {
											size: 20,
											className: "text-muted-foreground group-hover:text-primary transition-colors"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-left",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-xs font-semibold text-card-foreground group-hover:text-primary transition-colors",
												children: "Drop a file or image, or click to upload"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-[10px] text-muted-foreground",
												children: ".csv, .json, .txt, .tsv, .jsonl, .md, .html, .jpg, .png, .heic"
											})]
										})]
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									ref: fileRef,
									type: "file",
									accept: "*/*",
									onChange: handleFile,
									className: "hidden"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									ref: imageRef,
									type: "file",
									accept: "image/*",
									multiple: true,
									onChange: (e) => {
										addImages(Array.from(e.target.files || []));
										e.target.value = "";
									},
									className: "hidden"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									ref: cameraRef,
									type: "file",
									accept: "image/*",
									capture: "environment",
									onChange: (e) => {
										addImages(Array.from(e.target.files || []));
										e.target.value = "";
									},
									className: "hidden"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
									className: "group",
									open: !isMobile,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("summary", {
										className: "text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors flex items-center gap-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, {
											size: 12,
											className: "group-open:rotate-90 transition-transform"
										}), "Quick Examples & Templates"]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mt-2 space-y-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "grid grid-cols-2 sm:grid-cols-4 gap-1.5",
											children: [
												{
													label: "Website + Creds",
													example: "My Blog: https://myblog.com\nWP Admin: https://myblog.com/wp-admin\nUsername: admin\nPassword: pass123\nHosting: SiteGround"
												},
												{
													label: "Smart Tasks",
													example: "- Fix checkout bug by tomorrow [critical]\n- Write blog post about AI (due next Friday)\n- Deploy portfolio redesign @high [in progress]\n- Update SSL certificates [done]\n- Review client feedback by end of week"
												},
												{
													label: "Markdown Table",
													example: "| Name | URL | Status |\n|------|-----|--------|\n| Blog | https://blog.com | active |\n| Shop | https://shop.com | maintenance |"
												},
												{
													label: "Mixed Data",
													example: "- Fix login bug by tomorrow [high]\n$5000 invoice from Client Alpha due March 15\nhttps://docs.google.com\nhttps://github.com/myrepo\n- Buy domain for new project"
												}
											].map((ex) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												onClick: () => {
													setRawText(ex.example);
												},
												className: "text-left p-2.5 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-all border border-border/20 hover:border-primary/15 group/ex",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "text-[10px] sm:text-xs font-semibold text-card-foreground group-hover/ex:text-primary transition-colors",
													children: ex.label
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "text-[9px] text-muted-foreground mt-0.5 truncate font-mono",
													children: ex.example.split("\n")[0]
												})]
											}, ex.label))
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "flex flex-wrap gap-1",
											children: Object.keys(TARGET_META$1).map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												onClick: () => handleDownloadTemplate(t),
												className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-secondary/40 text-[9px] font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { size: 8 }),
													" ",
													TARGET_META$1[t].emoji,
													" ",
													TARGET_META$1[t].label
												]
											}, t))
										})]
									})]
								})
							]
						}),
						phase === "analyzing" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-center py-12 sm:py-16",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-5 shadow-xl shadow-primary/20",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Brain, {
										size: 24,
										className: "text-white"
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "text-lg font-bold text-card-foreground mb-2",
									children: "Analyzing Your Data"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-muted-foreground",
									children: "NLP parsing + content-aware detection across 10 categories..."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "flex justify-center gap-2 mt-5 flex-wrap",
									children: [
										"Parsing",
										"NLP Extract",
										"Scoring",
										"Splitting",
										"Dedup"
									].map((step, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold",
										children: step
									}, step))
								})
							]
						}),
						phase === "review" && result && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-2 sm:grid-cols-4 gap-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "p-2.5 rounded-xl bg-secondary/30 border border-border/20 text-center",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-lg font-extrabold text-card-foreground",
												children: stats?.totalParsedRows ?? 0
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-[9px] text-muted-foreground font-medium",
												children: "Rows Parsed"
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "p-2.5 rounded-xl bg-secondary/30 border border-border/20 text-center",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-lg font-extrabold text-primary",
												children: result.totalItems
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-[9px] text-muted-foreground font-medium",
												children: "Valid Items"
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "p-2.5 rounded-xl bg-secondary/30 border border-border/20 text-center",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-lg font-extrabold text-card-foreground uppercase",
												children: stats?.detectedFormat
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-[9px] text-muted-foreground font-medium",
												children: "Format"
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "p-2.5 rounded-xl bg-secondary/30 border border-border/20 text-center",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-lg font-extrabold text-card-foreground",
												children: result.categories.length
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-[9px] text-muted-foreground font-medium",
												children: result.categories.length === 1 ? "Category" : "Categories"
											})]
										})
									]
								}),
								skippedDupes > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-3 p-3 rounded-xl bg-amber-500/8 border border-amber-500/15",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, {
										size: 14,
										className: "text-amber-500 flex-shrink-0"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "text-xs text-card-foreground",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "font-semibold",
												children: [
													skippedDupes,
													" duplicate",
													skippedDupes > 1 ? "s" : ""
												]
											}),
											" ",
											"filtered out"
										]
									})]
								}),
								result.categories.map((cat, catIdx) => {
									const gradient = TARGET_GRADIENTS[cat.target];
									const confStyle = CONFIDENCE_STYLES[cat.confidence];
									const catKey = `cat-${catIdx}`;
									const isExpanded = expandedItems.has(catKey);
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "rounded-2xl border border-border/30 overflow-hidden bg-secondary/10",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center gap-3 px-4 py-3 border-b border-border/20",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: `w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-sm`,
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "text-sm",
															children: cat.meta.emoji
														})
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "flex-1 min-w-0",
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															className: "flex items-center gap-2",
															children: [
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																	className: "text-sm font-bold text-card-foreground",
																	children: cat.meta.label
																}),
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																	className: `text-[9px] px-1.5 py-0.5 rounded-md ${confStyle.bg} ${confStyle.text} font-semibold`,
																	children: confStyle.label
																}),
																/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
																	className: "text-[10px] text-muted-foreground",
																	children: [cat.items.length, " items"]
																})
															]
														})
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "flex items-center gap-1.5",
														children: [
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
																value: cat.target,
																onChange: (e) => handleRetarget(catIdx, e.target.value),
																className: "text-[10px] px-2 py-1 rounded-lg bg-secondary/50 text-card-foreground border border-border/30 outline-none cursor-pointer",
																children: Object.keys(TARGET_META$1).map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
																	value: t,
																	children: [
																		TARGET_META$1[t].emoji,
																		" ",
																		TARGET_META$1[t].label
																	]
																}, t))
															}),
															result.categories.length > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																onClick: () => handleRemoveCategory(catIdx),
																className: "p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all",
																title: "Remove this category",
																children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 12 })
															}),
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																onClick: () => setExpandedItems((prev) => {
																	const n = new Set(prev);
																	if (n.has(catKey)) n.delete(catKey);
																	else n.add(catKey);
																	return n;
																}),
																className: "p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all",
																children: isExpanded ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { size: 14 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { size: 14 })
															})
														]
													})
												]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "px-3 py-2 space-y-1",
												children: [cat.items.slice(0, isExpanded ? void 0 : 3).map((item, i) => {
													const displayName = item.name || item.title || item.label || item.url || "Untitled";
													const displayUrl = item.url;
													const itemKey = `${catIdx}-${i}`;
													const isItemExpanded = expandedItems.has(itemKey);
													return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "rounded-xl bg-card/40 border border-border/10 overflow-hidden",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															className: "flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-secondary/20 transition-colors",
															onClick: () => setExpandedItems((prev) => {
																const n = new Set(prev);
																if (n.has(itemKey)) n.delete(itemKey);
																else n.add(itemKey);
																return n;
															}),
															children: [
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																	className: "text-[10px] text-muted-foreground/50 font-mono w-5 text-right flex-shrink-0",
																	children: i + 1
																}),
																/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
																	className: "flex-1 min-w-0",
																	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																		className: "text-xs font-medium text-card-foreground truncate block",
																		children: displayName
																	}), displayUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																		className: "text-[9px] text-muted-foreground truncate block",
																		children: extractDomain(displayUrl)
																	})]
																}),
																/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
																	className: "flex gap-1 flex-shrink-0",
																	children: [
																		item.priority && item.priority !== "medium" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																			className: `text-[8px] px-1.5 py-0.5 rounded font-semibold ${item.priority === "critical" ? "bg-red-500/15 text-red-500" : item.priority === "high" ? "bg-orange-500/15 text-orange-500" : "bg-blue-500/15 text-blue-500"}`,
																			children: item.priority
																		}),
																		item.dueDate && item.dueDate !== (/* @__PURE__ */ new Date()).toISOString().split("T")[0] && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																			className: "text-[8px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono",
																			children: item.dueDate
																		}),
																		item.amount > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
																			className: "text-[8px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 font-semibold",
																			children: [item.currency || "$", item.amount]
																		})
																	]
																}),
																isItemExpanded ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, {
																	size: 10,
																	className: "text-muted-foreground/50"
																}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, {
																	size: 10,
																	className: "text-muted-foreground/50"
																})
															]
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: isItemExpanded && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
															className: "overflow-hidden",
															children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
																className: "px-3 pb-2 pt-0.5",
																children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
																	className: "flex flex-wrap gap-1 p-2 rounded-lg bg-secondary/30",
																	children: Object.entries(item).filter(([k, v]) => !k.startsWith("__") && v !== void 0 && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)).map(([key, val]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
																		className: "text-[9px] px-1.5 py-0.5 rounded-md bg-card/60 text-muted-foreground border border-border/10",
																		children: [
																			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
																				className: "font-semibold text-card-foreground",
																				children: [key, ":"]
																			}),
																			" ",
																			Array.isArray(val) ? val.join(", ") : String(val).slice(0, 60)
																		]
																	}, key))
																})
															})
														}) })]
													}, i);
												}), !isExpanded && cat.items.length > 3 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
													onClick: () => setExpandedItems((prev) => new Set(prev).add(catKey)),
													className: "w-full text-center text-[10px] text-primary font-medium py-1.5 hover:bg-primary/5 rounded-lg transition-colors",
													children: [
														"Show all ",
														cat.items.length,
														" items"
													]
												})]
											}),
											cat.fieldMap && Object.keys(cat.fieldMap).length > 0 && isExpanded && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "px-3 pb-3",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "p-2.5 rounded-xl bg-secondary/20 border border-border/15",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "flex items-center gap-1.5 mb-1.5",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Layers, {
															size: 10,
															className: "text-primary"
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "text-[9px] font-semibold text-card-foreground",
															children: "Field Mapping"
														})]
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "flex flex-wrap gap-1",
														children: Object.entries(cat.fieldMap).map(([tf, sf]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															className: "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-secondary/50 text-[8px]",
															children: [
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																	className: "font-mono text-muted-foreground",
																	children: sf
																}),
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, {
																	size: 7,
																	className: "text-primary"
																}),
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																	className: "font-semibold text-card-foreground",
																	children: tf
																})
															]
														}, tf))
													})]
												})
											})
										]
									}, catIdx);
								}),
								stats && stats.sourceFields.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
									className: "group",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("summary", {
										className: "text-[10px] text-muted-foreground font-medium cursor-pointer flex items-center gap-1",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, {
												size: 10,
												className: "group-open:rotate-90 transition-transform"
											}),
											stats.sourceFields.length,
											" source fields detected"
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "flex flex-wrap gap-1 mt-1.5",
										children: stats.sourceFields.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[9px] px-1.5 py-0.5 rounded-md bg-secondary/50 text-muted-foreground font-mono",
											children: f
										}, f))
									})]
								})
							]
						}),
						phase === "importing" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-center py-12 sm:py-16",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-5 relative",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
										className: "w-full h-full -rotate-90",
										viewBox: "0 0 80 80",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
											cx: "40",
											cy: "40",
											r: "36",
											fill: "none",
											stroke: "currentColor",
											strokeWidth: "4",
											className: "text-secondary"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
											cx: "40",
											cy: "40",
											r: "36",
											fill: "none",
											stroke: "currentColor",
											strokeWidth: "4",
											className: "text-primary",
											strokeDasharray: 226,
											strokeDashoffset: 226 - 226 * importProgress / 100,
											strokeLinecap: "round"
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "absolute inset-0 flex items-center justify-center",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-lg font-extrabold text-primary",
											children: [importProgress, "%"]
										})
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "text-lg font-bold text-card-foreground mb-2",
									children: "Importing Items"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-muted-foreground",
									children: "Writing to database..."
								})
							]
						}),
						phase === "done" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-center py-10 sm:py-12",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mb-5 shadow-xl shadow-emerald-500/20",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, {
										size: 32,
										className: "text-white"
									})
								}) }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "text-xl sm:text-2xl font-bold text-card-foreground mb-2",
									children: "All Done! 🎉"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-muted-foreground mb-4",
									children: [
										"Successfully imported ",
										importCount,
										" items"
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "flex flex-wrap justify-center gap-2",
									children: result && result.categories.map((cat) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500",
										children: [
											cat.meta.emoji,
											" ",
											cat.items.length,
											" ",
											cat.meta.label
										]
									}, cat.target))
								})
							]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-t border-border/30 bg-secondary/10",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-[9px] sm:text-xs text-muted-foreground",
						children: [phase === "review" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Change category per section above" }), phase === "input" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "v15 • NLP • Multi-Category • Express" })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [
							phase === "input" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => {
									reset();
									onClose();
								},
								className: "px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all",
								children: "Cancel"
							}),
							phase === "review" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => {
									setPhase("input");
									setResult(null);
								},
								className: "flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { size: 12 }), " Back"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: handleImport,
								disabled: !result || result.totalItems === 0,
								className: "flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-primary to-blue-600 text-primary-foreground hover:opacity-90 transition-all shadow-lg shadow-primary/25 disabled:opacity-40",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Zap, { size: 13 }),
									" Import ",
									result?.totalItems ?? 0,
									" Items"
								]
							})] }),
							phase === "done" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => {
									reset();
									onClose();
								},
								className: "flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:opacity-90 transition-all shadow-lg shadow-emerald-500/25",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { size: 14 }), " Done"]
							})
						]
					})]
				})
			]
		})]
	}) });
}
//#endregion
export { BulkImportModal as default };
