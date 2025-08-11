/**
 * Client-side state management for WRPC demo
 * Provides reactive state updates when server calls client procedures
 */

interface ClientState {
	serverName: string;
	serverTime: string;
	ageResult: string;
	notificationResult: string;
	clientGreetingResult: string;
	serverCallCount: number;
	lastUpdateAge: number;
	lastNotification: string;
	connectedClients: number;
}

// Reactive state store for client-side data
export const clientState: ClientState = $state({
	serverName: '',
	serverTime: '',
	ageResult: '',
	notificationResult: '',
	clientGreetingResult: '',
	serverCallCount: 0,
	lastUpdateAge: 0,
	lastNotification: '',
	connectedClients: 0
});

// Handlers for server-to-client procedure calls
export const clientHandlers = {
	onUpdateAge: (age: number) => {
		console.log(`🔄 Server called updateAge with: ${age}`);
		clientState.serverCallCount++;
		clientState.lastUpdateAge = age;
	},

	onNotify: (message: string) => {
		console.log(`📢 Server notification: ${message}`);
		clientState.serverCallCount++;
		clientState.lastNotification = message;
	},

	onClientCountUpdate: (count: number) => {
		console.log(`👥 Connected clients: ${count}`);
		clientState.connectedClients = count;
	}
};
