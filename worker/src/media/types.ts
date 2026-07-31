/**
 * Minimal photo storage surface used by media routes so web typecheck does not need Workers runtime types.
 * Implementations may also invalidate Workers Cache tags on delete.
 */
export interface PhotosObjectBody {
	body: ReadableStream;
}

export interface PhotosBucket {
	put(
		photoId: string,
		value: ArrayBuffer | ArrayBufferView | string | null | Blob | ReadableStream,
		options?: { httpMetadata?: { contentType?: string } }
	): Promise<unknown>;
	get(photoId: string): Promise<PhotosObjectBody | null>;
	/** Delete photo object(s) and purge photo-{id} cache tags. */
	delete(photoId: string | string[]): Promise<void>;
}
