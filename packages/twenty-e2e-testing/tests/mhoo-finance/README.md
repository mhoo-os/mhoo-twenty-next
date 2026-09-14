# Finance installed visual audit

This suite checks the five installed Hass Kitchen Finance pages in desktop and
narrow viewports. It exercises the explicit synthetic preview, returns to live
Workspace mode, checks representative read-only interactions and saves local
screenshots. It does **not** import bank data, mutate records, grant access or
prove provider connectivity.

Use an operator-supplied Playwright storage-state file for an account already
authorized to inspect this Workspace. Do not export the user's current browser
cookies or tokens into an agent transcript. Keep the state file outside Git and
restrict its filesystem permissions. The suite does not create or refresh it.

```sh
cd packages/twenty-e2e-testing
FINANCE_STORAGE_STATE=/absolute/private/path/state.json \
  yarn playwright test --config finance-audit.config.ts
```

Set `FINANCE_BASE_URL` only to target another explicitly authorized installation;
the page IDs in the spec must match that installation. Screenshots remain under
ignored `run_results/finance-audit/`; they can contain private Workspace data,
so handle or delete them under the Workspace's retention rules. The suite
intentionally disables trace and video collection. A denied/failed read is
captured and checked for no synthetic fallback, but it does not count as proof
that the authorized data path works. Review such runs separately.
