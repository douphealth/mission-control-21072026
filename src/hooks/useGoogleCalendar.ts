/**
 * React hook for Google Calendar integration.
 * Auth is handled server-side via the Lovable Google Calendar connector,
 * so there is no connect/disconnect flow — the calendar is always available.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    getGCalConfig,
    setGCalConfig,
    isGCalConnected,
    listCalendars,
    syncGCalEvents,
    gCalEventToCalEvent,
    pushTasksToGCal,
    taskIdToGCalId,
    type GoogleCalendarList,
    type GoogleCalendarEvent,
} from '@/lib/googleCalendar';
import { db, type Task } from '@/lib/db';
import { useDataStore } from '@/stores/dataStore';

export interface GCalSyncState {
    connected: boolean;
    connecting: boolean;
    syncing: boolean;
    email: string | null;
    calendars: GoogleCalendarList[];
    enabledCalendarIds: string[];
    events: ReturnType<typeof gCalEventToCalEvent>[];
    rawEvents: GoogleCalendarEvent[];
    lastSync: string | null;
    autoSync: boolean;
    error: string | null;
}

export function useGoogleCalendar(opts?: {
    autoFetch?: boolean;
    timeMin?: string;
    timeMax?: string;
}) {
    const autoFetch = opts?.autoFetch ?? true;
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const syncLockRef = useRef(false);
    const storeUpdateItem = useDataStore(s => s.updateItem);

    const [state, setState] = useState<GCalSyncState>(() => {
        const cfg = getGCalConfig();
        return {
            connected: isGCalConnected(),
            connecting: false,
            syncing: false,
            email: cfg.connectedEmail,
            calendars: [],
            enabledCalendarIds: cfg.enabledCalendarIds,
            events: [],
            rawEvents: [],
            lastSync: cfg.lastSync,
            autoSync: cfg.autoSync,
            error: null,
        };
    });

    const syncStateFromConfig = useCallback(() => {
        const cfg = getGCalConfig();
        setState(s => ({
            ...s,
            connected: isGCalConnected(),
            email: cfg.connectedEmail,
            enabledCalendarIds: cfg.enabledCalendarIds,
            lastSync: cfg.lastSync,
            autoSync: cfg.autoSync,
        }));
    }, []);

    const getTimeRange = useCallback(() => {
        const now = new Date();
        const min = opts?.timeMin || new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString();
        const max = opts?.timeMax || new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString();
        return { min, max };
    }, [opts?.timeMin, opts?.timeMax]);

    const fetchCalendars = useCallback(async () => {
        try {
            const cals = await listCalendars();
            setState(s => ({ ...s, calendars: cals, connected: true, error: null }));
            const cfg = getGCalConfig();
            if (cfg.enabledCalendarIds.length === 0) {
                const ids = cals.map(c => c.id);
                if (ids.length > 0) {
                    setGCalConfig({ enabledCalendarIds: ids });
                    setState(s => ({ ...s, enabledCalendarIds: ids }));
                }
            }
            // Capture primary email as identity (best-effort)
            const primary = cals.find(c => c.primary);
            if (primary && /@/.test(primary.id)) {
                setGCalConfig({ connectedEmail: primary.id });
                setState(s => ({ ...s, email: primary.id }));
            }
        } catch (e: any) {
            console.error('Failed to fetch calendars:', e);
            setState(s => ({
                ...s,
                calendars: [],
                events: [],
                rawEvents: [],
                connected: false,
                error: e?.message || 'Failed to fetch calendars',
            }));
        }
    }, []);

    const syncEvents = useCallback(async (force = false) => {
        if (syncLockRef.current) return;
        syncLockRef.current = true;
        setState(s => ({ ...s, syncing: true, error: null }));
        try {
            const allTasks = await db.tasks.toArray();
            const tasksToPush = allTasks.filter(t => t.dueDate && (!t.gcalEventId || t.gcalEventId.startsWith('mc')));
            if (tasksToPush.length > 0) {
                const pushed = await pushTasksToGCal(tasksToPush);
                for (const [taskId, gcalId] of pushed) {
                    await storeUpdateItem<Task>('tasks', taskId, { gcalEventId: gcalId } as Partial<Task>);
                }
                if (pushed.size > 0) console.log(`📤 Pushed ${pushed.size} tasks to Google Calendar`);
            }

            const { min, max } = getTimeRange();
            const rawEvents = await syncGCalEvents(min, max, force);

            const updatedTasks = await db.tasks.toArray();
            const pushedGCalIds = new Set(updatedTasks.map(t => t.gcalEventId).filter(Boolean));
            for (const t of updatedTasks) pushedGCalIds.add(taskIdToGCalId(t.id));
            const localTaskFingerprints = new Set(
                updatedTasks.map(t => `${(t.title || '').trim().toLowerCase()}|${t.dueDate || ''}`),
            );

            const externalEvents = rawEvents.filter(ev => {
                const rawSummary = ev.summary || '';
                const normalizedSummary = rawSummary.replace(/^📋\s*/, '').trim().toLowerCase();
                const evDate = ev.start.date || (ev.start.dateTime ? new Date(ev.start.dateTime).toISOString().split('T')[0] : '');

                if (rawSummary.startsWith('📋 ')) {
                    if (/^mc[a-v0-9]+$/i.test(ev.id)) return false;
                    const hasExactLocalTask = updatedTasks.some(t =>
                        (t.title || '').trim().toLowerCase() === normalizedSummary && t.dueDate === evDate
                    );
                    if (!hasExactLocalTask) return false;
                }
                if (pushedGCalIds.has(ev.id)) return false;
                const fp = `${normalizedSummary}|${evDate}`;
                if (localTaskFingerprints.has(fp)) {
                    const matchingTask = updatedTasks.find(t =>
                        (t.title || '').trim().toLowerCase() === normalizedSummary && t.dueDate === evDate && !t.gcalEventId
                    );
                    if (matchingTask) {
                        storeUpdateItem<Task>('tasks', matchingTask.id, { gcalEventId: ev.id } as Partial<Task>).catch(() => {});
                        pushedGCalIds.add(ev.id);
                    }
                    return false;
                }
                return true;
            });

            const calMap = new Map<string, string>();
            state.calendars.forEach(c => { if (c.backgroundColor) calMap.set(c.id, c.backgroundColor); });
            const events = externalEvents.map(ev =>
                gCalEventToCalEvent(ev, ev.calendarId ? calMap.get(ev.calendarId) : undefined)
            );

            setState(s => ({
                ...s,
                events,
                rawEvents,
                connected: true,
                syncing: false,
                lastSync: new Date().toISOString(),
            }));
        } catch (e: any) {
            setState(s => ({
                ...s,
                connected: false,
                syncing: false,
                events: [],
                rawEvents: [],
                error: e.message,
            }));
        } finally {
            syncLockRef.current = false;
        }
    }, [getTimeRange, state.calendars, storeUpdateItem]);

    // Connect / disconnect kept as no-ops for compatibility with old callers.
    const connect = useCallback(async (_clientId?: string): Promise<{ success: boolean; email?: string; error?: string }> => {
        setState(s => ({ ...s, connecting: true, error: null }));
        try {
            await fetchCalendars();
            await syncEvents(true);
            syncStateFromConfig();
            return { success: true, email: getGCalConfig().connectedEmail || undefined };
        } catch (e: any) {
            setState(s => ({ ...s, connected: false, connecting: false, error: e?.message || 'Google Calendar sync failed' }));
            return { success: false, error: e?.message || 'Google Calendar sync failed' };
        } finally {
            setState(s => ({ ...s, connecting: false }));
        }
    }, [fetchCalendars, syncEvents, syncStateFromConfig]);

    const disconnect = useCallback(() => {
        setGCalConfig({ enabledCalendarIds: [], lastSync: null, connectedEmail: null });
        setState(s => ({
            ...s,
            calendars: [],
            enabledCalendarIds: [],
            events: [],
            rawEvents: [],
            lastSync: null,
            email: null,
            error: null,
        }));
    }, []);

    const toggleCalendar = useCallback((calId: string) => {
        const cfg = getGCalConfig();
        const current = cfg.enabledCalendarIds;
        const next = current.includes(calId) ? current.filter(id => id !== calId) : [...current, calId];
        setGCalConfig({ enabledCalendarIds: next });
        setState(s => ({ ...s, enabledCalendarIds: next }));
        setTimeout(() => syncEvents(true), 200);
    }, [syncEvents]);

    const setAutoSync = useCallback((enabled: boolean) => {
        setGCalConfig({ autoSync: enabled });
        setState(s => ({ ...s, autoSync: enabled }));
    }, []);

    // setClientId is now a no-op (kept so SettingsPage doesn't break if it lingers)
    const setClientId = useCallback((_id: string) => { /* no-op */ }, []);

    useEffect(() => {
        syncStateFromConfig();
        if (autoFetch) {
            fetchCalendars().then(() => syncEvents()).catch(() => {});
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (state.connected && state.autoSync) {
            const cfg = getGCalConfig();
            const ms = (cfg.syncIntervalMinutes || 5) * 60 * 1000;
            intervalRef.current = setInterval(() => { syncEvents(true); }, ms);
        }
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [state.connected, state.autoSync, syncEvents]);

    return {
        ...state,
        clientId: '', // legacy compat
        connect,
        disconnect,
        syncEvents,
        fetchCalendars,
        toggleCalendar,
        setAutoSync,
        setClientId,
    };
}
