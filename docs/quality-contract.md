# ExpenseIntel quality contract

ExpenseIntel should fail visibly before it overclaims evidence. Production changes are expected to preserve four contracts:

1. **Evidence contract** — user, public, verified, modeled and unknown evidence remain distinguishable; source and observation time stay attached to material claims.
2. **Data contract** — the public source catalog is machine-readable, reviewed, uniquely keyed and explicit that catalog presence does not imply live integration.
3. **SEO contract** — key decision pages carry title, description, canonical and robots metadata; redirect-only routes are excluded from the sitemap.
4. **Runtime contract** — all JavaScript parses, canonical routes exist, primary navigation is consistent, and scheduled production smoke checks cover the main product and status endpoints.

The automated gate is `.github/workflows/quality-gate-v2.yml`. The scheduled live check is `.github/workflows/production-smoke-v1.yml`.
