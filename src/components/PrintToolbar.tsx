import { useCallback, useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { labelForPrintSection, printOrientationForSection, type PrintOrientation } from "@/lib/printConfig";

const PAGE_STYLE_ID = "mc-active-print-page";
function installPageRules(orientation: "portrait" | "landscape") {
  let style = document.getElementById(PAGE_STYLE_ID) as HTMLStyleElement | null;
  if (!style) { style = document.createElement("style"); style.id = PAGE_STYLE_ID; document.head.appendChild(style); }
  style.textContent = `@page { size: A4 ${orientation}; margin: 13mm 12mm 16mm; }`;
}
export default function PrintToolbar({ section }: { section: string }) {
  const [orientation, setOrientation] = useState<PrintOrientation>("auto");
  const [stamp, setStamp] = useState("");
  const title = labelForPrintSection(section);
  const begin = useCallback(() => {
    if (typeof document === "undefined") return;
    setStamp(new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }));
    installPageRules(orientation === "auto" ? printOrientationForSection(section) : orientation);
  }, [orientation, section]);
  useEffect(() => {
    window.addEventListener("beforeprint", begin);
    return () => window.removeEventListener("beforeprint", begin);
  }, [begin]);
  return <>
    <div className="mc-print-toolbar mc-print-hide" aria-label="Print and export controls">
      <span className="mc-print-toolbar-label">Print current view or save as PDF</span>
      <label>
        <span className="sr-only">Print orientation</span>
        <select aria-label="Print orientation" value={orientation} onChange={event => setOrientation(event.target.value as PrintOrientation)}>
          <option value="auto">Recommended orientation</option>
          <option value="portrait">A4 portrait</option>
          <option value="landscape">A4 landscape</option>
        </select>
      </label>
      <button type="button" onClick={() => { begin(); window.print(); }}>
        <Printer size={16} aria-hidden="true" />Print / Save PDF
      </button>
    </div>
    <header className="mc-print-document-head" aria-label="Printable document header">
      <div className="mc-print-brand">Mission Control / Planning &amp; Operations</div>
      <h1>{title}</h1>
      <p className="mc-print-subtitle">Prepared {stamp || "from this device"} · Current visible filters and available records</p>
    </header>
  </>;
}
export function PrintDocumentFooter({ section }: { section: string }) {
  return <footer className="mc-print-document-footer" aria-label="Printable document footer">
    Mission Control · {labelForPrintSection(section)} · Local report snapshot; verify live data and sync status before relying on metrics
  </footer>;
}
