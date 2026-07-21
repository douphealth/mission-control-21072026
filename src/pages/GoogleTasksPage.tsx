import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, CheckCircle2, Circle, Copy, ExternalLink, Plus, RefreshCw, LogIn, LogOut, Trash2, ListTodo } from 'lucide-react';
import { toast } from 'sonner';
import {
  isSignedIn, signIn, signOut,
  listTaskLists, listTasks, createTask, updateTask, deleteTask,
  getGoogleTasksOAuthDiagnostics,
  type GTaskList, type GTask,
} from '@/lib/googleTasks';

export default function GoogleTasksPage() {
  const [signed, setSigned] = useState(isSignedIn());
  const [lists, setLists] = useState<GTaskList[]>([]);
  const [activeList, setActiveList] = useState<string | null>(null);
  const [tasks, setTasks] = useState<GTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const oauth = getGoogleTasksOAuthDiagnostics();

  const loadLists = useCallback(async () => {
    setLoading(true);
    try {
      const ls = await listTaskLists();
      setLists(ls);
      if (ls.length && !activeList) setActiveList(ls[0].id);
    } catch (e: any) {
      toast.error(e.message);
      if (/session expired|Not signed in/i.test(e.message)) setSigned(false);
    } finally { setLoading(false); }
  }, [activeList]);

  const loadTasks = useCallback(async () => {
    if (!activeList) return;
    setLoading(true);
    try {
      setTasks(await listTasks(activeList, showCompleted));
    } catch (e: any) {
      toast.error(e.message);
      if (/session expired|Not signed in/i.test(e.message)) setSigned(false);
    } finally { setLoading(false); }
  }, [activeList, showCompleted]);

  useEffect(() => { if (signed) loadLists(); }, [signed, loadLists]);
  useEffect(() => { if (signed && activeList) loadTasks(); }, [signed, activeList, loadTasks]);

  const handleSignIn = async () => {
    setAuthError(null);
    try { await signIn(); setSigned(true); toast.success('Connected to Google Tasks'); }
    catch (e: any) { const message = e?.message || 'Google sign-in failed'; setAuthError(message); toast.error(message); }
  };

  const openStandalone = () => {
    window.open(window.location.href, '_blank', 'noopener,noreferrer');
  };

  const copyOrigin = async () => {
    await navigator.clipboard.writeText(oauth.origin);
    toast.success('Origin copied');
  };

  const handleSignOut = () => {
    signOut(); setSigned(false); setLists([]); setTasks([]); setActiveList(null);
    toast.success('Disconnected');
  };

  const toggleDone = async (t: GTask) => {
    if (!activeList) return;
    const next = t.status === 'completed' ? 'needsAction' : 'completed';
    try {
      await updateTask(activeList, t.id, { status: next });
      setTasks(prev => prev.map(x => x.id === t.id ? { ...x, status: next } : x));
    } catch (e: any) { toast.error(e.message); }
  };

  const addTask = async () => {
    if (!activeList || !newTitle.trim()) return;
    try {
      const created = await createTask(activeList, { title: newTitle.trim() });
      setTasks(prev => [created, ...prev]);
      setNewTitle('');
    } catch (e: any) { toast.error(e.message); }
  };

  const removeTask = async (t: GTask) => {
    if (!activeList) return;
    try {
      await deleteTask(activeList, t.id);
      setTasks(prev => prev.filter(x => x.id !== t.id));
    } catch (e: any) { toast.error(e.message); }
  };

  if (!signed) {
    return (
      <div className="max-w-2xl mx-auto mt-16 space-y-5">
        <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
          <ListTodo size={28} className="text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Google Tasks</h1>
        <p className="text-sm text-muted-foreground">Connect your Google account to view and manage your Google Tasks.</p>
        </div>

        {(authError || oauth.embedded) && (
          <div className="card-elevated p-4 text-left space-y-3 border-destructive/25 bg-destructive/5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-destructive shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-foreground">Google sign-in needs one clean browser origin</div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {authError || 'Google blocks OAuth inside the embedded editor preview. Open the app in a standalone tab first.'}
                </p>
              </div>
            </div>
            {oauth.origin && (
              <div className="rounded-xl bg-secondary/60 p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold mb-1">Authorized JavaScript origin to add in Google Cloud</div>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate text-xs text-foreground">{oauth.origin}</code>
                  <button onClick={copyOrigin} className="p-1.5 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground" title="Copy origin">
                    <Copy size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-2">
        <button onClick={handleSignIn}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition shadow-lg shadow-primary/20">
          <LogIn size={16} /> Sign in with Google
        </button>
          {oauth.embedded && (
            <button onClick={openStandalone} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary text-foreground font-medium hover:bg-secondary/75 transition">
              <ExternalLink size={16} /> Open standalone
            </button>
          )}
          <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary text-foreground font-medium hover:bg-secondary/75 transition">
            <ExternalLink size={16} /> Google OAuth settings
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <ListTodo size={20} className="text-primary" /> Google Tasks
          </h1>
          <p className="text-xs text-muted-foreground">{lists.length} list{lists.length === 1 ? '' : 's'} · synced from your Google account</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadTasks} className="p-2 rounded-xl bg-secondary hover:bg-secondary/70 text-muted-foreground hover:text-foreground" title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={handleSignOut} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm bg-secondary hover:bg-destructive/10 hover:text-destructive">
            <LogOut size={14} /> Disconnect
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
        {lists.map(l => (
          <button key={l.id} onClick={() => setActiveList(l.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeList === l.id ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}>
            {l.title}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground px-2">
          <input type="checkbox" checked={showCompleted} onChange={e => setShowCompleted(e.target.checked)} />
          Show completed
        </label>
      </div>

      <div className="flex gap-2">
        <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addTask(); }}
          placeholder="Add a task..."
          className="flex-1 px-4 py-2.5 rounded-xl bg-secondary outline-none border border-transparent focus:border-primary/30 text-sm" />
        <button onClick={addTask} disabled={!newTitle.trim()}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40">
          <Plus size={15} /> Add
        </button>
      </div>

      <div className="space-y-2">
        {tasks.length === 0 && !loading && (
          <div className="text-center py-16 text-muted-foreground">
            <div className="text-5xl mb-3">✅</div>
            <p className="font-semibold text-foreground">No tasks</p>
            <p className="text-sm">{showCompleted ? 'Nothing here yet.' : 'All caught up!'}</p>
          </div>
        )}
        {tasks.map(t => {
          const done = t.status === 'completed';
          return (
            <div key={t.id} className="card-elevated p-3 flex items-center gap-3 group">
              <button onClick={() => toggleDone(t)} className="shrink-0 text-muted-foreground hover:text-primary transition">
                {done ? <CheckCircle2 size={20} className="text-emerald-500" /> : <Circle size={20} />}
              </button>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{t.title || '(untitled)'}</div>
                {t.notes && <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{t.notes}</div>}
                {t.due && <div className="text-[11px] text-muted-foreground mt-0.5">Due {new Date(t.due).toLocaleDateString()}</div>}
              </div>
              <button onClick={() => removeTask(t)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition">
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
