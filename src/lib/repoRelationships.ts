export interface RepoRelationship {
  appId: string;
  appName: string;
  parentWebsite: string;
  connectionType: string;
  aliasUrl: string | null;
  canonicalUrl: string | null;
  pagesUrl: string | null;
  githubPagesUrl: string | null;
  candidateUrl: string | null;
  hosting: string;
  branch: string;
  evidenceStatus: string;
  liveStatus: string;
  priority: string;
  nextAction: string;
}

export const REPO_RELATIONSHIPS: Record<string, RepoRelationship[]> = {
  "body-recomp-os-guru-7c1356da": [
    {
      "appId": "MAN-091",
      "appName": "Body Recomp OS / Fitness Plan",
      "parentWebsite": "gearuptofit.com",
      "connectionType": "Routed App + subdomain",
      "aliasUrl": "https://fitness-plan.gearuptofit.com/",
      "canonicalUrl": "https://gearuptofit.com/fitness-plan/",
      "pagesUrl": "https://fitness-plan.gearup-flow-master.pages.dev/",
      "githubPagesUrl": null,
      "candidateUrl": null,
      "hosting": "Cloudflare Worker → Pages",
      "branch": "main",
      "evidenceStatus": "STRONG — app repo/product evidence + observed Pages upstream; deployed commit still needs proof",
      "liveStatus": "Fitness Plan is a GearUpToFit routed app; production upstream is documented.",
      "priority": "P0",
      "nextAction": "Prove deployed commit/asset hash against body-recomp repo variants and lock one canonical source."
    }
  ],
  "runmatch-ai-buddy-1282c193": [
    {
      "appId": "MAN-090",
      "appName": "RunMatch / Shoe Finder",
      "parentWebsite": "gearuptofit.com",
      "connectionType": "Routed App + legacy subdomain",
      "aliasUrl": "https://shoe-match.gearuptofit.com/",
      "canonicalUrl": "https://gearuptofit.com/shoe-finder/",
      "pagesUrl": "https://runmatch.gearup-flow-master.pages.dev/",
      "githubPagesUrl": null,
      "candidateUrl": "https://gearup-flow-master.pages.dev/shoe-finder/",
      "hosting": "Cloudflare Worker → Pages",
      "branch": "main",
      "evidenceStatus": "VERIFIED SOURCE REPO + OBSERVED PAGES UPSTREAM",
      "liveStatus": "Legacy shoe-match subdomain is consolidated; current routed app is on the GearUpToFit apex path.",
      "priority": "P0",
      "nextAction": "Capture deployed commit/asset hash for the current Worker upstream; then mark the canonical production source as locked."
    }
  ],
  "mystic-blueprint-maker": [
    {
      "appId": "MAN-092",
      "appName": "Life Path / Mystical Blueprint",
      "parentWebsite": "mysticaldigits.com",
      "connectionType": "Subdomain App",
      "aliasUrl": "https://life-path.mysticaldigits.com/",
      "canonicalUrl": "https://life-path.mysticaldigits.com/",
      "pagesUrl": null,
      "githubPagesUrl": "https://douphealth.github.io/mystic-blueprint-maker/",
      "candidateUrl": null,
      "hosting": "GitHub Pages + custom CNAME",
      "branch": "gh-pages deploy; main source",
      "evidenceStatus": "VERIFIED — GitHub Pages enabled + gh-pages CNAME = life-path.mysticaldigits.com",
      "liveStatus": "Direct GitHub Pages custom-domain app.",
      "priority": "P1",
      "nextAction": "Record current gh-pages deploy commit and keep main↔gh-pages deployment evidence current."
    }
  ],
  "frenchie-care-compass": [
    {
      "appId": "MAN-093",
      "appName": "Frenchie Care Compass",
      "parentWebsite": "frenchyfab.com",
      "connectionType": "Subdomain App",
      "aliasUrl": "https://care-plan.frenchyfab.com/",
      "canonicalUrl": "https://care-plan.frenchyfab.com/",
      "pagesUrl": null,
      "githubPagesUrl": "https://douphealth.github.io/frenchie-care-compass/",
      "candidateUrl": null,
      "hosting": "GitHub Pages + Cloudflare custom domain",
      "branch": "main source → gh-pages deploy",
      "evidenceStatus": "VERIFIED — deployment reference + gh-pages CNAME = care-plan.frenchyfab.com",
      "liveStatus": "Direct static React/Vite app deployed from this repository.",
      "priority": "P1",
      "nextAction": "Capture current main and gh-pages commit SHAs in the evidence log before future production edits."
    }
  ],
  "mice-solver-pro": [
    {
      "appId": "MAN-094",
      "appName": "Mice Solver Pro / Elimination Plan",
      "parentWebsite": "micegoneguide.com",
      "connectionType": "Subdomain App",
      "aliasUrl": "https://elimination.micegoneguide.com/",
      "canonicalUrl": "https://elimination.micegoneguide.com/",
      "pagesUrl": null,
      "githubPagesUrl": "https://douphealth.github.io/mice-solver-pro/",
      "candidateUrl": null,
      "hosting": "GitHub Pages + Cloudflare custom domain",
      "branch": "main source → gh-pages deploy",
      "evidenceStatus": "VERIFIED — operational deployment reference explicitly names repo + subdomain",
      "liveStatus": "Static React/Vite app deployed from douphealth/mice-solver-pro.",
      "priority": "P1",
      "nextAction": "Capture current gh-pages CNAME/deploy commit if present and keep the production route proof with the repo."
    }
  ],
  "grow-stack-engine-945df4aa": [
    {
      "appId": "MAN-095",
      "appName": "GrowOS",
      "parentWebsite": "gearuptogrow.com",
      "connectionType": "Subdomain App",
      "aliasUrl": "https://grow-plan.gearuptogrow.com/",
      "canonicalUrl": "https://gearuptogrow.com/growos/",
      "pagesUrl": null,
      "githubPagesUrl": null,
      "candidateUrl": null,
      "hosting": "Cloudflare Pages / custom subdomain",
      "branch": "main",
      "evidenceStatus": "VERIFIED APP RELATION — repo and subdomain documented; exact Pages hostname not proven in current evidence",
      "liveStatus": "GrowOS Vite app is tied to grow-plan.gearuptogrow.com; canonical currently points to /growos/.",
      "priority": "P1",
      "nextAction": "Query Cloudflare project metadata/DNS and record the exact pages.dev hostname + deployed commit."
    }
  ],
  "plantastic-haven-pro-8e23ae56": [
    {
      "appId": "MAN-096",
      "appName": "PlantasticHaven Pro / ProCare",
      "parentWebsite": "plantastichaven.com",
      "connectionType": "Subdomain App",
      "aliasUrl": "https://procare.plantastichaven.com/",
      "canonicalUrl": "https://procare.plantastichaven.com/",
      "pagesUrl": null,
      "githubPagesUrl": null,
      "candidateUrl": "https://plantastic-procare.gearup-flow-master.pages.dev/",
      "hosting": "Cloudflare Worker → Pages branch alias",
      "branch": "main source; Pages branch alias documented",
      "evidenceStatus": "VERIFIED APP RELATION — repo canonical + operational deployment reference; branch alias is related until current upstream re-proved",
      "liveStatus": "Production custom subdomain uses a Worker/Pages architecture.",
      "priority": "P1",
      "nextAction": "Re-prove the current Worker upstream and Pages branch alias; record deployed hash without changing production."
    }
  ],
  "neural-prompt-coach": [
    {
      "appId": "MAN-097",
      "appName": "PromptGrade",
      "parentWebsite": "efficientgptprompts.com",
      "connectionType": "Subdomain App",
      "aliasUrl": "https://promptgrade.efficientgptprompts.com/",
      "canonicalUrl": "https://promptgrade.efficientgptprompts.com/",
      "pagesUrl": null,
      "githubPagesUrl": null,
      "candidateUrl": "https://promptgrade-egp.gearup-flow-master.pages.dev/",
      "hosting": "Cloudflare Worker → Pages branch alias",
      "branch": "main source; promptgrade-egp Pages branch documented",
      "evidenceStatus": "VERIFIED APP RELATION — repo canonical + operational source/deploy reference",
      "liveStatus": "PromptGrade app subdomain served through Worker/Pages branch architecture.",
      "priority": "P1",
      "nextAction": "Record exact current Worker upstream/deployment ID and deployed commit; keep old subdomain and promptgrade.app migration state explicit."
    },
    {
      "appId": "MAN-099",
      "appName": "PromptGrade",
      "parentWebsite": "promptgrade.app",
      "connectionType": "Root App / canonical migration",
      "aliasUrl": "https://promptgrade.app/",
      "canonicalUrl": "https://promptgrade.app/",
      "pagesUrl": null,
      "githubPagesUrl": null,
      "candidateUrl": "https://promptgrade-egp.gearup-flow-master.pages.dev/",
      "hosting": "Standalone root app — production host origin still needs proof",
      "branch": "main",
      "evidenceStatus": "STRONG PRODUCT MATCH — repo is PromptGrade, but repository HTML still references the older EGP subdomain",
      "liveStatus": "Public root app is PromptGrade; origin/canonical migration should be reconciled with the older subdomain deployment.",
      "priority": "P0",
      "nextAction": "Prove promptgrade.app serving origin/commit and update the canonical source decision before retiring any older PromptGrade route."
    }
  ],
  "claw-skills-hub": [
    {
      "appId": "CF-018",
      "appName": "claw-skills-hub",
      "parentWebsite": "openclaw-skillshub.com",
      "connectionType": "Root App",
      "aliasUrl": "https://openclaw-skillshub.com/",
      "canonicalUrl": "https://openclaw-skillshub.com/",
      "pagesUrl": "https://claw-skills-hub.pages.dev/",
      "githubPagesUrl": null,
      "candidateUrl": null,
      "hosting": "Cloudflare Pages + custom domain",
      "branch": "Cloudflare project source (branch not in export)",
      "evidenceStatus": "VERIFIED — supplied Cloudflare Pages export source_repo + custom domain",
      "liveStatus": "Exact Cloudflare custom-domain mapping in supplied inventory",
      "priority": "P2",
      "nextAction": "Open the live app and GitHub source; verify current deploy freshness/branch before making changes."
    }
  ],
  "form-beauty-studio": [
    {
      "appId": "MAN-098",
      "appName": "ImageAlchemy",
      "parentWebsite": "imagealchemy.app",
      "connectionType": "Root App",
      "aliasUrl": "https://imagealchemy.app/",
      "canonicalUrl": "https://imagealchemy.app/",
      "pagesUrl": null,
      "githubPagesUrl": null,
      "candidateUrl": null,
      "hosting": "Standalone web app — exact serving host to retain in evidence",
      "branch": "main",
      "evidenceStatus": "VERIFIED PRODUCT/DOMAIN — index canonical + JSON-LD sameAs points to this GitHub repo",
      "liveStatus": "Repo directly self-identifies ImageAlchemy and the production root domain.",
      "priority": "P1",
      "nextAction": "Capture exact production hosting/deploy ID and commit so domain→repo origin is fully auditable."
    }
  ]
};
