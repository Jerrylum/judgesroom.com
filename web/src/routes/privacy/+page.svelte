<script lang="ts">
	const props = $props();
</script>

<svelte:head>
	<title>Data Protection and Privacy | Judges' Room</title>
</svelte:head>

<div class="min-h-screen">
	<div class="flex h-screen flex-col bg-slate-100">
		<div class="flex flex-1 flex-col items-center justify-start p-8">
			<div class="w-full max-w-4xl">
				<h1 class="mb-8 text-center text-4xl font-bold">Data Protection and Privacy</h1>

				<div class="space-y-8 rounded-lg bg-white p-8 shadow-md">
					<div>
						<h2 class="mb-4 text-2xl font-semibold">Introduction</h2>
						<p class="mb-4 leading-relaxed text-gray-700">
							When you use our service, you're trusting us with your information and judging materials. The judgesroom.com contributors
							understand this is a big responsibility and are committed to protecting your privacy and handling all judging materials with
							the utmost confidentiality.
						</p>
						<p class="leading-relaxed text-gray-700">
							This policy explains what information we collect, why we collect it, and how you can control your data and judging materials.
						</p>
					</div>

					<div>
						<h2 class="mb-4 text-2xl font-semibold">Information We Collect</h2>

						<p class="mb-4 leading-relaxed text-gray-700">
							This application uses Google Analytics to collect anonymous usage data that helps us improve the application. The analytics
							data we collect includes:
						</p>
						<ul class="mb-4 ml-4 list-inside list-disc space-y-2 text-gray-700">
							<li>Number of teams participating in events</li>
							<li>Number of divisions in competitions</li>
							<li>Number of judges using the system</li>
							<li>Number of devices accessing the application</li>
							<li>General usage patterns and application performance metrics</li>
						</ul>
						<p class="leading-relaxed text-gray-700">
							You can opt out of Google Analytics data collection by disabling it on the Event Setup page within the application.
						</p>
					</div>

					<div>
						<h2 class="mb-4 text-2xl font-semibold">Why We Collect Data</h2>
						<p class="mb-4 leading-relaxed text-gray-700">
							The anonymous usage data we collect through Google Analytics serves specific purposes to improve the application.
							Understanding usage patterns helps us identify and fix performance bottlenecks, ensuring optimal performance during critical
							judging periods. Anonymous metrics guide us in developing features that benefit the judging community and help us monitor
							application stability to ensure consistent service when judge advisors need it most.
						</p>
						<p class="leading-relaxed text-gray-700">
							General usage data also helps us improve the interface and workflow efficiency, making the judging process smoother for all
							users. All data collection is designed to improve the application without compromising the confidentiality principles required
							by Guide to Judging.
						</p>
					</div>

					<div>
						<h2 class="mb-4 text-2xl font-semibold">Information We Store and Process</h2>

						<p class="mb-4 leading-relaxed text-gray-700">
							When you use judgesroom.com, you upload information about your event and create judging materials during the competition
							process. We store and process this data to provide the judging functionality:
						</p>
						<ul class="mb-4 ml-4 list-inside list-disc space-y-2 text-gray-700">
							<li><strong>Event Information:</strong> Event name, competition structure, award lists, and team lists</li>
							<li>
								<strong>Judging Materials:</strong> Links to team engineering notebooks, evaluation scores, rubrics, and award rankings
							</li>
							<li>
								<strong>Judge Notes:</strong> Observations, comments, and evaluations that may contain team member names or other personal information
							</li>
							<li><strong>Award Deliberations:</strong> Nominations, rankings, and final award decisions</li>
						</ul>
					</div>

					<div>
						<h2 class="mb-4 text-2xl font-semibold">Keeping the Information Secure</h2>

						<p class="mb-4 leading-relaxed text-gray-700">
							We treat all data stored in the judges' room as highly sensitive information that must be protected at all times.
						</p>
						<p class="mb-4 leading-relaxed text-gray-700">
							judgesroom.com operates using Cloudflare Workers as our server infrastructure. All data processing occurs within Cloudflare's
							secure infrastructure, which maintains industry-standard security protocols and compliance certifications. All data is stored
							securely using Cloudflare's infrastructure, where all objects stored in D1 databases, including metadata, live databases, and
							inactive databases, are encrypted at rest.
						</p>
						<p class="mb-4 leading-relaxed text-gray-700">
							All communications between your browser and our servers are encrypted over TLS/SSL (HTTPS) to protect your data from being
							intercepted or tampered with.
						</p>
						<p class="mb-4 leading-relaxed text-gray-700">
							judgesroom.com is available as a hosted service and can also be self-hosted by event partners who prefer to maintain complete
							control over their judging environment and data. We provide detailed documentation for self-hosting, including how to deploy
							the application and secure the network connections. When self-hosting, you are responsible for your own data handling, privacy
							compliance, security measures, and infrastructure management. This privacy policy does not apply to self-hosted deployments.
						</p>
					</div>

					<div>
						<h2 class="mb-4 text-2xl font-semibold">Data Access and Control</h2>

						<div class="mb-6">
							<h3 class="mb-3 text-xl font-semibold">Who Can Access Your Data</h3>
							<p class="mb-4 leading-relaxed text-gray-700">
								When you join a judges' room, all individuals who can access the judges' room will have access to your input information,
								including any data you upload or create during the judging process.
							</p>
						</div>

						<div class="mb-6">
							<h3 class="mb-3 text-xl font-semibold">Room Security</h3>
							<p class="mb-4 leading-relaxed text-gray-700">
								Judges' rooms are protected by a unique room ID. Anyone who has access to the room ID can access all data and judging
								materials in the judges' room. To protect your privacy and maintain the confidentiality of judging material, judges and
								judge advisors should not share the invitation link beyond judges.
							</p>
						</div>

						<div class="mb-6">
							<h3 class="mb-3 text-xl font-semibold">Modifying Your Data</h3>
							<p class="mb-4 leading-relaxed text-gray-700">
								You can modify your data at any time while the judges' room is active. This includes updating your evaluations, notes, and
								any other information you've contributed to the judging process.
							</p>
						</div>

						<div>
							<h3 class="mb-3 text-xl font-semibold">Deleting Your Information</h3>
							<p class="leading-relaxed text-gray-700">
								To delete your information, you can ask your judge advisor to remove your name from the Event Setup page, or request that
								the entire judges' room be destroyed. When a judges' room is destroyed, all associated data is permanently deleted and
								cannot be restored.
							</p>
						</div>
					</div>

					<div>
						<h2 class="mb-4 text-2xl font-semibold">Compliance</h2>
						<p class="mb-4 leading-relaxed text-gray-700">
							In accordance with the Robotics Education & Competition Foundation's "Guide to Judging" confidentiality principles, <strong
								>all judging materials are strictly confidential</strong
							>. We treat all data stored in the judges' room as highly sensitive information that must be protected at all times.
						</p>

						<div class="mb-6 border-l-4 border-slate-400 bg-slate-50 p-4">
							<h3 class="mb-2 font-semibold text-slate-800">Confidential Materials Include:</h3>
							<ul class="ml-4 list-inside list-disc space-y-1 text-slate-700">
								<li>Links to team engineering notebooks</li>
								<li>Submitted rubrics and evaluation scores</li>
								<li>Judge notes and observations</li>
								<li>Award rankings and deliberations</li>
								<li>Award nominations and finalist selections</li>
								<li>Final award winners</li>
								<li>Any other judging-related documentation</li>
							</ul>
						</div>

						<p class="mb-4 leading-relaxed text-gray-700">
							While we do store and process your judging materials as necessary to provide the service functionality, we maintain strict
							confidentiality protocols. Your judging data is never shared with third parties or external services beyond our secure
							infrastructure. We do not maintain logs or records of judging content for purposes other than providing the judging system
							functionality. When the Judge Advisor confirms to destroy the data at the end of the event, all judging materials are
							permanently deleted and cannot be restored.
						</p>

						<p class="leading-relaxed text-gray-700">
							This approach ensures complete compliance with the judging confidentiality requirements outlined in principles JP1
							(Confidentiality) and AD7 (Collection and Treatment of Judging Materials) of the "Guide to Judging." judgesroom.com is
							designed to fully comply with all RECF requirements, particularly regarding confidentiality, impartiality, and proper handling
							of judging materials.
						</p>
					</div>

					<div>
						<h2 class="mb-4 text-2xl font-semibold">Updates to This Privacy Policy</h2>
						<p class="leading-relaxed text-gray-700">
							We may update this privacy policy from time to time to reflect changes in our practices or applicable regulations. Any
							significant changes will be communicated through the application interface. We encourage users to review this policy
							periodically.
						</p>
					</div>

					<div>
						<h2 class="mb-4 text-2xl font-semibold">Contact Us</h2>
						<p class="leading-relaxed text-gray-700">
							If you have any questions or concerns about this privacy policy, our data handling practices, or the judgesroom.com
							application, please contact us at <a href="mailto:me@jerryio.com" class="font-semibold underline hover:text-blue-900"
								>me@jerryio.com</a
							>.
						</p>
					</div>

					<div class="border-t pt-4 text-center text-sm text-gray-500">
						<p>Last updated: October 2025</p>
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
</style>
