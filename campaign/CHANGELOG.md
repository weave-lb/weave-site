# Phase 1 change log

The user’s “build the deliverables” prompt takes precedence over `Company/Brand/weave-community-campaign.md`. Phase 1 includes the static assets, community landing page and founder copy. Motion and PDF production remain gated on Phase 1 approval.

## Copy changes for fit

| Asset / block | Base copy | Built copy | Reason |
|---|---|---|---|
| Portrait supporting line | “The order is in. / The chasing is everything around it.” | “The order is in. Now the chasing starts.” | One readable 48px line leaves space for three source strips and the complete S2 record. It also carries the founder post’s recognition line. |
| Receipt source | “PAYMENT” / “$48.00 · Paid?” | “Paid?” / “$48.00” | The original amount and question exceed a three-column strip at 48px. Both pieces remain visible, with the payment question directly above its evidence. |
| Supplier source | “SUPPLIER 1048” / “Any update?” | “SUPPLIER” / “Update?” | Fits at 42px / 48px. The common record and sheet still identify order 1048. The source question is editorial copy, not the canonical supplier message. |
| Sheet source | “SHEET · 1048” / “Tracking?” | “SHEET 1048” / “Tracking?” | The separator made the 42px label overflow its strip. The ID and question are unchanged. |
| Square poster | Portrait’s three-line headline and supporting sentence | Two-line headline; supporting sentence omitted | A 1080×1080 recomposition preserves 48px record text, 42px metadata, the entire record, fictional label and CTA. The operational questions provide the supporting context. |

No canonical example value was changed. No landing body, form label, helper, placeholder, validation, failure or confirmation copy was shortened. The nine-row comparison copy remains exactly the base table, including the curly quotation marks. All 18 comparison cells also fit within two lines at 48px / 54px in 342px columns, ready for Phase 2.

## Spec conflicts and resolutions

| Conflict / implementation decision | Resolution |
|---|---|
| The base document and local S1/S2 source contain earlier palette tokens. | Use the explicit eight-token palette in the follow-up prompt in all new assets. Preserve the existing homepage files. |
| The official SVG includes earlier fills and a decorative orange center. | Preserve its viewBox, clipping, paths and polygons exactly; use a monochrome canonical-violet fill. This obeys the newer palette and human-action-only orange rule without redrawing the logo. |
| The base spec colors the supplier delay orange. | Use a violet flag and docket rule for the delay. Orange identifies Maya’s payment confirmation, ownership, approval and fulfilment release. |
| The base poster’s narrow left/right working area cannot hold the mandated header and 48px data. | Stack three source strips above a 952px-wide S2 record. Preserve its white sheet, 2px violet top border, violet header, numbered layers, hairlines and retained edge. Thread each source to its specified row. |
| The base poster has a plain unnumbered status list. | Use four compact numbered S2 layers: payment, supplier exception, owner/next check and held dispatch. Add Maya’s “MN” confirmation box, enlarged to 80×48px so 42px initials fit. |
| A 1200×630 link preview cannot include the full record at the poster’s minimum type sizes. | Export a title-focused crop composition: official logo, insight, recognition line, fictional label and review CTA. Update OG alt text to describe that actual image. The landing hero contains the operational demonstration. |
| The original brief disallowed public port proof. | The follow-up explicitly authorizes one unnamed port example. Use the supplied first-person wording in both founder versions and the supplied “Where this started.” body verbatim. Add no other claims or client names. |
| The base landing lacks the comparison table and origin section. | Insert the nine-row table immediately after the demonstration; insert the exact port origin section after the offer. Mobile rows stack; only payment, fulfilment and refunds carry orange human-action marks. |
| The homepage hides some mobile body copy and links elsewhere. | Keep all hero copy before the demo at 360px. No navigation. Logo stays at `#top` while `HOMEPAGE_LIVE` is false. |
| The base post can describe video dispatch and invite a video/PDF attachment. | Phase 1 instructs attachment of the static PNG and describes its open delay and held dispatch. Video and PDF wait for approval. Each ready-to-post version is below Discord’s 2000-character limit. |
| No live form backend or inbox was supplied. | Leave `FORM_ENDPOINT` empty. Production submission shows the exact failure copy and retains answers. Only `?dev=1` exposes a development warning and a clearly labeled simulated confirmation. A configured endpoint must return 2xx before confirmation appears. |
| A native no-JS POST needs an HTML action as well as a JS constant. | The builder writes both from the same endpoint setting. Native POST uses form encoding; the backend must accept it as well as JSON and assign `submittedAt` when the no-JS field is empty. The three visible fields are unchanged. |
| “Every CTA scrolls” could include the submit control itself. | Both invitation links scroll to the form and focus the first field. The form’s identically labeled submit button performs submission. There is one conversion objective. |
| Existing `.gitignore` hid every new file. | Add exceptions only for `campaign/` and `community/`, making the requested work available for review and source control. No commit or deployment was made. |

## Verification

Headless Chromium produced all exports and viewport previews. Final verification: **42/42 checks passed**. Lighthouse 13.5.0 accessibility: **100/100**. The report is `qa/lighthouse.report.html`; detailed checks are `qa/verification.json`.

Verified: 1080×1350 and 2160×2700 exports; square recomposition; 1200×630 OG; visible fictional label; copy fit and text overlaps; correct source-to-row mappings; held state; 360/768/1280 without horizontal scroll; all mobile hero copy before the demo; nine-row table; canonical amounts, names, messages and times; keyboard JSON submissions with 200/204/500 fixtures; native no-JS submission; exact validation/failure copy; retained answers; labeled development simulation; complete reduced-motion record; no JavaScript exceptions; no superseded colors in production HTML/CSS/SVG. Visual review covered the 360px poster, all compositions and the landing’s hero, record, comparison, origin and form.

The form tests used local fixtures. They do not establish delivery to a real inbox. Nothing has been published or posted.
