/**
 * Minimal R2-like surface used by media routes so web typecheck does not need Workers runtime types.
 */
export interface PhotosObjectBody {
	body: ReadableStream;
}

export interface PhotosBucket {
	put(
		key: string,
		value: ArrayBuffer | ArrayBufferView | string | null | Blob | ReadableStream,
		options?: { httpMetadata?: { contentType?: string } }
	): Promise<unknown>;
	get(key: string): Promise<PhotosObjectBody | null>;
	delete(key: string | string[]): Promise<void>;
	list(options?: { prefix?: string; cursor?: string; limit?: number }): Promise<{
		objects: { key: string }[];
		truncated: boolean;
		cursor?: string;
	}>;
}
