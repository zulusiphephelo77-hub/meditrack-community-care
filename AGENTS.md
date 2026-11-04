<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Login runs through server functions in src/lib/auth.functions.ts that verify patient details or facility credentials and provision accounts on first use; why: patients sign in with hospital number/name/DOB, not email.
- Roles (patient/facility) live in user_roles; /patient and /facility layouts gate by role client-side and row-level rules protect data; why: patients must never reach facility screens.
- Stock status logic lives in src/lib/stock.ts with tests; why: one rule set for patient and facility views.
- Automation (auto-orders, expiry suggestions, cold-chain readings) runs in the `run_automation` database function, triggered from the facility layout on load and every 30s, deduped by notification keys; why: no background workers, must be idempotent across many open clients.
- Simulated dates come from `sim_clock.offset_days`; facility screens use `net.today` instead of the real date; why: "Simulate next day" must move expiry and stock maths consistently.
- Device stock intents use UUID-keyed local queues and transactional sync RPCs with stock conflict checks; why: retries must not duplicate orders or overwrite concurrent dispensing.
- The offline stock URL may display a previously saved local workspace without online role verification; server mutations still verify facility identity and ownership, and all other facility routes remain gated.
- Mobile clinic requests and schedules use owner-scoped database writes; GPS maps and SMS are explicitly fictional simulations, not connected tracking or messaging.
- Only the guarded PWA wrapper registers the generated app-shell worker on published origins; why: offline navigation must not cache or disrupt editor previews.
