---
name: rein-people
description: Add or update public Rein staff, Core Contributor, Contributor, or Community Member profiles and prepare a website PR. Use for People directory maintenance, not granting account permissions.
---

# Maintain Rein People

Work in a current checkout of `rein-protocol-foundation/ReinProtocolFoundation`. Read its AGENTS.md and this skill from that checkout before editing. The canonical data is `data/people.json`; schema and policies are in `lib/people/schema.ts` and `lib/people/directory.ts`. Usually change only the data and a portrait in `public/people/`.

## Confirm facts and identity

Use the user's request, submitted profile form, and linked public sources. Distinguish professional title from Rein identity. Explicitly establish one of `board`, `staff`, `core_contributor`, `contributor`, `community_member`; do not infer a role from seniority or employer. Ask only for missing or conflicting facts. A public profile does not grant backend access or governance rights.

Check publication authorization from the request/form. Keep private contact details, raw responses, and consent credentials out of commits and PRs. Use only approved public facts. Keep existing slug when updating; check names and URLs for duplicates before creating a new slug.

## Add the record

Copy a matching existing record and follow the schema. Set name, organization role label, profession, biography, public links, portrait and alt text, and sort_order. Use a unique lowercase hyphenated slug. Nonstaff biographies must be at most 30 English words. Preserve approved staff biographies. For a new entry use the next available sort_order; role grouping takes precedence over this order.

Default `homepage_featured` to false and `homepage_order` to 100. Only board/staff may be featured, and only when requested. Homepage shows at most four explicit selections, ordered by homepage_order. It never fills vacant slots with unselected people.

Retrieve an authorized source portrait and restyle to match `public/people/tempest-ren.webp` and `public/people/zexin-li.webp`: cream paper grain, grayscale charcoal/cut-paper detail, restrained orange diagonal accent; preserve identity. Save a 640×800 WebP with descriptive alt text. Do not put raw portrait downloads in Git. If image tooling or authorization is missing, report that gap; never invent a person's likeness. Null portrait fields use the initials fallback.

## Component choice is automatic

Staff and core contributors use smaller biography cards. Contributors and general members use standard cards while their combined count is at most six; at seven they both switch to circular-portrait compact cards without biographies. Core contributors do not count toward that threshold. The full directory has three tiers and independently paginates each at 12 people. Do not hand-edit component selection to add a person or delete biographies merely because compact mode hides them.

## Validate and submit

Run `npm run validate:people`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. Fix relevant failures. Create a focused `codex/` branch from the current target branch, preserving unrelated work. Commit only intended public data/assets and necessary code. Push and create a PR with public sources, the requested role, concise change description and checks. Wait for applicable PR CI to pass; report failures or blockers accurately. Do not merge or deploy without authorization.

No browser/device/screenshot acceptance is required. Actual Nori skill usage is manually accepted separately; do not simulate an end-to-end skill run as part of this development task.
