import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { A as useDuplicateItem, R as usePayments, Z as useUpdateData } from "./useTableData-BUruD6H7.mjs";
import { v as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { G as RefreshCw, Hn as ArrowUpRight, Jn as ArrowDownRight, L as Search, T as SquareCheckBig, X as Plus, f as TrendingUp, h as Trash2, nt as Pen, un as Copy } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { i as FormSelect, n as FormInput, o as FormTextarea, r as FormModal, t as FormField } from "./FormModal-D0EgfRmB.mjs";
import { n as useBulkActions, t as BulkActionBar } from "./BulkActionBar-CAKTOtt7.mjs";
import { n as useConfirmDialog, t as ConfirmDialog } from "./ConfirmDialog-Cy6Yh3O-.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/PaymentsPage-DLG7ygu3.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var typeIcons = {
	income: "💰",
	expense: "💸",
	invoice: "📄",
	subscription: "🔄"
};
var statusBadge = {
	paid: "badge-success",
	pending: "badge-warning",
	overdue: "badge-destructive",
	cancelled: "badge-muted"
};
var emptyPayment = {
	title: "",
	amount: 0,
	currency: "USD",
	type: "expense",
	status: "pending",
	category: "General",
	from: "",
	to: "",
	dueDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
	paidDate: "",
	recurring: false,
	recurringInterval: "",
	linkedProject: "",
	notes: "",
	createdAt: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
};
function PaymentsPage() {
	const payments = usePayments();
	const updateData = useUpdateData();
	const duplicateItem = useDuplicateItem();
	const [search, setSearch] = (0, import_react.useState)("");
	const [filterType, setFilterType] = (0, import_react.useState)("all");
	const [modalOpen, setModalOpen] = (0, import_react.useState)(false);
	const [editId, setEditId] = (0, import_react.useState)(null);
	const [form, setForm] = (0, import_react.useState)(emptyPayment);
	const bulk = useBulkActions();
	const cd = useConfirmDialog();
	const filtered = payments.filter((p) => filterType === "all" || p.type === filterType).filter((p) => p.title.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase())).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
	const totalIncome = payments.filter((p) => p.type === "income" && p.status === "paid").reduce((s, p) => s + p.amount, 0);
	const totalExpenses = payments.filter((p) => (p.type === "expense" || p.type === "subscription") && p.status === "paid").reduce((s, p) => s + p.amount, 0);
	const pendingAmount = payments.filter((p) => p.status === "pending" || p.status === "overdue").reduce((s, p) => s + p.amount, 0);
	const overdueCount = payments.filter((p) => p.status === "overdue").length;
	const openAdd = () => {
		setEditId(null);
		setForm(emptyPayment);
		setModalOpen(true);
	};
	const openEdit = (p) => {
		setEditId(p.id);
		const { id, ...rest } = p;
		setForm(rest);
		setModalOpen(true);
	};
	const saveForm = () => {
		if (!form.title.trim()) return;
		if (editId) {
			updateData({ payments: payments.map((p) => p.id === editId ? {
				...p,
				...form
			} : p) });
			toast.success("Payment updated");
		} else {
			updateData({ payments: [{
				id: Math.random().toString(36).slice(2, 10),
				...form,
				createdAt: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
			}, ...payments] });
			toast.success("Payment added");
		}
		setModalOpen(false);
	};
	const deletePayment = (id) => {
		cd.confirm({
			title: "Delete Payment",
			description: "This payment record will be permanently removed.",
			onConfirm: () => {
				updateData({ payments: payments.filter((p) => p.id !== id) });
				toast.success("Payment deleted");
			}
		});
	};
	const duplicatePayment = async (id) => {
		if (await duplicateItem("payments", id, {
			status: "pending",
			paidDate: ""
		})) toast.success("Payment duplicated");
	};
	const markPaid = (id) => {
		updateData({ payments: payments.map((p) => p.id === id ? {
			...p,
			status: "paid",
			paidDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
		} : p) });
		toast.success("Marked as paid");
	};
	const uf = (field, val) => setForm((f) => ({
		...f,
		[field]: val
	}));
	const fmt = (n, currency = "USD") => {
		try {
			return new Intl.NumberFormat("en-US", {
				style: "currency",
				currency: currency || "USD"
			}).format(n);
		} catch {
			return new Intl.NumberFormat("en-US", {
				style: "currency",
				currency: "USD"
			}).format(n);
		}
	};
	const bulkDelete = (0, import_react.useCallback)(() => {
		if (bulk.selectedCount === 0) return;
		cd.confirm({
			title: `Delete ${bulk.selectedCount} Payment(s)`,
			description: `This will permanently remove ${bulk.selectedCount} payment records.`,
			onConfirm: () => {
				updateData({ payments: payments.filter((p) => !bulk.selectedIds.has(p.id)) });
				toast.success(`${bulk.selectedCount} payments deleted`);
				bulk.clearSelection();
			}
		});
	}, [
		bulk,
		payments,
		updateData,
		cd
	]);
	const bulkUpdateStatus = (0, import_react.useCallback)((status) => {
		updateData({ payments: payments.map((p) => bulk.selectedIds.has(p.id) ? {
			...p,
			status
		} : p) });
		toast.success(`${bulk.selectedCount} payments updated`);
		bulk.clearSelection();
	}, [
		bulk,
		payments,
		updateData
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4 sm:space-y-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between flex-wrap gap-2 sm:gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-xl sm:text-2xl font-bold text-foreground",
					children: "Payments & Finance"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-xs sm:text-sm text-muted-foreground mt-0.5",
					children: [
						payments.length,
						" records",
						overdueCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-destructive font-medium",
							children: [
								" · ",
								overdueCount,
								" overdue"
							]
						})
					]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: bulk.toggleBulkMode,
						className: `flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-semibold transition-all ${bulk.bulkMode ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-secondary/50 text-muted-foreground hover:text-foreground border border-border/20"}`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareCheckBig, { size: 15 }),
							" ",
							bulk.bulkMode ? "Cancel" : "Bulk"
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: openAdd,
						className: "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition shadow-lg shadow-primary/20",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 16 }), " Add"]
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
							value: "paid",
							label: "✅ Paid"
						},
						{
							value: "pending",
							label: "⏳ Pending"
						},
						{
							value: "overdue",
							label: "🔴 Overdue"
						},
						{
							value: "cancelled",
							label: "❌ Cancelled"
						}
					]
				}]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3",
				children: [
					{
						label: "Total Income",
						value: fmt(totalIncome),
						icon: ArrowUpRight,
						color: "text-success",
						bg: "from-success/15 to-success/5"
					},
					{
						label: "Total Expenses",
						value: fmt(totalExpenses),
						icon: ArrowDownRight,
						color: "text-destructive",
						bg: "from-destructive/15 to-destructive/5"
					},
					{
						label: "Net Profit",
						value: fmt(totalIncome - totalExpenses),
						icon: TrendingUp,
						color: totalIncome - totalExpenses >= 0 ? "text-success" : "text-destructive",
						bg: "from-primary/15 to-primary/5"
					},
					{
						label: "Pending",
						value: fmt(pendingAmount),
						icon: RefreshCw,
						color: "text-warning",
						bg: "from-warning/15 to-warning/5"
					}
				].map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "card-elevated p-4",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: `w-10 h-10 rounded-xl bg-gradient-to-br ${s.bg} flex items-center justify-center`,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(s.icon, {
								size: 18,
								className: s.color
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: `text-xl font-bold ${s.color}`,
							children: s.value
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs text-muted-foreground",
							children: s.label
						})] })]
					})
				}, s.label))
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
						placeholder: "Search payments...",
						className: "bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex items-center gap-1 bg-secondary rounded-xl p-1 overflow-x-auto hide-scrollbar",
					children: [
						"all",
						"income",
						"expense",
						"subscription"
					].map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => setFilterType(t),
						className: `px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all whitespace-nowrap ${filterType === t ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`,
						children: t === "all" ? `All` : `${typeIcons[t]} ${t.charAt(0).toUpperCase() + t.slice(1)}`
					}, t))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "space-y-2",
				children: filtered.map((payment, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					onClick: bulk.bulkMode ? () => bulk.toggleSelect(payment.id) : void 0,
					className: `card-elevated p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 group ${bulk.bulkMode ? "cursor-pointer" : ""} ${bulk.isSelected(payment.id) ? "ring-1 ring-primary/30 border-primary/50" : ""}`,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3 flex-1 min-w-0",
						children: [
							bulk.bulkMode && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex-shrink-0",
								children: bulk.isSelected(payment.id) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareCheckBig, {
									size: 16,
									className: "text-primary"
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-4 h-4 rounded border border-muted-foreground/30" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-secondary flex items-center justify-center text-lg flex-shrink-0",
								children: typeIcons[payment.type]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex-1 min-w-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-sm font-medium text-card-foreground truncate",
										children: payment.title
									}), payment.recurring && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, {
										size: 10,
										className: "text-muted-foreground flex-shrink-0"
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 mt-0.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xs text-muted-foreground",
										children: payment.category
									}), payment.linkedProject && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-[10px] text-primary hidden sm:inline",
										children: ["• ", payment.linkedProject]
									})]
								})]
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between sm:justify-end gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-left sm:text-right flex-shrink-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: `text-sm font-bold ${payment.type === "income" || payment.type === "invoice" ? "text-success" : "text-card-foreground"}`,
									children: [payment.type === "income" || payment.type === "invoice" ? "+" : "-", fmt(payment.amount, payment.currency)]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[10px] text-muted-foreground",
									children: payment.status === "paid" ? `Paid ${payment.paidDate || payment.dueDate || ""}` : payment.dueDate ? `Due ${payment.dueDate}` : ""
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: `${statusBadge[payment.status]} text-[10px] flex-shrink-0`,
								children: payment.status
							}),
							!bulk.bulkMode && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity",
								children: [
									(payment.status === "pending" || payment.status === "overdue") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => markPaid(payment.id),
										className: "text-[11px] text-success hover:underline px-1.5",
										children: "Pay"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => duplicatePayment(payment.id),
										className: "text-muted-foreground hover:text-blue-500 p-1",
										title: "Duplicate",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { size: 12 })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => openEdit(payment),
										className: "text-muted-foreground hover:text-foreground p-1",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pen, { size: 12 })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => deletePayment(payment.id),
										className: "text-muted-foreground hover:text-destructive p-1",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 12 })
									})
								]
							})
						]
					})]
				}, payment.id))
			}),
			filtered.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "text-center py-16 text-muted-foreground",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-5xl mb-3",
						children: "💰"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-medium",
						children: "No payments found"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: openAdd,
						className: "mt-3 text-sm text-primary hover:underline",
						children: "+ Add your first payment"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConfirmDialog, { ...cd.dialogProps }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(FormModal, {
				open: modalOpen,
				onClose: () => setModalOpen(false),
				title: editId ? "Edit Payment" : "Add Payment",
				onSubmit: saveForm,
				size: "lg",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
						label: "Title *",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
							value: form.title,
							onChange: (v) => uf("title", v),
							placeholder: "Payment description"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
								label: "Amount",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
									value: String(form.amount),
									onChange: (v) => uf("amount", parseFloat(v) || 0),
									type: "number",
									placeholder: "0.00"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
								label: "Type",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormSelect, {
									value: form.type,
									onChange: (v) => uf("type", v),
									options: [
										{
											value: "income",
											label: "💰 Income"
										},
										{
											value: "expense",
											label: "💸 Expense"
										},
										{
											value: "invoice",
											label: "📄 Invoice"
										},
										{
											value: "subscription",
											label: "🔄 Subscription"
										}
									]
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
								label: "Status",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormSelect, {
									value: form.status,
									onChange: (v) => uf("status", v),
									options: [
										{
											value: "paid",
											label: "Paid"
										},
										{
											value: "pending",
											label: "Pending"
										},
										{
											value: "overdue",
											label: "Overdue"
										},
										{
											value: "cancelled",
											label: "Cancelled"
										}
									]
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
								label: "Category",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
									value: form.category,
									onChange: (v) => uf("category", v),
									placeholder: "Freelance, Hosting, etc."
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
								label: "Due Date",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
									value: form.dueDate,
									onChange: (v) => uf("dueDate", v),
									type: "date"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
								label: "Paid Date",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
									value: form.paidDate,
									onChange: (v) => uf("paidDate", v),
									type: "date"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
								label: "From",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
									value: form.from,
									onChange: (v) => uf("from", v),
									placeholder: "Payer"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
								label: "To",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
									value: form.to,
									onChange: (v) => uf("to", v),
									placeholder: "Payee"
								})
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
						label: "Linked Project",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormInput, {
							value: form.linkedProject,
							onChange: (v) => uf("linkedProject", v),
							placeholder: "Project name"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
						label: "Notes",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormTextarea, {
							value: form.notes,
							onChange: (v) => uf("notes", v),
							placeholder: "Additional notes...",
							rows: 2
						})
					})
				]
			})
		]
	});
}
//#endregion
export { PaymentsPage as default };
