## Standalone runtime
- [x] Remove Lovable-dependent cloud sync, auth prompts, and status UI
- [x] Remove Lovable runtime integrations from active app paths
- [x] Keep IndexedDB persistence, local snapshots, JSON export, and restore as the defaults
- [x] Replace the build plugin with the standard TanStack Start Vite plugin
- [x] Disable server email because standalone servers cannot access private browser records
- [x] Verify tests, type safety, and browser behavior

## Standalone account sync and deployment
- [ ] Restore optional self-hosted account sync without Lovable runtime services
- [ ] Preserve direct Google sign-in, Tasks, and Calendar synchronization
- [ ] Stop unauthenticated Google requests and hydration warnings
- [ ] Repair the Cloudflare Pages deployment configuration and verify the target URL
- [ ] Verify local-only and signed-in workflows end to end
