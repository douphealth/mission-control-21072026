from pathlib import Path
import subprocess

expected = 'fix/bulk-import-formats-20261013'
assert subprocess.check_output(['git', 'branch', '--show-current'], text=True).strip() == expected
subprocess.run(['git', 'merge-base', '--is-ancestor', '7724d871c782711ef5a369e4f22480c05764fb86', 'HEAD'], check=True)

def replace_once(text, old, new):
    assert text.count(old) == 1, f'Expected one source anchor, found {text.count(old)}'
    return text.replace(old, new, 1)

p = Path('src/components/LibraryPage.tsx')
s = p.read_text()
s = 'import BulkIntakeModal from "./BulkIntakeModal";\n' + s
s = replace_once(s, '  const [bulkOpen, setBulkOpen] = useState(false); const [raw, setRaw] = useState("");\n  const [preview, setPreview] = useState<IntakeResult | null>(null);', '  const [bulkOpen, setBulkOpen] = useState(false);\n  const [splitSource, setSplitSource] = useState<Row | null>(null);')
s = replace_once(s, '  const fileRef = useRef<HTMLInputElement>(null);\n', '')
a = s.index('  function importRows()'); b = s.index('  function exportRows()', a)
s = s[:a] + s[b:]
s = replace_once(s, 'onClick={() => { setBulkOpen(true); setMessage(""); }}', 'onClick={() => { setSplitSource(null); setBulkOpen(true); setMessage(""); }}')
a = s.index('      <Dialog open={bulkOpen}'); b = s.index('      <Dialog open={!!usePrompt}', a)
s = s[:a] + '      <BulkIntakeModal mode={mode} open={bulkOpen} onClose={() => setBulkOpen(false)} source={splitSource} onImport={entries => bulkAdd(table, entries as any[])} />\n' + s[b:]
anchor = '            <button className={button} onClick={() => { setEditor({ ...row,'
s = replace_once(s, anchor, '            {mode === "prompts" && <button className={button} onClick={() => { setSplitSource(row); setBulkOpen(true); }}>Split entry</button>}\n' + anchor)
s = s.replace('parseLibraryIntake, ', '').replace('LIBRARY_TEXT_LIMIT, ', '').replace(', type IntakeResult', '')
p.write_text(s)

p = Path('src/pages/CredentialsPage.tsx'); s = p.read_text()
s = 'import BulkIntakeModal from "@/components/BulkIntakeModal";\n' + s
a = s.index('function BulkAddModal('); b = s.index('export default function CredentialsPage()', a)
s = s[:a] + '''function BulkAddModal({ open, onClose, onImport }: {
  open: boolean; onClose: () => void; onImport: (items: CredentialDraft[]) => Promise<void>;
}) {
  return <BulkIntakeModal mode="credentials" open={open} onClose={onClose} onImport={rows => onImport(rows as unknown as CredentialDraft[])} />;
}

''' + s[b:]
p.write_text(s)

p = Path('src/lib/credentialBulk.ts'); s = p.read_text()
s = replace_once(s, 'pattern: /^sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{16,}$/,', 'pattern: /^sk-(?:proj-|svcacct-)[A-Za-z0-9_-]{16,}$/,')
s = replace_once(s, '  const notes = String(value.notes || "").trim();', '  let notes = String(value.notes || "").trim();')
s = replace_once(s, '  let category = normalizeCategory(value.category);', '''  let category = normalizeCategory(value.category);
  if (/^(?:\\d{1,2}[/.-]\\d{1,2}[/.-]\\d{2,4}|\\d{4}-\\d{2}-\\d{2})$/.test(category)) {
    notes = [notes, `Imported date: ${category}`].filter(Boolean).join("\\n");
    category = DEFAULT_CATEGORY;
  }''')
p.write_text(s)

p = Path('scripts/library-quality.mjs'); s = p.read_text()
s = replace_once(s, "      assert(await dialog.getByRole('button', { name: 'Save batch' }).isDisabled());", "      await dialog.getByText('1 valid entries; 1 errors').waitFor();\n      assert(await dialog.getByRole('button', { name: /^Save (?:batch|\\d+ valid entries)$/ }).isDisabled());")
anchor = "    await check('Libraries persist across reload"
s = replace_once(s, anchor, "    await (await import('./intake-quality.mjs')).runIntakeChecks(page, check, engine);\n" + anchor)
s = s.replace('Import errors and storage failures preserve drafts and block partial saves', 'Import errors require explicit opt-in and storage failures retain drafts')
p.write_text(s)
print('Wired four inspected source files; no database or encryption transaction changes.')
