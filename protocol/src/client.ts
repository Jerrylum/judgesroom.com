import z from 'zod';

export const DeviceInfoSchema = z.object({
	deviceId: z.string(),
	deviceName: z.string(),
	connectedAt: z.number().int().positive(),
	isOnline: z.boolean()
});
export type DeviceInfo = z.infer<typeof DeviceInfoSchema>;
