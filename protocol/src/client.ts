import z from 'zod';

export const ClientInfoSchema = z.object({
	clientId: z.string(),
	deviceName: z.string(),
	connectedAt: z.number().int().positive(),
	isOnline: z.boolean()
});
export type ClientInfo = z.infer<typeof ClientInfoSchema>;

export const SessionInfoSchema = z.object({
	sessionId: z.uuidv4(),
	createdAt: z.number().int().positive(),
	clientId: z.uuidv4(),
	deviceName: z.string().min(1).max(100)
});

export type SessionInfo = z.infer<typeof SessionInfoSchema>;
