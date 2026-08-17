---
name: changelog
description: Draft and update the judgesroom.com changelog page from git history between released versions. Use when writing, updating, or reviewing changelog notes, release notes, or web/src/routes/changelog/+page.svelte.
---

# Changelog

Write operator-facing notes for Judge Advisors and Event Partners. Put them on the changelog page, not in a repo `CHANGELOG.md`.

## Source of truth

- Page: `web/src/routes/changelog/+page.svelte`
- Layout and type: match `web/src/routes/privacy/+page.svelte` (slate background, centered title, white card, `h2` / `h3`, disc lists, last-updated footer)
- App version: `web/src/lib/app.svelte.ts` (`App.version`). `bun run tag-release` tags whatever that field says. Bump it before tagging; do not bump it as part of drafting notes unless asked.

## What a version section is

Each version is the **delta from the previous released tag**, not a commit log of the unreleased branch.

**Fixed** is for things that were wrong in the previous **released** version. Intra-release development fixes that never shipped do not belong there.

Example: 2.1.0 had no standalone zip. The zip was added during unreleased 2.2.0 work, then `LICENSE` was added in a follow-up before any 2.2.0 tag. Users never used a zip without the license. That is not a 2.2.0 **Fixed** item. Fold it into **Added** if it matters, or omit it.

Same for restoring README screenshots that a 2.2.0 commit briefly removed: net vs 2.1.0 is “README now documents standalone hosting”; do not list the restore.

Omit empty sections. Skip internal-only commits (types, formatting, test-only lock-ins) unless they change operator-visible behavior.

## Categories

Use Keep a Changelog names, newest version first:

- **Added** — new capabilities vs the previous release
- **Changed** — behavior or docs that already existed
- **Deprecated** / **Removed** — only if applicable
- **Fixed** — bugs in the previous **released** version
- **Security** — hardening and vulnerability fixes that shipped vs the previous release

A new feature’s supporting files (license in a new zip, start-script copy) stay under **Added**.

## Voice

- Write for people running an event, not for git history.
- Prefer “Judges can…” / “When access control is on…” over commit subjects.
- Keep English only (privacy page is English-only).
- Dates: `17 August 2026` style under the version heading.

## Workflow

1. Confirm the previous released tag (`git tag -l 'v*' --sort=-v:refname`) and the version being drafted (often `App.version` or an assumed next tag).
2. `git log <previous-tag>..HEAD --pretty=format:'%h%n%s%n%b%n---'`
3. Group by category using the rules above. Drop intra-release noise.
4. Insert a new version block at the top of the card in `web/src/routes/changelog/+page.svelte` (after the intro paragraph). Do not rewrite older versions unless asked.
5. Update the footer `Last updated: <Month YYYY>`.
6. Validate the Svelte page (Svelte MCP `svelte-autofixer`) before finishing.

## Page markup

Reuse the privacy-page shell. Version blocks:

```svelte
<div>
	<h2 class="mb-1 text-2xl font-semibold">2.2.0</h2>
	<p class="mb-4 text-sm text-gray-500">17 August 2026</p>
	<!-- optional intro paragraph: mb-4 leading-relaxed text-gray-700 -->

	<div class="mb-6">
		<h3 class="mb-3 text-xl font-semibold">Added</h3>
		<ul class="ml-4 list-inside list-disc space-y-2 text-gray-700">
			<li>…</li>
		</ul>
	</div>
	<!-- last category in a version: omit mb-6 on the wrapper -->
</div>
```

- `<code>` for zip names, commands, headers, package names (page CSS already styles `code`).
- `<strong>` for feature names and important limits.
- Nested `ul` for zip variants under a parent item.
- Intro line stays `All notable changes to judgesroom.com.`
- Title: `Changelog | Judges' Room`

Do not add i18n. Do not add footer/home links unless asked.
