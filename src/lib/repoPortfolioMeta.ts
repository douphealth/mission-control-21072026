export interface RepoPortfolioMeta {
  name: string;
  portfolioState: string;
  directWebsiteApp: boolean;
  parentWebsites: string[];
  productionUrls: string[];
  pagesUrls: string[];
  githubPagesUrls: string[];
  candidateUrls: string[];
  category: string;
  portfolioPriority: string;
  nextAction: string;
  evidence: string;
  verifiedAsOf: string;
}

export const REPO_PORTFOLIO_ROWS: RepoPortfolioMeta[] = [
  {
    "name": "affiliatemarketingforsuccess",
    "portfolioState": "WEBSITE CORE / RELATED",
    "directWebsiteApp": false,
    "parentWebsites": [
      "affiliatemarketingforsuccess.com"
    ],
    "productionUrls": [
      "https://affiliatemarketingforsuccess.com/"
    ],
    "pagesUrls": [],
    "githubPagesUrls": [],
    "candidateUrls": [],
    "category": "Website Core / Edge",
    "portfolioPriority": "P1",
    "nextAction": "Keep exact production-origin evidence current; do not confuse core site repo with app subdomain repos.",
    "evidence": "Current connected GitHub inventory 2026-09-18 | Existing portfolio/site mapping",
    "verifiedAsOf": "2026-09-18"
  },
  {
    "name": "affiliatemarketingforsuccess-app",
    "portfolioState": "ORIGIN CANDIDATE / NEEDS PROOF",
    "directWebsiteApp": false,
    "parentWebsites": [
      "affiliatemarketingforsuccess.com"
    ],
    "productionUrls": [
      "https://start-here.affiliatemarketingforsuccess.com/"
    ],
    "pagesUrls": [],
    "githubPagesUrls": [],
    "candidateUrls": [],
    "category": "Origin Candidate",
    "portfolioPriority": "P1",
    "nextAction": "Resolve the origin-proof task before any destructive or production change.",
    "evidence": "Current connected GitHub inventory 2026-09-18 | Origin Proof Required candidate only",
    "verifiedAsOf": "2026-09-18"
  },
  {
    "name": "body-recomp-os-guru-7c1356da",
    "portfolioState": "DIRECT WEBSITE APP",
    "directWebsiteApp": true,
    "parentWebsites": [
      "gearuptofit.com"
    ],
    "productionUrls": [
      "https://gearuptofit.com/fitness-plan/"
    ],
    "pagesUrls": [
      "https://fitness-plan.gearup-flow-master.pages.dev/"
    ],
    "githubPagesUrls": [],
    "candidateUrls": [],
    "category": "Production Website App",
    "portfolioPriority": "P0",
    "nextAction": "Use WEBSITE APP REPOS as the production control row; capture deploy commit before writes.",
    "evidence": "Current connected GitHub inventory 2026-09-18 | WEBSITE APP REPOS direct relationship",
    "verifiedAsOf": "2026-09-18"
  },
  {
    "name": "claw-skills-hub",
    "portfolioState": "DIRECT WEBSITE APP",
    "directWebsiteApp": true,
    "parentWebsites": [
      "openclaw-skillshub.com"
    ],
    "productionUrls": [
      "https://openclaw-skillshub.com/"
    ],
    "pagesUrls": [
      "https://claw-skills-hub.pages.dev/"
    ],
    "githubPagesUrls": [],
    "candidateUrls": [],
    "category": "Production Website App",
    "portfolioPriority": "P1",
    "nextAction": "Use WEBSITE APP REPOS as the production control row; capture deploy commit before writes.",
    "evidence": "Current connected GitHub inventory 2026-09-18 | WEBSITE APP REPOS direct relationship",
    "verifiedAsOf": "2026-09-18"
  },
  {
    "name": "efficientgptprompts-emergency-home",
    "portfolioState": "WEBSITE CORE / RELATED",
    "directWebsiteApp": false,
    "parentWebsites": [
      "efficientgptprompts.com"
    ],
    "productionUrls": [
      "https://efficientgptprompts.com/"
    ],
    "pagesUrls": [],
    "githubPagesUrls": [],
    "candidateUrls": [],
    "category": "Website Core / Edge",
    "portfolioPriority": "P1",
    "nextAction": "Keep exact production-origin evidence current; do not confuse core site repo with app subdomain repos.",
    "evidence": "Current connected GitHub inventory 2026-09-18 | Existing portfolio/site mapping",
    "verifiedAsOf": "2026-09-18"
  },
  {
    "name": "family-nutrition-os",
    "portfolioState": "STANDALONE LIVE APP",
    "directWebsiteApp": false,
    "parentWebsites": [
      "Standalone / family"
    ],
    "productionUrls": [
      "https://douphealth.github.io/family-nutrition-os/"
    ],
    "pagesUrls": [],
    "githubPagesUrls": [
      "https://douphealth.github.io/family-nutrition-os/"
    ],
    "candidateUrls": [],
    "category": "Standalone PWA",
    "portfolioPriority": "P1",
    "nextAction": "Keep GitHub Pages deployment evidence current; verify PWA/offline smoke test after changes.",
    "evidence": "Current connected GitHub inventory 2026-09-18",
    "verifiedAsOf": "2026-09-18"
  },
  {
    "name": "form-beauty-studio",
    "portfolioState": "DIRECT WEBSITE APP",
    "directWebsiteApp": true,
    "parentWebsites": [
      "imagealchemy.app"
    ],
    "productionUrls": [
      "https://imagealchemy.app/"
    ],
    "pagesUrls": [],
    "githubPagesUrls": [],
    "candidateUrls": [],
    "category": "Production Website App",
    "portfolioPriority": "P1",
    "nextAction": "Use WEBSITE APP REPOS as the production control row; capture deploy commit before writes.",
    "evidence": "Current connected GitHub inventory 2026-09-18 | WEBSITE APP REPOS direct relationship",
    "verifiedAsOf": "2026-09-18"
  },
  {
    "name": "frenchie-care-compass",
    "portfolioState": "DIRECT WEBSITE APP",
    "directWebsiteApp": true,
    "parentWebsites": [
      "frenchyfab.com"
    ],
    "productionUrls": [
      "https://care-plan.frenchyfab.com/"
    ],
    "pagesUrls": [],
    "githubPagesUrls": [
      "https://douphealth.github.io/frenchie-care-compass/"
    ],
    "candidateUrls": [],
    "category": "Production Website App",
    "portfolioPriority": "P1",
    "nextAction": "Use WEBSITE APP REPOS as the production control row; capture deploy commit before writes.",
    "evidence": "Current connected GitHub inventory 2026-09-18 | WEBSITE APP REPOS direct relationship",
    "verifiedAsOf": "2026-09-18"
  },
  {
    "name": "frenchyfab",
    "portfolioState": "WEBSITE CORE / RELATED",
    "directWebsiteApp": false,
    "parentWebsites": [
      "frenchyfab.com"
    ],
    "productionUrls": [
      "https://frenchyfab.com/"
    ],
    "pagesUrls": [],
    "githubPagesUrls": [],
    "candidateUrls": [],
    "category": "Website Core / Edge",
    "portfolioPriority": "P1",
    "nextAction": "Keep exact production-origin evidence current; do not confuse core site repo with app subdomain repos.",
    "evidence": "Current connected GitHub inventory 2026-09-18 | Existing portfolio/site mapping",
    "verifiedAsOf": "2026-09-18"
  },
  {
    "name": "gearup-flow-master",
    "portfolioState": "WEBSITE CORE / RELATED",
    "directWebsiteApp": false,
    "parentWebsites": [
      "gearuptofit.com"
    ],
    "productionUrls": [
      "https://gearuptofit.com/"
    ],
    "pagesUrls": [],
    "githubPagesUrls": [],
    "candidateUrls": [],
    "category": "Website Core / Edge",
    "portfolioPriority": "P1",
    "nextAction": "Keep exact production-origin evidence current; do not confuse core site repo with app subdomain repos.",
    "evidence": "Current connected GitHub inventory 2026-09-18 | Existing portfolio/site mapping",
    "verifiedAsOf": "2026-09-18"
  },
  {
    "name": "gearuptofit",
    "portfolioState": "WEBSITE CORE / RELATED",
    "directWebsiteApp": false,
    "parentWebsites": [
      "gearuptofit.com"
    ],
    "productionUrls": [
      "https://gearuptofit.com/"
    ],
    "pagesUrls": [],
    "githubPagesUrls": [],
    "candidateUrls": [],
    "category": "Website Core / Edge",
    "portfolioPriority": "P1",
    "nextAction": "Keep exact production-origin evidence current; do not confuse core site repo with app subdomain repos.",
    "evidence": "Current connected GitHub inventory 2026-09-18 | Existing portfolio/site mapping",
    "verifiedAsOf": "2026-09-18"
  },
  {
    "name": "gearuptogrow",
    "portfolioState": "WEBSITE CORE / RELATED",
    "directWebsiteApp": false,
    "parentWebsites": [
      "gearuptogrow.com"
    ],
    "productionUrls": [
      "https://gearuptogrow.com/"
    ],
    "pagesUrls": [],
    "githubPagesUrls": [],
    "candidateUrls": [],
    "category": "Website Core / Edge",
    "portfolioPriority": "P1",
    "nextAction": "Keep exact production-origin evidence current; do not confuse core site repo with app subdomain repos.",
    "evidence": "Current connected GitHub inventory 2026-09-18 | Existing portfolio/site mapping",
    "verifiedAsOf": "2026-09-18"
  },
  {
    "name": "grow-stack-engine-945df4aa",
    "portfolioState": "DIRECT WEBSITE APP",
    "directWebsiteApp": true,
    "parentWebsites": [
      "gearuptogrow.com"
    ],
    "productionUrls": [
      "https://grow-plan.gearuptogrow.com/"
    ],
    "pagesUrls": [],
    "githubPagesUrls": [],
    "candidateUrls": [],
    "category": "Production Website App",
    "portfolioPriority": "P1",
    "nextAction": "Use WEBSITE APP REPOS as the production control row; capture deploy commit before writes.",
    "evidence": "Current connected GitHub inventory 2026-09-18 | WEBSITE APP REPOS direct relationship",
    "verifiedAsOf": "2026-09-18"
  },
  {
    "name": "mice-solver-pro",
    "portfolioState": "DIRECT WEBSITE APP",
    "directWebsiteApp": true,
    "parentWebsites": [
      "micegoneguide.com"
    ],
    "productionUrls": [
      "https://elimination.micegoneguide.com/"
    ],
    "pagesUrls": [],
    "githubPagesUrls": [
      "https://douphealth.github.io/mice-solver-pro/"
    ],
    "candidateUrls": [],
    "category": "Production Website App",
    "portfolioPriority": "P1",
    "nextAction": "Use WEBSITE APP REPOS as the production control row; capture deploy commit before writes.",
    "evidence": "Current connected GitHub inventory 2026-09-18 | WEBSITE APP REPOS direct relationship",
    "verifiedAsOf": "2026-09-18"
  },
  {
    "name": "micegoneguide",
    "portfolioState": "WEBSITE CORE / RELATED",
    "directWebsiteApp": false,
    "parentWebsites": [
      "micegoneguide.com"
    ],
    "productionUrls": [
      "https://micegoneguide.com/"
    ],
    "pagesUrls": [],
    "githubPagesUrls": [],
    "candidateUrls": [],
    "category": "Website Core / Edge",
    "portfolioPriority": "P1",
    "nextAction": "Keep exact production-origin evidence current; do not confuse core site repo with app subdomain repos.",
    "evidence": "Current connected GitHub inventory 2026-09-18 | Existing portfolio/site mapping",
    "verifiedAsOf": "2026-09-18"
  },
  {
    "name": "mystic-blueprint-maker",
    "portfolioState": "DIRECT WEBSITE APP",
    "directWebsiteApp": true,
    "parentWebsites": [
      "mysticaldigits.com"
    ],
    "productionUrls": [
      "https://life-path.mysticaldigits.com/"
    ],
    "pagesUrls": [],
    "githubPagesUrls": [
      "https://douphealth.github.io/mystic-blueprint-maker/"
    ],
    "candidateUrls": [],
    "category": "Production Website App",
    "portfolioPriority": "P1",
    "nextAction": "Use WEBSITE APP REPOS as the production control row; capture deploy commit before writes.",
    "evidence": "Current connected GitHub inventory 2026-09-18 | WEBSITE APP REPOS direct relationship",
    "verifiedAsOf": "2026-09-18"
  },
  {
    "name": "mystical-digits",
    "portfolioState": "WEBSITE CORE / RELATED",
    "directWebsiteApp": false,
    "parentWebsites": [
      "mysticaldigits.com"
    ],
    "productionUrls": [
      "https://mysticaldigits.com/"
    ],
    "pagesUrls": [],
    "githubPagesUrls": [],
    "candidateUrls": [],
    "category": "Website Core / Edge",
    "portfolioPriority": "P1",
    "nextAction": "Keep exact production-origin evidence current; do not confuse core site repo with app subdomain repos.",
    "evidence": "Current connected GitHub inventory 2026-09-18 | Existing portfolio/site mapping",
    "verifiedAsOf": "2026-09-18"
  },
  {
    "name": "neural-prompt-coach",
    "portfolioState": "DIRECT WEBSITE APP",
    "directWebsiteApp": true,
    "parentWebsites": [
      "efficientgptprompts.com",
      "promptgrade.app"
    ],
    "productionUrls": [
      "https://promptgrade.app/",
      "https://promptgrade.efficientgptprompts.com/"
    ],
    "pagesUrls": [],
    "githubPagesUrls": [],
    "candidateUrls": [
      "https://promptgrade-egp.gearup-flow-master.pages.dev/"
    ],
    "category": "Production Website App",
    "portfolioPriority": "P0",
    "nextAction": "Use WEBSITE APP REPOS as the production control row; capture deploy commit before writes.",
    "evidence": "Current connected GitHub inventory 2026-09-18 | WEBSITE APP REPOS direct relationship",
    "verifiedAsOf": "2026-09-18"
  },
  {
    "name": "nutri-match-wiz",
    "portfolioState": "ORIGIN CANDIDATE / NEEDS PROOF",
    "directWebsiteApp": false,
    "parentWebsites": [
      "gearuptofit.com"
    ],
    "productionUrls": [
      "https://supplement.gearuptofit.com/"
    ],
    "pagesUrls": [],
    "githubPagesUrls": [],
    "candidateUrls": [],
    "category": "Origin Candidate",
    "portfolioPriority": "P1",
    "nextAction": "Resolve the origin-proof task before any destructive or production change.",
    "evidence": "Current connected GitHub inventory 2026-09-18 | Origin Proof Required candidate only",
    "verifiedAsOf": "2026-09-18"
  },
  {
    "name": "plantastic-haven-pro-8e23ae56",
    "portfolioState": "DIRECT WEBSITE APP",
    "directWebsiteApp": true,
    "parentWebsites": [
      "plantastichaven.com"
    ],
    "productionUrls": [
      "https://procare.plantastichaven.com/"
    ],
    "pagesUrls": [],
    "githubPagesUrls": [],
    "candidateUrls": [
      "https://plantastic-procare.gearup-flow-master.pages.dev/"
    ],
    "category": "Production Website App",
    "portfolioPriority": "P1",
    "nextAction": "Use WEBSITE APP REPOS as the production control row; capture deploy commit before writes.",
    "evidence": "Current connected GitHub inventory 2026-09-18 | WEBSITE APP REPOS direct relationship",
    "verifiedAsOf": "2026-09-18"
  },
  {
    "name": "plantastichaven",
    "portfolioState": "WEBSITE CORE / RELATED",
    "directWebsiteApp": false,
    "parentWebsites": [
      "plantastichaven.com"
    ],
    "productionUrls": [
      "https://plantastichaven.com/"
    ],
    "pagesUrls": [],
    "githubPagesUrls": [],
    "candidateUrls": [],
    "category": "Website Core / Edge",
    "portfolioPriority": "P1",
    "nextAction": "Keep exact production-origin evidence current; do not confuse core site repo with app subdomain repos.",
    "evidence": "Current connected GitHub inventory 2026-09-18 | Existing portfolio/site mapping",
    "verifiedAsOf": "2026-09-18"
  },
  {
    "name": "runmatch-ai-buddy-1282c193",
    "portfolioState": "DIRECT WEBSITE APP",
    "directWebsiteApp": true,
    "parentWebsites": [
      "gearuptofit.com"
    ],
    "productionUrls": [
      "https://gearuptofit.com/shoe-finder/"
    ],
    "pagesUrls": [
      "https://runmatch.gearup-flow-master.pages.dev/"
    ],
    "githubPagesUrls": [],
    "candidateUrls": [
      "https://gearup-flow-master.pages.dev/shoe-finder/"
    ],
    "category": "Production Website App",
    "portfolioPriority": "P0",
    "nextAction": "Use WEBSITE APP REPOS as the production control row; capture deploy commit before writes.",
    "evidence": "Current connected GitHub inventory 2026-09-18 | WEBSITE APP REPOS direct relationship",
    "verifiedAsOf": "2026-09-18"
  },
  {
    "name": "sota-god-mode-003-love",
    "portfolioState": "ORIGIN CANDIDATE / NEEDS PROOF",
    "directWebsiteApp": false,
    "parentWebsites": [
      "contentoptimizer.app"
    ],
    "productionUrls": [
      "https://contentoptimizer.app/"
    ],
    "pagesUrls": [],
    "githubPagesUrls": [],
    "candidateUrls": [],
    "category": "Origin Candidate",
    "portfolioPriority": "P0",
    "nextAction": "Resolve the origin-proof task before any destructive or production change.",
    "evidence": "Current connected GitHub inventory 2026-09-18 | Origin Proof Required candidate only",
    "verifiedAsOf": "2026-09-18"
  },
  {
    "name": "sota-god-mode-014-love",
    "portfolioState": "ORIGIN CANDIDATE / NEEDS PROOF",
    "directWebsiteApp": false,
    "parentWebsites": [
      "contentoptimizer.app"
    ],
    "productionUrls": [
      "https://contentoptimizer.app/"
    ],
    "pagesUrls": [],
    "githubPagesUrls": [],
    "candidateUrls": [],
    "category": "Origin Candidate",
    "portfolioPriority": "P0",
    "nextAction": "Resolve the origin-proof task before any destructive or production change.",
    "evidence": "Current connected GitHub inventory 2026-09-18 | Origin Proof Required candidate only",
    "verifiedAsOf": "2026-09-18"
  },
  {
    "name": "wrist-wonderland-hub",
    "portfolioState": "ORIGIN CANDIDATE / NEEDS PROOF",
    "directWebsiteApp": false,
    "parentWebsites": [
      "gearuptofit.com"
    ],
    "productionUrls": [
      "https://gearuptofit.com/watch-match/"
    ],
    "pagesUrls": [],
    "githubPagesUrls": [],
    "candidateUrls": [],
    "category": "Origin Candidate",
    "portfolioPriority": "P0",
    "nextAction": "Resolve the origin-proof task before any destructive or production change.",
    "evidence": "Current connected GitHub inventory 2026-09-18 | Origin Proof Required candidate only",
    "verifiedAsOf": "2026-09-18"
  }
];

export const REPO_PORTFOLIO_META = Object.fromEntries(
  REPO_PORTFOLIO_ROWS.map((row) => [row.name, row]),
) as Record<string, RepoPortfolioMeta>;
