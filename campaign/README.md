# Weave community campaign — Phase 1

Built in `Weave-site/`, the site root, so `community/index.html` can be published as `/community`. The current homepage is unchanged. Source brief: `../Company/Brand/weave-community-campaign.md`, with the user’s follow-up overrides applied.

## Deliverables

- `poster/poster.html`: fixed 1080×1350 master. `?format=square` selects the 1080×1080 recomposition; `?format=og` selects the 1200×630 preview composition.
- `poster/weave-community-poster.png`: attach this 1× portrait PNG to the Discord post.
- `poster/weave-community-poster@2x.png`: 2160×2700 export.
- `poster/weave-community-poster-square.png`: square export.
- `poster/og.png`: link-preview export, duplicated in `../community/assets/og.png` for deployment.
- `../community/index.html`: semantic landing page with inline scoped CSS/JS, local font/logo, one review form, comparison table and the exact authorized port proof.
- `post.md`: primary founder post, short version and caption; default posting founder Ibrahim.
- `components/record.css`: shared adaptation of the current homepage S2 record.
- `data/order-1048.json`: canonical fictional dataset used for this campaign.
- `qa/`: viewport and section captures, 360px poster, form failure capture, detailed verification and Lighthouse reports.
- `CHANGELOG.md`: copy-fit changes and every resolved spec conflict.

## Rebuild and preview

From `Weave-site/`:

```powershell
python campaign/tools/build_phase1.py
python -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/community/` to preview the page, or append `?dev=1` to exercise the labeled development success state with the empty endpoint. Preview the poster at `http://127.0.0.1:8000/campaign/poster/poster.html`.

For exports and verification:

```powershell
python campaign/tools/verify_phase1.py --lighthouse
```

The verifier owns its local server at port 8765 and a temporary Chromium debugging port 9222. It captures exports, copies the OG image to the deployment assets, tests responsive behavior and form fixtures, and writes reports. The environment used Python 3.12, Playwright 1.62.0, Pillow 12.3.0 and Lighthouse 13.5.0. Chromium is installed through Playwright. Lighthouse uses the installed npm cache when available; otherwise the verifier resolves the pinned CLI. No third-party services are called by the campaign page.

The builder requires the official logo at `../Company/Brand/logo-assets/master/weave-logo.svg` and the font at `assets/fonts/Montserrat/Montserrat-VariableFont_wght.ttf`. It stops if either is missing. Exported logo geometry is unchanged; only its fills and accessible title are adapted. Font copies are byte-identical and include the supplied OFL license.

## Configuration before publication

Set the following at the top of `tools/build_phase1.py`, then rebuild. `config.json` records the generated settings; editing that JSON alone does not change the page.

| Setting | Current value | Required decision |
|---|---|---|
| `COMMUNITY_NAME` | `[COMMUNITY_NAME]` | Name, if it should appear. Until then the landing says “this community” and posts say “members here.” |
| `FORM_ENDPOINT` | Empty string | Real endpoint that receives and stores the request. |
| `NOTIFICATION_INBOX` | `[NOTIFICATION_INBOX]` | Approved Weave inbox and notification routing, configured in the backend. |
| `POSTING_FOUNDER` | `Ibrahim` | Confirm posting founder. Setting `Ali` uses the supplied co-founder proof sentence. |
| `HOMEPAGE_LIVE` | `False` | Keep false while the homepage is “Coming soon.” Only a true value links the logo to `/`. |

The JSON request is exactly `{name, email, process, source:"community", submittedAt}`. `submittedAt` is an ISO timestamp. The endpoint must return a 2xx response only after receipt; the page then displays the supplied confirmation. It must also accept a native `application/x-www-form-urlencoded` POST when JavaScript is unavailable, assign a timestamp if `submittedAt` is empty, validate the fields and return an appropriate confirmation or error page. An external endpoint needs CORS support for the deployed origin. No backend, notification inbox or scheduling tool has been invented.

Both the native form action and `const FORM_ENDPOINT` are generated from the same setting. The unconfigured production page never simulates a received request. The development warning and mock confirmation appear only with `?dev=1` and an empty endpoint, and explicitly say no request was delivered.

Publish the complete `community/` directory, including its font, SVG, license and OG PNG. It has no dependency on `build/`, the root homepage or campaign tools. Test a real request and notification delivery before sharing the link. Scheduling remains a founder’s email follow-up; no response deadline, price or offer capacity is stated.

## Phase 2

The user requested approval of Phase 1 before D4 motion and D5 PDF production. Neither has been built. Once approved, reuse this record, palette, data and components, applying the base storyboard’s reading holds and the newer human-action orange rules.
