import z from 'zod';
import { DeviceAuthenticatedSchema } from './access';

export const DeviceInfoSchema = z.object({
	deviceId: z.uuidv4(),
	deviceName: z.string().min(1).max(20),
	connectedAt: z.number().int().positive(),
	isOnline: z.boolean(),
	/** Present only while connected with access control on; null if offline / AC off / uncontrolled. */
	authenticated: DeviceAuthenticatedSchema.nullable()
});
export type DeviceInfo = z.infer<typeof DeviceInfoSchema>;
