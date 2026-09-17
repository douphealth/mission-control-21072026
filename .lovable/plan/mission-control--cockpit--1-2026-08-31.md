# Mission Control — Ενιαίο Cockpit (Φάση 1)

Στόχος: ένα cockpit για προσωπικά + επαγγελματικά, με NOW/TODAY αρχική, Universal Capture, Site Cockpit ανά website, Decision Center, anti-chaos αυτοματισμούς, reliability indicators, sync/audit και Daily Briefing. Τίποτα άσχετο μέχρι να δουλεύει άψογα.

## 1. NOW / TODAY αρχική

Η αρχική γίνεται μία στήλη απόφασης αντί για πίνακα widgets:

- **NOW**: το ένα πράγμα που πρέπει να γίνει τώρα (score = προτεραιότητα + καθυστέρηση + deadline + decay), με κουμπιά Done / Snooze / Reschedule / Focus.
- **TODAY**: overdue, due today, ραντεβού ημέρας, πληρωμές που λήγουν, decisions που περιμένουν — σε μία ροή με άμεσες ενέργειες.
- **LATER**: συμπτυγμένο, μόνο μετρητές.
  Το υπάρχον Weekly performance μετακινείται πιο κάτω ως "Intelligence" κάρτα.

## 2. Universal Work System

Ένα ενιαίο μοντέλο εργασίας: κάθε task, reminder, recurring, payment-due και decision-followup εμφανίζεται στην ίδια ουρά με κοινά πεδία (τι, πότε, πού ανήκει, πόσο επείγει, πηγή). Ένας μηχανισμός scoring/snooze/complete για όλα, ώστε να μην υπάρχουν παράλληλες λίστες.

## 3. Universal Capture

Ένα σημείο εισόδου (⌘K / FAB) που δέχεται κείμενο, φωνή, εικόνα, paste, drag & drop και URL. Ο υπάρχων AI import pipeline επεκτείνεται ώστε:

- να ταξινομεί αυτόματα σε task / note / idea / payment / credential / link / website,
- να προτείνει website & ημερομηνία,
- Express (auto-file) ή Review πριν την αποθήκευση.

## 4. Site Cockpit (ανά website)

Νέα σελίδα `/site/:id` που ενοποιεί ό,τι υπάρχει σήμερα διάσπαρτο:
WordPress (εκδόσεις/plugins/updates), VPS & hosting credentials, GitHub repo & τελευταία commits, Search Console, GA4, Bing/Microsoft, SEO snapshot & issues, changelog αλλαγών. Κάθε πλακίδιο δείχνει τιμή, τάση, κατάσταση σύνδεσης και "τι να κάνω".

## 5. Decision Center

Κάθε finding (SEO issue, mention, ανοδική/πτωτική τάση, ληγμένο πιστοποιητικό, αποτυχία sync) γίνεται εγγραφή απόφασης με: πλαίσιο, επιλογές, προτεινόμενη ενέργεια, κουμπιά **Act / Ignore / Later**. Το Act δημιουργεί task με σύνδεση στο finding, το Ignore καταγράφεται με λόγο. Ουδέν finding χωρίς κατάληξη.

## 6. Anti-chaos

- Deduplication σε κάθε εισαγωγή και περιοδικό καθάρισμα ανά πίνακα (υπάρχει βάση, επεκτείνεται σε reminders/stream/decisions).
- Ομαδοποίηση: όμοια findings και επαναλαμβανόμενα tasks συγχωνεύονται σε ένα στοιχείο με πλήθος.
- Θόρυβος: quiet επίπεδο ανά πηγή.

## 7. Reliability indicators

Ενιαίος πίνακας κατάστασης: για κάθε πηγή (Cloud sync, Google Calendar, WP, GSC, GA4, feeds) → τελευταίος επιτυχής συγχρονισμός, εκκρεμείς αλλαγές, σφάλμα, κουμπί retry. Ίδιο badge εμφανίζεται και μέσα στα modules ώστε ποτέ να μη δείχνεται δεδομένο χωρίς την ηλικία του.

## 8. Sync, audit, ασφάλεια

- Cross-device sync: διατήρηση του dirty-journal, προσθήκη ορατής ουράς "εκκρεμή προς cloud" και conflict log.
- Audit history: κάθε δημιουργία/αλλαγή/διαγραφή/απόφαση γράφεται σε τοπικό + cloud ιστορικό με δυνατότητα επαναφοράς.
- Ασφάλεια: κανένα κλειδί στο frontend· όλες οι κλήσεις τρίτων μέσω server functions, credentials κρυπτογραφημένα, RLS ανά χρήστη.

## 9. Intelligence / Trends & Daily Briefing

Εβδομαδιαίες τάσεις (tasks, sites, audience, SEO) με σύγκριση προηγούμενης περιόδου και σύντομα AI insights. Το ημερήσιο email αναδιατάσσεται ώστε να ακολουθεί την ίδια σειρά: NOW → TODAY → Decisions → Reliability → Trends.

## Τεχνικά

- Νέοι πίνακες Dexie + cloud: `decisions`, `auditLog`, `syncHealth`, `siteMetrics`· επέκταση `websites` με σύνδεσμο σε repo/GSC/GA4 property.
- Νέο `src/lib/workQueue.ts` (ενιαίο scoring/ουρά), `src/lib/decisions.ts`, `src/lib/reliability.ts`, `src/lib/audit.ts`.
- Server functions για GSC/GA4/Bing/WP· τα μυστικά μόνο server-side.
- Νέα UI: `NowTodayPage`, `SiteCockpitPage`, `DecisionsPage`, `ReliabilityPanel`, αναβαθμισμένο Universal Capture.
- Παράδοση σε σειρά 1→9· κάθε βήμα ελέγχεται στο preview πριν προχωρήσουμε.

## Τι χρειάζομαι από εσένα

Οι συνδέσεις GSC / GA4 / Bing χρειάζονται εξουσιοδότηση όταν φτάσουμε στο βήμα 4 — θα σου ζητηθεί τότε, χωρίς να κολλήσει η υπόλοιπη υλοποίηση.
