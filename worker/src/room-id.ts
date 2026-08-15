import { RoomIdSchema } from '@judgesroom.com/protocol/src/room-id';

/** Gateway check before idFromName. Null means do not touch a Durable Object. */
export function parseRoomId(value: string | null): string | null {
	if (value === null) {
		return null;
	}
	const result = RoomIdSchema.safeParse(value);
	return result.success ? result.data : null;
}
