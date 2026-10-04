import * as React from "react";
import { render } from "@react-email/render";
import { createFileRoute } from "@tanstack/react-router";
import { OverdueDigestEmail } from "@/lib/email-templates/overdue-digest";
import type { ExecutiveDigestSnapshot } from "@/lib/dailyDigestSnapshot";

type StoredDigest={user_email:string;snapshot:ExecutiveDigestSnapshot;timezone:string;send_hour:number;enabled:boolean;updated_at:string;last_sent_at?:string|null;last_sent_local_date?:string|null;};
const json=(body:unknown,status=200)=>Response.json(body,{status});
const env=(name:string)=>(process.env[name]||"").trim();
const storageConfigured=()=>Boolean(env("SUPABASE_URL")&&env("SUPABASE_SERVICE_ROLE_KEY"));
const mailflareConfigured=()=>Boolean(env("MAILFLARE_URL")&&env("MAILFLARE_API_KEY")&&env("MAILFLARE_FROM"));
const resendConfigured=()=>Boolean(env("RESEND_API_KEY"));
const emailConfigured=()=>mailflareConfigured()||resendConfigured();
const schedulerReady=()=>Boolean(env("DIGEST_CRON_SECRET"));
const serviceHeaders=(extra?:Record<string,string>)=>{const key=env("SUPABASE_SERVICE_ROLE_KEY");return{apikey:key,...(key&&!key.startsWith("sb_")?{Authorization:`Bearer ${key}`}:{}),"Content-Type":"application/json",...extra};};
async function supabase(path:string,init:RequestInit={}){const base=env("SUPABASE_URL").replace(/\/$/,"");if(!base||!env("SUPABASE_SERVICE_ROLE_KEY"))throw new Error("Daily email storage is not configured.");const r=await fetch(`${base}/rest/v1/${path}`,{...init,headers:serviceHeaders(init.headers as Record<string,string>|undefined)});if(!r.ok){const d=(await r.text().catch(()=>"")).slice(0,500);throw new Error(`Digest storage failed (${r.status})${d?`: ${d}`:""}`)}return r;}
async function verifiedGoogleEmail(request:Request){const auth=request.headers.get("authorization")||"",m=auth.match(/^Bearer\s+(.+)$/i);if(!m?.[1])throw new Error("Google authorization is required.");const r=await fetch("https://openidconnect.googleapis.com/v1/userinfo",{headers:{Authorization:`Bearer ${m[1]}`},cache:"no-store"});if(!r.ok)throw new Error("Google identity verification failed.");const p=await r.json() as {email?:string;email_verified?:boolean};const email=p.email?.trim().toLowerCase();if(!email||p.email_verified===false)throw new Error("The connected Google account does not expose a verified email.");return email;}
function validSnapshot(v:unknown):v is ExecutiveDigestSnapshot{if(!v||typeof v!=="object")return false;const s=v as Partial<ExecutiveDigestSnapshot>;return typeof s.generatedAt==="string"&&typeof s.date==="string"&&typeof s.timezone==="string"&&typeof s.enabled==="boolean"&&Number.isFinite(s.sendHour)&&!!s.counts&&Array.isArray(s.overdue)&&Array.isArray(s.dueToday)&&Array.isArray(s.issues);}
async function saveSnapshot(email:string,s:ExecutiveDigestSnapshot){const serialized=JSON.stringify(s);if(serialized.length>450000)throw new Error("Daily briefing snapshot is unexpectedly large.");const payload={user_email:email,snapshot:s,timezone:s.timezone||"UTC",send_hour:Math.max(0,Math.min(23,Math.round(s.sendHour))),enabled:s.enabled,updated_at:new Date().toISOString()};await supabase("mission_control_digest_snapshots?on_conflict=user_email",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(payload)});}
async function getSnapshot(email:string):Promise<StoredDigest|null>{const r=await supabase(`mission_control_digest_snapshots?user_email=eq.${encodeURIComponent(email)}&select=*&limit=1`);const rows=await r.json() as StoredDigest[];return rows[0]||null;}
async function getEnabledSnapshots():Promise<StoredDigest[]>{const r=await supabase("mission_control_digest_snapshots?enabled=eq.true&select=*&order=updated_at.desc");return await r.json() as StoredDigest[];}
function localClock(tz:string,date=new Date()){const f=new Intl.DateTimeFormat("en-CA",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",hourCycle:"h23"});const p=Object.fromEntries(f.formatToParts(date).map(x=>[x.type,x.value]));return{date:`${p.year}-${p.month}-${p.day}`,hour:Number(p.hour)};}
function subject(s:ExecutiveDigestSnapshot){const action=s.counts.overdue+s.counts.dueToday+s.counts.issues;if(s.counts.overdue)return`Mission Control · ${s.counts.overdue} overdue · ${s.counts.issues} issues`;if(action)return`Mission Control · ${action} items need attention today`;return"Mission Control · clear board today";}
function plainText(s:ExecutiveDigestSnapshot){
  const lines=[
    "MISSION CONTROL · DAILY EXECUTIVE BRIEFING",
    s.date,
    "",
    `${s.counts.overdue} overdue · ${s.counts.dueToday} due today · ${s.counts.issues} issues · ${s.counts.completedWeek} done in 7d`,
    ""
  ];
  const focus=[...s.overdue,...s.dueToday].slice(0,3);
  if(focus.length){
    lines.push("DO THESE FIRST");
    focus.forEach((t,i)=>lines.push(`${i+1}. ${t.title}${t.dueDate?` · due ${t.dueDate}`:""}`));
    lines.push("");
  }
  if(s.issues.length){
    lines.push("NEEDS A DECISION");
    s.issues.slice(0,8).forEach((x,i)=>lines.push(`${i+1}. ${x.label}${x.detail?` — ${x.detail}`:""}`));
    lines.push("");
  }
  lines.push("Open Mission Control: https://mission-control-21072026.pages.dev/");
  return lines.join("\n");
}
async function sendEmail(email:string,s:ExecutiveDigestSnapshot,localDate:string){
  if(!emailConfigured())throw new Error("Email delivery is not configured.");
  const html=await render(React.createElement(OverdueDigestEmail,{date:s.date,overdue:s.overdue,dueToday:s.dueToday,dueTomorrow:s.dueTomorrow,upcoming:s.upcoming,backlog:s.backlog,completed:s.completed,completedToday:s.counts.completedToday,completedWeek:s.counts.completedWeek,totalOpen:s.counts.totalOpen,inProgress:s.counts.inProgress,issues:s.issues}));
  const text=plainText(s);

  // Mailflare is the preferred transport: it keeps delivery, provider choice,
  // sent-mail history and domain identity in the user's own Cloudflare stack.
  if(mailflareConfigured()){
    const base=env("MAILFLARE_URL").replace(/\/$/,"");
    const r=await fetch(`${base}/api/v1/send`,{
      method:"POST",
      headers:{Authorization:`Bearer ${env("MAILFLARE_API_KEY")}`,"Content-Type":"application/json"},
      body:JSON.stringify({
        from:env("MAILFLARE_FROM"),
        to:[email],
        subject:subject(s),
        text,
        html
      })
    });
    if(!r.ok){
      const d=(await r.text().catch(()=>"")).slice(0,500);
      throw new Error(`Mailflare delivery failed (${r.status})${d?`: ${d}`:""}`);
    }
    return r.json().catch(()=>({}));
  }

  // Resend remains a direct fallback so a Mailflare outage/configuration change
  // does not silently remove the daily briefing.
  const key=env("RESEND_API_KEY");
  const r=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json","Idempotency-Key":`mission-control-digest/${email}/${localDate}`},body:JSON.stringify({from:env("DIGEST_FROM")||"Mission Control <onboarding@resend.dev>",to:[email],subject:subject(s),html,text,tags:[{name:"category",value:"daily_digest"},{name:"source",value:"mission_control"}]})});
  if(!r.ok){const d=(await r.text().catch(()=>"")).slice(0,500);throw new Error(`Email delivery failed (${r.status})${d?`: ${d}`:""}`)}
  return r.json().catch(()=>({}));
}
async function markSent(email:string,date:string){await supabase(`mission_control_digest_snapshots?user_email=eq.${encodeURIComponent(email)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({last_sent_at:new Date().toISOString(),last_sent_local_date:date})});}
async function sendStored(row:StoredDigest,force=false){const c=localClock(row.timezone||row.snapshot.timezone||"UTC");if(!force){if(!row.enabled)return{sent:false,reason:"disabled"};if(c.hour!==Number(row.send_hour))return{sent:false,reason:"not-due"};if(row.last_sent_local_date===c.date)return{sent:false,reason:"already-sent"};}await sendEmail(row.user_email,row.snapshot,c.date);await markSent(row.user_email,c.date);return{sent:true};}
async function runCron(request:Request){const secret=env("DIGEST_CRON_SECRET");if(!secret)return json({ok:false,error:"Scheduler secret is not configured."},503);if(request.headers.get("x-mission-control-cron")!==secret)return json({ok:false,error:"Unauthorized."},401);if(!storageConfigured()||!emailConfigured())return json({ok:false,error:"Daily email backend is incomplete."},503);const rows=await getEnabledSnapshots(),results:any[]=[];for(const row of rows){try{results.push({email:row.user_email,...await sendStored(row,false)})}catch(e){results.push({email:row.user_email,sent:false,error:e instanceof Error?e.message:String(e)})}}return json({ok:true,checked:rows.length,sent:results.filter(r=>r.sent).length,results});}
export const Route=createFileRoute("/api/public/digest")({server:{handlers:{
 GET:async()=>json({ok:true,storageConfigured:storageConfigured(),emailConfigured:emailConfigured(),mailflareConfigured:mailflareConfigured(),resendConfigured:resendConfigured(),schedulerReady:schedulerReady()}),
 POST:async({request})=>{try{const body=await request.json().catch(()=>({})) as {action?:string;snapshot?:unknown};if(body.action==="cron")return await runCron(request);const email=await verifiedGoogleEmail(request);if(body.action==="snapshot"||body.action==="send-now"){if(!validSnapshot(body.snapshot))return json({ok:false,error:"Invalid daily briefing snapshot."},400);await saveSnapshot(email,body.snapshot);if(body.action==="send-now"){if(!emailConfigured())return json({ok:false,configured:false,error:"Email delivery is not configured yet."},503);const row=await getSnapshot(email);if(!row)return json({ok:false,error:"Snapshot was not persisted."},500);await sendStored(row,true);return json({ok:true,sent:true,email});}return json({ok:true,sent:false,email});}return json({ok:false,error:"Unknown digest action."},400)}catch(e){const m=e instanceof Error?e.message:String(e);const status=/authorization|identity verification|verified email/i.test(m)?401:/not configured|incomplete/i.test(m)?503:500;return json({ok:false,error:m},status)}}
}}});
