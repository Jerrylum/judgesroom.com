if (typeof window !== 'undefined') {
	async function resolveDemoData(resource: object) {
		return new Response(JSON.stringify(resource), { headers: { 'Content-Type': 'application/json' } });
	}

	const origin = window.fetch;
	window.fetch = async (input, init) => {
		const url = typeof input === 'object' && 'url' in input ? input.url : null;
		switch (url) {
			case 'https://www.robotevents.com/api/v2/events?sku[]=RE-VIQRC-24-9999':
				return resolveDemoData(await import('$lib/demo-data/roboteventsFetchEvents.json'));
			case 'https://www.robotevents.com/api/v2/events/59999/teams?page=1&per_page=250':
				return resolveDemoData(await import('$lib/demo-data/roboteventsFetchTeams.json'));
			case 'https://www.robotevents.com/api/v2/events/59999/awards?page=1&per_page=250':
				return resolveDemoData(await import('$lib/demo-data/roboteventsFetchAwards.json'));
			default:
				return origin(input, init);
		}
	};
}
