/** Render diagnostics as text. Error strings may contain untrusted input. */
export function showFatalError(message: string, stack?: string): void {
  if (typeof document === 'undefined') return;
  const overlay = document.getElementById('mc-fatal');
  if (!overlay) return;
  const panel = document.createElement('div');
  panel.style.cssText = 'max-width:640px;max-height:90vh;overflow:auto;padding:28px;background:#1a1d27;border:1px solid #ef4444;border-radius:16px;color:#f8fafc;font-family:system-ui';
  const title = document.createElement('h1');
  title.textContent = 'Mission Control hit an error';
  title.style.cssText = 'font-size:24px;font-weight:800;margin:0 0 12px';
  const detail = document.createElement('p');
  detail.textContent = message.slice(0, 6000);
  detail.style.cssText = 'color:#fda4af;overflow-wrap:anywhere;font-size:14px';
  panel.append(title, detail);
  if (stack) {
    const pre = document.createElement('pre');
    pre.textContent = stack.slice(0, 16000);
    pre.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px;max-height:220px;overflow:auto';
    panel.append(pre);
  }
  const note = document.createElement('p');
  note.textContent = 'Do not clear browser data to recover. Reloading does not clear saved local records.';
  note.style.cssText = 'font-size:13px;color:#cbd5e1';
  const reload = document.createElement('button');
  reload.type = 'button';
  reload.textContent = 'Reload app';
  reload.style.cssText = 'min-height:44px;padding:10px 18px;background:#3b5cf6;color:white;border:0;border-radius:10px;font-weight:600;cursor:pointer';
  reload.addEventListener('click', () => window.location.reload());
  panel.append(note, reload);
  overlay.replaceChildren(panel);
  overlay.setAttribute('role', 'alertdialog');
  overlay.setAttribute('aria-label', 'Application error');
  overlay.style.display = 'flex';
}
