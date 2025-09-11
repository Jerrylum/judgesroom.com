import z from 'zod';

export const DeviceInfoSchema = z.object({
	deviceId: z.string(),
	deviceName: z.string(),
	connectedAt: z.number().int().positive(),
	isOnline: z.boolean()
});
export type DeviceInfo = z.infer<typeof DeviceInfoSchema>;

export const SessionInfoSchema = z.object({
	sessionId: z.uuidv4(),
	createdAt: z.number().int().positive(),
	deviceId: z.uuidv4(),
	deviceName: z.string().min(1).max(100)
});

export type SessionInfo = z.infer<typeof SessionInfoSchema>;
