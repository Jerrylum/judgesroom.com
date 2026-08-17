<svelte:head>
	<title>Changelog | Judges' Room</title>
</svelte:head>

<div class="min-h-screen">
	<div class="flex h-screen flex-col bg-slate-100">
		<div class="flex flex-1 flex-col items-center justify-start p-8">
			<div class="w-full max-w-4xl">
				<h1 class="mb-8 text-center text-4xl font-bold">Changelog</h1>

				<div class="space-y-8 rounded-lg bg-white p-8 shadow-md">
					<div>
						<p class="leading-relaxed text-gray-700">All notable changes to judgesroom.com.</p>
					</div>

					<div>
						<h2 class="mb-1 text-2xl font-semibold">2.2.0</h2>
						<p class="mb-4 text-sm text-gray-500">17 August 2026</p>
						<p class="mb-4 leading-relaxed text-gray-700">
							You can run a Judges' Room on a laptop at the venue, without depending on judgesroom.com or a working internet uplink.
						</p>

						<div class="mb-6">
							<h3 class="mb-3 text-xl font-semibold">Added</h3>
							<ul class="ml-4 list-inside list-disc space-y-2 text-gray-700">
								<li>
									A <strong>standalone server</strong> for local event hosting. Unzip it somewhere writable, double-click Start, open a
									printed LAN URL on the host computer (never <code>localhost</code>), try that URL on a judge's device, then create the
									room and share the same address. No install, port-forwarding, or Cloudflare account. Each zip includes
									<code>LICENSE</code>. Download from
									<a
										href="https://github.com/Jerrylum/judgesroom.com/releases/latest"
										class="font-semibold underline hover:text-blue-900">GitHub Releases</a
									>:
									<ul class="mt-2 ml-6 list-disc space-y-1">
										<li><code>judgesroom-standalone-windows-x64.zip</code> — Windows 10/11</li>
										<li><code>judgesroom-standalone-macos-arm64.zip</code> — Apple Silicon Macs (M1 and later)</li>
									</ul>
								</li>
							</ul>
						</div>

						<div>
							<h3 class="mb-3 text-xl font-semibold">Changed</h3>
							<ul class="ml-4 list-inside list-disc space-y-2 text-gray-700">
								<li>
									The README now documents standalone hosting and the production-mode steps for running the web app from source.
								</li>
								<li>
									The privacy page now states that room IDs and access-control tokens cannot be guessed in practice, and that the 7-day
									interview-photo timer applies on judgesroom.com. If you host the app yourself, photos stay until you destroy the room
									unless you set a retention policy.
								</li>
							</ul>
						</div>
					</div>

					<div>
						<h2 class="mb-1 text-2xl font-semibold">2.1.0</h2>
						<p class="mb-4 text-sm text-gray-500">16 August 2026</p>
						<p class="mb-4 leading-relaxed text-gray-700">
							Judge Advisors can lock a room to personal access links, capture interview photos, and manage judges from a dedicated tab.
							Rooms created in 2.0.0 migrate automatically.
						</p>

						<div class="mb-6">
							<h3 class="mb-3 text-xl font-semibold">Added</h3>
							<ul class="ml-4 list-inside list-disc space-y-2 text-gray-700">
								<li>
									<strong>Team interview photos.</strong> Judges can capture and review photos from the rubric screens without slowing
									the overview table. Photos are stored privately and served only through authenticated routes. Deleting a photo asks
									for confirmation. Caps: <strong>10</strong> photos per team, <strong>500</strong> per room, <strong>3 MB</strong> after
									compression. On judgesroom.com, leftover photos are deleted after <strong>7 days</strong> even if the room is not
									destroyed.
								</li>
								<li>
									<strong>Access control</strong> with personal access links. When it is on, each judge and the Judge Advisor joins only
									with their own link. Rotating a link kicks devices that used the old one. Join failures show why the link was denied
									instead of a generic connection error.
								</li>
								<li>
									A <strong>Judges</strong> tab for roster, personal access links, connected devices, and moving teams between judge
									groups. Judge Advisors can download a CSV of access links to distribute — treat those links like passwords.
								</li>
								<li>
									When access control is on, Judge Advisors can <strong>author rubrics</strong> by selecting a judge on the rubric tab.
									Role switching is unavailable in that mode, so this replaces the old “Switch to Judge” dead end.
								</li>
								<li>
									Operational caps (photos, connections per judge link, room lifetime, field lengths) are listed in
									<code>docs/limits.md</code>.
								</li>
								<li>
									A set-up room is retained for a maximum of <strong>90 days</strong> after the last Event Setup save. For rooms created
									before 2.1.0, that 90-day period starts the next time the room is opened. Destroy the room at the end of the event; do
									not rely on this timer for confidentiality.
								</li>
							</ul>
						</div>

						<div class="mb-6">
							<h3 class="mb-3 text-xl font-semibold">Changed</h3>
							<ul class="ml-4 list-inside list-disc space-y-2 text-gray-700">
								<li>
									New rooms use shorter 18-character IDs so share and access links stay compact. Existing UUID rooms and printed links
									still work.
								</li>
								<li>Event names can be up to <strong>200</strong> characters.</li>
								<li>
									Leaving the room tells the server, so that device drops off the connected-devices list instead of looking like a kick.
								</li>
								<li>
									Copy-to-clipboard is hidden outside a secure context (for example HTTP on a LAN), where the browser would block it.
								</li>
								<li>Rubric columns on the teams list scroll horizontally when a team has many submissions.</li>
							</ul>
						</div>

						<div class="mb-6">
							<h3 class="mb-3 text-xl font-semibold">Fixed</h3>
							<ul class="ml-4 list-inside list-disc space-y-2 text-gray-700">
								<li>
									When adding Design Award nominations, teams already nominated for the paired Excellence Award are treated as
									ineligible, so the same team cannot sit on both lists.
								</li>
							</ul>
						</div>

						<div>
							<h3 class="mb-3 text-xl font-semibold">Security</h3>
							<ul class="ml-4 list-inside list-disc space-y-2 text-gray-700">
								<li>
									When access control is on, each <strong>judge</strong> access link is limited to <strong>100</strong> live connections.
									Extra browser tabs and devices on the same link count; a 101st connection is refused. Judge Advisor links, and rooms
									with access control off, stay uncapped.
								</li>
								<li>
									Room IDs are validated before join and photo routes. Query and hash are stripped from Google Analytics URLs so room
									IDs are not sent to analytics.
								</li>
								<li>
									Incoming WebSocket messages larger than <strong>1 MB</strong> are rejected. Interview photos stay on HTTP upload, not
									the WebSocket.
								</li>
								<li>
									After a room is destroyed, that server isolate refuses new work until it is evicted, instead of accepting connections
									against missing data.
								</li>
								<li>
									Auth tokens use a uniform URL-safe alphabet. Judge Advisor tokens are compared in constant time. Photo responses send
									<code>X-Content-Type-Options: nosniff</code>.
								</li>
								<li>
									Drizzle ORM is updated to 0.45.2 to address CVE-2026-39356 (SQL identifier injection in self-hosted and hosted
									deployments).
								</li>
							</ul>
						</div>
					</div>

					<div>
						<h2 class="mb-1 text-2xl font-semibold">2.0.0</h2>
						<p class="mb-4 text-sm text-gray-500">27 June 2026</p>
						<p class="mb-4 leading-relaxed text-gray-700">
							This release follows the GRSF VEX Competition judging guidelines: Design Award, Nominated Awards, and the current Engineering
							Notebook and Team Interview rubrics.
						</p>

						<div class="mb-6">
							<h3 class="mb-3 text-xl font-semibold">Added</h3>
							<ul class="ml-4 list-inside list-disc space-y-2 text-gray-700">
								<li>
									<strong>Design Award</strong> as a judged award, including Event Setup options for separate Design Awards by grade at
									blended events. Excellence Award winners continue to be selected from Design Award finalists.
								</li>
								<li>
									<strong>Engineering Notebook</strong> and <strong>Team Interview</strong> rubrics updated to the GRSF forms, with
									section point scales and criterion scoring that match the published guidelines.
								</li>
								<li>
									Nomination and ranking flows check award requirements: team interview, grade, and a <strong>Fully Developed</strong>
									notebook where Design, Innovate, and Excellence require it. All notebooks can still be scored; only Fully Developed
									notebooks are eligible for those awards.
								</li>
							</ul>
						</div>

						<div class="mb-6">
							<h3 class="mb-3 text-xl font-semibold">Changed</h3>
							<ul class="ml-4 list-inside list-disc space-y-2 text-gray-700">
								<li>
									Copy, privacy policy, and rubric directions refer to the <strong>GRSF</strong> VEX Competition judging guidelines.
									Event import uses <strong>VEX Events</strong> instead of RobotEvents.
								</li>
								<li>
									Volunteer Nominated Awards are now <strong>Nominated Awards</strong>. Sportsmanship and Energy are Nominated Awards
									only — they are no longer judged awards.
								</li>
								<li>The Innovate Award submission form is no longer required for Innovate eligibility.</li>
								<li>
									Judged-award precedence matches the guidelines. VIQRC uses the same order as other programs (Create no longer outranks
									Build).
								</li>
							</ul>
						</div>

						<div>
							<h3 class="mb-3 text-xl font-semibold">Fixed</h3>
							<ul class="ml-4 list-inside list-disc space-y-2 text-gray-700">
								<li>Rubric score totals round and sum so floating-point drift no longer changes a displayed total.</li>
							</ul>
						</div>
					</div>

					<div class="border-t pt-4 text-center text-sm text-gray-500">
						<p>Last updated: August 2026</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style lang="postcss">
	@reference 'tailwindcss';

	:global {
		body {
			@apply bg-slate-100;
		}
	}

	code {
		@apply rounded bg-slate-100 px-1 py-0.5 font-mono text-sm;
	}
</style>
