import type { BuildProject, GitHubRepo } from "@/lib/db";
import { getGitHubRepoKey } from "@/lib/unifiedGitHubCatalog";
import type { LiveRepo } from "@/lib/liveGitHub";
import type { CloudflareDeploymentRow } from "@/lib/cloudflareInventory.server";

export type RegistryRow = {
  id:string; app:string; productionUrl:string; repoUrl:string; cloudflareUrl:string;
  parentWebsite:string; priority:string; nextAction:string; account:string;
  deployedKind:"pages"|"worker"|"other"|"unknown"; linkSource:"explicit"|"cloudflare-api"|"unmatched";
  liveRepo:LiveRepo|null; appRecord:BuildProject|null; savedRepo:GitHubRepo|null;
};
const key=(s:string)=>getGitHubRepoKey(s||"");
const url=(s?:string|null)=>/^https:\/\/[^\s]+$/i.test(s||"")?s||"":"";
const identity=(s:string)=>{try{const x=new URL(s);return x.hostname.toLowerCase()+x.pathname.replace(/\/$/,"");}catch{return "";}};
const explicit=[{
  app:"Backlinks Outreach",repo:"douphealth/backlink-command-center",production:"https://backlink-command-center.pages.dev/#autopilot",
  dashboard:"https://dash.cloudflare.com/284f1a03e12aa7416ab177db3f692c17/pages/view/backlink-command-center",kind:"pages" as const,
},{
  app:"Index Engine",repo:"douphealth/index-engine",production:"https://index-engine-dashboard.papalexios.workers.dev/",
  dashboard:"https://dash.cloudflare.com/5dc0401c38d9de0c6947fee40a210937/workers/services/view/index-engine-dashboard/production",kind:"worker" as const,
},{
  app:"Social Media Management",repo:"",production:"https://social-growth.pages.dev/",
  dashboard:"https://dash.cloudflare.com/284f1a03e12aa7416ab177db3f692c17/pages/view/social-growth",kind:"pages" as const,
}];
/** User mappings take precedence over API inference; never infer a repo from a similarly named Worker. */
export function buildAssetRegistry(apps:BuildProject[],saved:GitHubRepo[],live:LiveRepo[],cloud:CloudflareDeploymentRow[]=[]):RegistryRow[]{
  const records=new Map<string,RegistryRow>();
  const byRepo=new Map<string,GitHubRepo>(saved.filter(r=>r.visibility!=="private").map(r=>[key(r.url),r]).filter(([k])=>Boolean(k)));
  const liveByRepo=new Map(live.map(r=>[r.key,r]));
  const make=(id:string):RegistryRow=>({id,app:"",productionUrl:"",repoUrl:"",cloudflareUrl:"",parentWebsite:"",priority:"medium",nextAction:"",account:"",deployedKind:"unknown",linkSource:"unmatched",liveRepo:null,appRecord:null,savedRepo:null});
  for(const app of apps){
    const k=key(app.githubRepo);const appUrl=url(app.deployedUrl);
    const id=k||"app:"+identity(appUrl||app.name)||"app:"+app.name;
    const row=records.get(id)||make(id);
    row.app=app.name;row.productionUrl=appUrl;row.repoUrl=k?"https://github.com/"+k:"";
    row.cloudflareUrl=url(app.cloudflareDashboardUrl)||row.cloudflareUrl;
    row.parentWebsite=url(app.parentWebsite);row.priority=app.priority||row.priority;row.nextAction=app.nextSteps||"";
    row.appRecord=app;row.linkSource="explicit";records.set(id,row);
  }
  for(const info of explicit){
    const id=info.repo||"app:"+identity(info.production);
    const row=records.get(id)||[...records.values()].find(r=>identity(r.productionUrl)===identity(info.production))||make(id);
    row.app=info.app;row.productionUrl=info.production;row.repoUrl=info.repo?"https://github.com/"+info.repo:"";
    row.cloudflareUrl=info.dashboard;row.deployedKind=info.kind;row.linkSource="explicit";
    records.set(row.id,row);
  }
  for(const r of [...saved.filter(r=>r.visibility!=="private"),...live]){
    const k="key" in r?r.key:key(r.url);if(!k)continue;
    const row=records.get(k)||make(k);row.repoUrl="https://github.com/"+k;row.app ||= "name" in r?r.name:k.split("/")[1];
    row.account=k.split("/")[0];row.savedRepo=byRepo.get(k)||null;row.liveRepo=liveByRepo.get(k)||null;
    row.priority=row.appRecord?.priority||row.savedRepo?.priority||row.priority;
    row.nextAction ||= row.savedRepo?.pendingSummary||"";row.productionUrl ||= url(row.savedRepo?.demoUrl);
    row.cloudflareUrl ||= url(row.savedRepo?.cloudflareDashboardUrl);
    records.set(k,row);
  }
  for(const deployment of cloud){
    const exactRepo=key(deployment.repoUrl||"");
    const existing=exactRepo?records.get(exactRepo):null;
    const byProduction=deployment.publicUrl?[...records.values()].find(r=>identity(r.productionUrl)===identity(deployment.publicUrl!)):null;
    const match=existing||byProduction;
    // Without an exact repository or URL identity, retain as a separate CF resource.
    const id=match?.id||"cloudflare:"+deployment.key;
    const row=match||make(id);
    if(!match)row.app=deployment.name;
    row.cloudflareUrl ||=url(deployment.projectUrl);row.productionUrl ||=url(deployment.publicUrl);
    row.deployedKind=deployment.kind;
    if(row.linkSource==="unmatched")row.linkSource=match?"cloudflare-api":"unmatched";
    records.set(row.id,row);
  }
  return [...records.values()].map(r=>({...r,account:r.account||r.repoUrl.split("/")[3]||""}))
    .sort((a,b)=>a.app.localeCompare(b.app));
}
export function exportRegistryCsv(rows:RegistryRow[]):string{
  const safe=(value:string)=>{const s=/^[\s]*[=+@\-]/.test(value)?"'"+value:value;return '"'+s.replace(/"/g,'""')+'"';};
  return [["App","Live URL","GitHub Repo","Cloudflare Dashboard","GitHub Account","Priority","Next Action","Link Evidence"],
    ...rows.map(r=>[r.app,r.productionUrl,r.repoUrl,r.cloudflareUrl,r.account,r.priority,r.nextAction,r.linkSource])]
    .map(row=>row.map(safe).join(",")).join("\r\n");
}
