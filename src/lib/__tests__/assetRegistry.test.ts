import {describe,it,expect} from "vitest";
import { buildAssetRegistry,exportRegistryCsv } from "@/lib/assetRegistry";
import { APP_FUNNEL_CATALOG } from "@/lib/appPortfolio";
import type { BuildProject } from "@/lib/db";

describe("unified apps and infrastructure registry",()=>{
  it("links explicit Pages and Worker mapping without assuming a successful deployment",()=>{
    const rows=buildAssetRegistry(APP_FUNNEL_CATALOG.map((a,i)=>({...a,id:String(i)})) as BuildProject[],[],[]);
    const backlink=rows.find(r=>r.app==="Backlinks Outreach");
    const index=rows.find(r=>r.app==="Index Engine");
    const social=rows.find(r=>r.app==="Social Media Management");
    expect(backlink?.repoUrl).toBe("https://github.com/douphealth/backlink-command-center");
    expect(backlink?.cloudflareUrl).toContain("/pages/view/backlink-command-center");
    expect(index?.deployedKind).toBe("worker");
    expect(index?.cloudflareUrl).toContain("index-engine-dashboard/production");
    expect(social?.repoUrl).toBe("");
    expect(social?.cloudflareUrl).toContain("social-growth");
  });
  it("does not replace an operator-supplied Cloudflare project link with an inferred resource",()=>{
    const apps=APP_FUNNEL_CATALOG.map((a,i)=>({...a,id:String(i)})) as BuildProject[];
    const rows=buildAssetRegistry(apps,[],[],[{
      key:"pages:foo:backlink-command-center",kind:"pages",accountId:"foo",name:"backlink-command-center",
      projectUrl:"https://dash.cloudflare.com/unrelated/pages/view/backlink-command-center",
      publicUrl:"https://backlink-command-center.pages.dev/",repoUrl:null,domains:[],routes:[],
      branch:null,commit:null,deploymentId:null,deployedAt:null,status:"unknown",statusSource:"unavailable",
    }]);
    expect(rows.find(r=>r.app==="Backlinks Outreach")?.cloudflareUrl).toContain("284f1a03");
  });
  it("escapes spreadsheet formulas in CSV",()=>{
    const rows=buildAssetRegistry([{...APP_FUNNEL_CATALOG[0],id:"test",nextSteps:"=WEBSERVICE(1)"}],[],[]);
    expect(exportRegistryCsv(rows)).toContain("'=WEBSERVICE(1)");
  });
});
