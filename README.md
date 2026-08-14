# haulq-site

Static marketing site for HaulQ. Astro 5 + Tailwind 4, deployed to Cloudflare Pages.

    pnpm install
    pnpm dev        # http://localhost:4321
    pnpm build      # -> dist/

Pages live at `/`, `/products`, `/products/<slug>`, `/pricing`, `/waitlist`,
`/tools/mc-lookup`, `/tools/profit-calculator`.

Product copy lives in one place: `src/consts.ts`. Adding a product there creates
its page, its nav entry, its footer link and its waitlist checkbox.

Brand tokens are in `src/styles/global.css` under `@theme`.

`functions/` holds Cloudflare Pages Functions, which give the waitlist form and
the MC lookup a working backend with no separate server. See the deployment
runbook for the environment variables they need.
