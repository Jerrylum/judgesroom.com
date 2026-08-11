export type AccessLinkCsvRow = {
	role: string;
	name: string;
	group: string;
	accessLink: string;
};

function escapeCsvCell(value: string): string {
	if (/[",\n\r]/.test(value)) {
		return `"${value.replaceAll('"', '""')}"`;
	}
	return value;
}

/** Build a CSV string for JA mass-distribution of personal access links. */
export function buildAccessLinksCsv(rows: AccessLinkCsvRow[]): string {
	const header = ['Role', 'Name', 'Group', 'AccessLink'];
	const lines = [
		header.join(','),
		...rows.map((row) =>
			[row.role, row.name, row.group, row.accessLink].map(escapeCsvCell).join(',')
		)
	];
	return lines.join('\n') + '\n';
}

export function downloadTextFile(filename: string, content: string, mimeType = 'text/csv;charset=utf-8'): void {
	const blob = new Blob([content], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = filename;
	anchor.click();
	URL.revokeObjectURL(url);
}
