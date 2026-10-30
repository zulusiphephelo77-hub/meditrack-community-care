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
