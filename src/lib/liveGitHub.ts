import { getGitHubRepoKey } from "@/lib/unifiedGitHubCatalog";
export const OWNERS = ["douphealth","Papalexios","papalexios001-wq"] as const;
export type LiveRepo = { key:string; owner:string; name:string; url:string; description:string|null; language:string|null; updatedAt:string|null; pushedAt:string|null; defaultBranch:string|null; visibility:"public"; archived:boolean; fork:boolean; stars:number; forks:number; openIssues:number; homepage:string|null };
export type OwnerResult = { owner:string; state:"live"|"error"; repositories:LiveRepo[]; error?:string };
function normalize(row:unknown, owner:string): LiveRepo|null {
  if(!row||typeof row!=="object")return null;
  const v=row as Record<string,unknown>;
  const url=typeof v.html_url==="string"?v.html_url:"";
  const key=getGitHubRepoKey(url);
  if(!key||key.split("/")[0]!==owner.toLowerCase()||v.private===true)return null;
  const str=(x:unknown)=>typeof x==="string"?x:null;
  const num=(x:unknown)=>typeof x==="number"&&Number.isFinite(x)?x:0;
  return {key,owner,name:str(v.name)||key.split("/")[1],url,description:str(v.description),
    language:str(v.language),updatedAt:str(v.updated_at),pushedAt:str(v.pushed_at),
    defaultBranch:str(v.default_branch),visibility:"public",archived:v.archived===true,
    fork:v.fork===true,stars:num(v.stargazers_count),forks:num(v.forks_count),
    openIssues:num(v.open_issues_count),homepage:str(v.homepage)};
}
export async function fetchOwnerRepos(owner:string, fetcher:typeof fetch=fetch):Promise<OwnerResult> {
  if(!OWNERS.some(o=>o.toLowerCase()===owner.toLowerCase()))return {owner,state:"error",repositories:[],error:"Unknown owner"};
  const all:LiveRepo[]=[];const pages=20;
  try {
    for(let page=1;page<=pages;page++){
      const url=`https://api.github.com/users/${encodeURIComponent(owner)}/repos?type=owner&sort=full_name&direction=asc&per_page=100&page=${page}`;
      const res=await fetcher(url,{headers:{Accept:"application/vnd.github+json"},cache:"no-store",signal:AbortSignal.timeout(15000)});
      if(!res.ok)throw new Error(res.status===403?"GitHub API rate limit or access restriction":`GitHub API HTTP ${res.status}`);
      const rows:unknown=await res.json();
      if(!Array.isArray(rows))throw new Error("Unexpected GitHub API response");
      for(const v of rows){const item=normalize(v,owner);if(item)all.push(item);}
      if(rows.length<100)return {owner,state:"live",repositories:all};
    }
    throw new Error("Repository pagination limit reached: result is incomplete");
  }catch(error){return {owner,state:"error",repositories:[],error:error instanceof Error?error.message:"GitHub API request failed"};}
}
export function mergeLiveRepos<T extends {url:string}>(snapshot:T[],live:LiveRepo[]):Array<T|LiveRepo>{
  const result=new Map<string,T|LiveRepo>();
  for(const row of snapshot){const key=getGitHubRepoKey(row.url);if(key)result.set(key,row);}
  for(const row of live){const old=result.get(row.key);result.set(row.key,old?{...old,...row}:row);}
  return [...result.values()];
}
