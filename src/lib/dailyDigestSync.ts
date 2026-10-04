import { db } from "@/lib/db";
import { readGoogleToken } from "@/lib/googleDirectAuth";
import { buildExecutiveDigestSnapshot } from "@/lib/dailyDigestSnapshot";
export interface DigestSyncResult { ok:boolean; sent?:boolean; email?:string; error?:string; configured?:boolean; }
export async function syncDailyDigestSnapshot(options?:{sendNow?:boolean;silent?:boolean}):Promise<DigestSyncResult>{
  const settings=await db.settings.get("default");
  if(settings?.digestEmailEnabled===false&&!options?.sendNow)return{ok:true};
  const token=readGoogleToken();
  if(!token?.access_token)return{ok:false,error:"Connect Google in Mission Control so the daily email recipient can be verified."};
  const snapshot=await buildExecutiveDigestSnapshot();
  const response=await fetch("/api/public/digest",{method:"POST",cache:"no-store",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token.access_token}`},body:JSON.stringify({action:options?.sendNow?"send-now":"snapshot",snapshot})});
  const data=await response.json().catch(()=>({})) as DigestSyncResult;
  if(!response.ok||data.ok===false){if(!options?.silent)throw new Error(data.error||"Daily briefing sync failed.");return{ok:false,error:data.error||"Daily briefing sync failed.",configured:data.configured};}
  const now=new Date().toISOString(); await db.settings.update("default",{digestEmailLastSnapshotAt:now,...(data.sent?{digestEmailLastSentAt:now}:{})}); return data;
}
export async function getDailyDigestHealth(){const r=await fetch("/api/public/digest",{cache:"no-store"});const d=await r.json().catch(()=>({})) as any;return{ok:r.ok&&d.ok===true,storageConfigured:d.storageConfigured===true,emailConfigured:d.emailConfigured===true,schedulerReady:d.schedulerReady===true};}
