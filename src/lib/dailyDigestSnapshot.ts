import { db, type Task } from "@/lib/db";
import { addDaysLocal, daysOverdue, PRIORITY_RANK, todayISO } from "@/lib/overdue";

export type DigestSeverity = "high" | "medium" | "low";
export interface ExecutiveDigestTask { title:string; priority?:string; dueDate?:string; startTime?:string; daysOverdue?:number; }
export interface ExecutiveDigestIssue { label:string; detail?:string; severity?:DigestSeverity; source?:string; }
export interface ExecutiveDigestSnapshot {
  generatedAt:string; date:string; timezone:string; enabled:boolean; sendHour:number;
  counts:{totalOpen:number;inProgress:number;completedToday:number;completedWeek:number;overdue:number;dueToday:number;dueTomorrow:number;upcoming:number;backlog:number;issues:number;};
  overdue:ExecutiveDigestTask[]; dueToday:ExecutiveDigestTask[]; dueTomorrow:ExecutiveDigestTask[]; upcoming:ExecutiveDigestTask[]; backlog:ExecutiveDigestTask[]; completed:ExecutiveDigestTask[]; issues:ExecutiveDigestIssue[];
}
const sevRank={high:0,medium:1,low:2} as const;
const taskSort=(a:Task,b:Task)=>(PRIORITY_RANK[a.priority]??9)-(PRIORITY_RANK[b.priority]??9)||(a.dueDate||"9999").localeCompare(b.dueDate||"9999");
const view=(t:Task,today:string):ExecutiveDigestTask=>({title:t.title,priority:t.priority,dueDate:t.dueDate||undefined,startTime:t.startTime,daysOverdue:daysOverdue(t,today)});
const hour=(v:unknown)=>Math.max(0,Math.min(23,Number.isFinite(Number(v))?Math.round(Number(v)):8));
export async function buildExecutiveDigestSnapshot():Promise<ExecutiveDigestSnapshot>{
  const [tasks,payments,reminders,seoIssues,seoActions,decisions,syncHealth,validations,websites,repos,buildProjects,settings]=await Promise.all([
    db.tasks.filter(t=>!t.deletedAt).toArray(),db.payments.toArray(),db.reminders.toArray(),db.seoIssues.toArray(),db.seoActions.toArray(),db.decisions.toArray(),db.syncHealth.toArray(),db.validations.toArray(),db.websites.toArray(),db.repos.toArray(),db.buildProjects.toArray(),db.settings.get("default")
  ]);
  const now=new Date(),today=todayISO(),tomorrow=addDaysLocal(today,1),weekEnd=addDaysLocal(today,7),weekAgo=addDaysLocal(today,-6);
  const open=tasks.filter(t=>t.status!=="done"&&!t.archived), overdue=open.filter(t=>!!t.dueDate&&t.dueDate<today).sort(taskSort), dueToday=open.filter(t=>t.dueDate===today).sort(taskSort), dueTomorrow=open.filter(t=>t.dueDate===tomorrow).sort(taskSort), upcoming=open.filter(t=>!!t.dueDate&&t.dueDate>tomorrow&&t.dueDate<=weekEnd).sort(taskSort), backlog=open.filter(t=>!t.dueDate).sort(taskSort);
  const completed=tasks.filter(t=>t.status==="done"&&!!t.completedAt&&t.completedAt.slice(0,10)>=weekAgo).sort((a,b)=>(b.completedAt||"").localeCompare(a.completedAt||""));
  const issues:ExecutiveDigestIssue[]=[]; const add=(x:ExecutiveDigestIssue)=>issues.push(x);
  payments.forEach(p=>{if(p.status==="overdue")add({label:`Payment overdue · ${p.title}`,detail:`${p.amount} ${p.currency}${p.dueDate?` · due ${p.dueDate}`:""}`,severity:"high",source:"finance"}); else if(p.status==="pending"&&p.dueDate&&p.dueDate<=tomorrow)add({label:`Payment pending · ${p.title}`,detail:`${p.amount} ${p.currency} · due ${p.dueDate}`,severity:"medium",source:"finance"});});
  reminders.filter(r=>r.status==="pending").forEach(r=>{const at=new Date(r.remindAt);if(Number.isNaN(at.getTime()))return;if(at<=now)add({label:`Reminder due · ${r.title}`,detail:r.notes||at.toLocaleString(),severity:"high",source:"reminders"});else if(at.getTime()<=now.getTime()+86400000)add({label:`Reminder next 24h · ${r.title}`,detail:at.toLocaleString(),severity:"medium",source:"reminders"});});
  seoIssues.filter(i=>i.status==="open"||i.status==="in-progress").forEach(i=>add({label:`SEO · ${i.title}`,detail:[i.category,i.url,i.evidence].filter(Boolean).join(" · ").slice(0,360),severity:i.severity==="critical"||i.severity==="high"?"high":i.severity==="medium"?"medium":"low",source:"seo"}));
  seoActions.filter(a=>!["done","cancelled"].includes(a.status)&&(a.priority==="critical"||a.priority==="high"||!!a.dueDate&&a.dueDate<=weekEnd)).forEach(a=>add({label:`SEO action · ${a.title}`,detail:[a.status,a.dueDate?`due ${a.dueDate}`:"",a.rationale].filter(Boolean).join(" · ").slice(0,360),severity:a.priority==="critical"||a.priority==="high"?"high":"medium",source:"seo"}));
  decisions.filter(d=>d.status==="open"||(d.status==="later"&&!!d.deferUntil&&d.deferUntil<=today)).forEach(d=>add({label:`Decision · ${d.title}`,detail:(d.recommendation||d.context||"").slice(0,360),severity:d.severity==="critical"||d.severity==="high"?"high":d.severity==="medium"?"medium":"low",source:"decisions"}));
  syncHealth.filter(h=>h.status==="error"||h.status==="stale").forEach(h=>add({label:`${h.status==="error"?"Sync failure":"Stale data"} · ${h.label}`,detail:h.error||h.detail||(h.lastSuccessAt?`Last success ${h.lastSuccessAt}`:""),severity:h.status==="error"?"high":"medium",source:"sync"}));
  validations.filter(v=>v.status==="failed"||!!v.reviewAt&&v.reviewAt<=today&&!["passed","failed"].includes(v.status)).forEach(v=>add({label:`Validation · ${v.title}`,detail:v.result||v.successCriteria||v.entityLabel||"",severity:v.status==="failed"?"high":"medium",source:"validation"}));
  websites.filter(w=>w.status==="down"||w.status==="maintenance").forEach(w=>add({label:`Website ${w.status} · ${w.name}`,detail:w.url,severity:w.status==="down"?"high":"medium",source:"websites"}));
  repos.filter(r=>!!r.pendingSummary&&r.status!=="archived").forEach(r=>add({label:`Repo · ${r.name}`,detail:r.pendingSummary!.slice(0,360),severity:r.priority==="critical"||r.priority==="high"?"medium":"low",source:"github"}));
  buildProjects.filter(p=>p.status!=="deployed"&&!!p.nextSteps?.trim()).forEach(p=>add({label:`Build · ${p.productName||p.name}`,detail:p.nextSteps.slice(0,360),severity:p.priority==="critical"||p.priority==="high"?"medium":"low",source:"projects"}));
  issues.sort((a,b)=>(sevRank[a.severity||"low"]??9)-(sevRank[b.severity||"low"]??9));
  return {generatedAt:now.toISOString(),date:today,timezone:settings?.digestEmailTimezone||Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC",enabled:settings?.digestEmailEnabled!==false,sendHour:hour(settings?.digestEmailHour),counts:{totalOpen:open.length,inProgress:open.filter(t=>t.status==="in-progress").length,completedToday:tasks.filter(t=>t.status==="done"&&(t.completedAt||"").slice(0,10)===today).length,completedWeek:completed.length,overdue:overdue.length,dueToday:dueToday.length,dueTomorrow:dueTomorrow.length,upcoming:upcoming.length,backlog:backlog.length,issues:issues.length},overdue:overdue.map(t=>view(t,today)),dueToday:dueToday.map(t=>view(t,today)),dueTomorrow:dueTomorrow.map(t=>view(t,today)),upcoming:upcoming.map(t=>view(t,today)),backlog:backlog.map(t=>view(t,today)),completed:completed.slice(0,8).map(t=>view(t,today)),issues};
}
