import { encrypt, decrypt } from './encryption';

type CrudClient = {
  from: (table: string) => {
    insert: (rows: any[]) => Promise<{ error: any }>;
    select: (columns?: string) => { eq: (column: string, value: string) => { single: () => Promise<{ data: any; error: any }> } };
    update: (patch: any) => { eq: (column: string, value: string) => Promise<{ error: any }> };
    delete: () => { eq: (column: string, value: string) => Promise<{ error: any }> };
  };
};

export async function smokeVaultEncryptDecrypt() {
  const secret = `vault-smoke-${Date.now()}`;
  const encrypted = await encrypt(secret, 'production-smoke-test-key');
  const decrypted = await decrypt(encrypted, 'production-smoke-test-key');
  if (!encrypted.startsWith('wcapi:') || encrypted === secret || decrypted !== secret) {
    throw new Error('Vault encrypt/decrypt smoke test failed');
  }
  return true;
}

export function smokeOfflineOnlineTransitions(target: Window) {
  const states: boolean[] = [];
  const recordOnline = () => states.push(true);
  const recordOffline = () => states.push(false);
  target.addEventListener('online', recordOnline);
  target.addEventListener('offline', recordOffline);
  target.dispatchEvent(new Event('offline'));
  target.dispatchEvent(new Event('online'));
  target.removeEventListener('online', recordOnline);
  target.removeEventListener('offline', recordOffline);
  if (states.join(',') !== 'false,true') throw new Error('Offline/online transition smoke test failed');
  return states;
}

export async function smokeSupabaseCrud(client: CrudClient, table = 'mc_settings') {
  const id = `smoke-${Date.now()}`;
  const created = { id, data: { smoke: true, phase: 'create' } };
  const insertResult = await client.from(table).insert([created]);
  if (insertResult.error) throw new Error(`${table} insert failed: ${insertResult.error.message}`);

  const readResult = await client.from(table).select('id,data').eq('id', id).single();
  if (readResult.error || readResult.data?.id !== id) throw new Error(`${table} read failed: ${readResult.error?.message || 'row not found'}`);

  const updateResult = await client.from(table).update({ data: { smoke: true, phase: 'update' } }).eq('id', id);
  if (updateResult.error) throw new Error(`${table} update failed: ${updateResult.error.message}`);

  const deleteResult = await client.from(table).delete().eq('id', id);
  if (deleteResult.error) throw new Error(`${table} delete failed: ${deleteResult.error.message}`);
  return true;
}