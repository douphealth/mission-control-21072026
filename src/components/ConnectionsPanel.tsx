import { Plug, ExternalLink, Info } from 'lucide-react';
import { useAudienceAccounts } from '@/hooks/useTableData';
import { useNavigationStore } from '@/stores/navigationStore';

const PLATFORMS = [
  { id: 'youtube', label: 'YouTube', hint: 'Public channel metrics are read automatically on every refresh.' },
  { id: 'x', label: 'X (Twitter)', hint: 'Public profile metrics are read on refresh; some profiles hide counts.' },
  { id: 'instagram', label: 'Instagram', hint: 'Public profile metrics are read on refresh; login-walled profiles stay blank.' },
  { id: 'facebook', label: 'Facebook', hint: 'Public pages only.' },
  { id: 'linkedin', label: 'LinkedIn', hint: 'Public company pages only.' },
  { id: 'tiktok', label: 'TikTok', hint: 'Public profiles only.' },
];

export default function ConnectionsPanel() {
  const accounts = useAudienceAccounts();
  const setActiveSection = useNavigationStore((s) => s.setActiveSection);

  return (
    <div className="space-y-4">
      <div className="card-elevated p-6">
        <h2 className="font-semibold text-lg flex items-center gap-2 mb-1">
          <Plug size={18} className="text-primary" /> Connections
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Audience tracking runs on public profile data — no API keys required. Add a profile URL and Mission Control
          reads follower counts on every refresh. Readings that a platform hides stay blank instead of showing a false zero.
        </p>

        <div className="space-y-2">
          {PLATFORMS.map((p) => {
            const tracked = accounts.filter((a) => a.platform === p.id).length;
            return (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{p.label}</p>
                  <p className="text-xs text-muted-foreground">{p.hint}</p>
                </div>
                <span
                  className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                    tracked ? 'bg-emerald-500/15 text-emerald-600' : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {tracked ? `${tracked} tracked` : 'Not tracked'}
                </span>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => setActiveSection('audience')}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold gradient-primary text-primary-foreground"
        >
          Manage tracked profiles <ExternalLink size={13} />
        </button>
      </div>

      <div className="card-elevated p-6">
        <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
          <Info size={15} className="text-primary" /> Google Calendar
        </h3>
        <p className="text-xs text-muted-foreground">
          Task sync with Google Calendar is configured in the Google Calendar tab.
        </p>
      </div>
    </div>
  );
}
