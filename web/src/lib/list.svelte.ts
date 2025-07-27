export class List<T, KeyField extends keyof T> {
	private items: T[] = $state([]);
	private keyField: KeyField;

	constructor(keyField: KeyField, initialItems: T[] = []) {
		this.keyField = keyField;
		this.items = [...initialItems];
	}

	// Array-like properties
	get length(): number {
		return this.items.length;
	}

	// Core methods
	push(item: T): number {
		return this.items.push(item);
	}

	pop(): T | undefined {
		return this.items.pop();
	}

	shift(): T | undefined {
		return this.items.shift();
	}

	unshift(...items: T[]): number {
		return this.items.unshift(...items);
	}

	// ID-based methods
	findById(id: T[KeyField]): T | undefined {
		return this.items.find((item) => item[this.keyField] === id);
	}

	findIndex(id: T[KeyField]): number {
		return this.items.findIndex((item) => item[this.keyField] === id);
	}

	includes(id: T[KeyField]): boolean {
		return this.items.some((item) => item[this.keyField] === id);
	}

	removeById(id: T[KeyField]): T | undefined {
		const index = this.findIndex(id);
		if (index !== -1) {
			return this.items.splice(index, 1)[0];
		}
		return undefined;
	}

	updateById(id: T[KeyField], updates: Partial<T>): T | undefined {
		const item = this.findById(id);
		if (item) {
			Object.assign(item, updates);
			return item;
		}
		return undefined;
	}

	// Array methods
	forEach(callback: (item: T, index: number, array: T[]) => void): void {
		this.items.forEach(callback);
	}

	map<U>(callback: (item: T, index: number, array: T[]) => U): U[] {
		return this.items.map(callback);
	}

	filter(callback: (item: T, index: number, array: T[]) => boolean): T[] {
		return this.items.filter(callback);
	}

	find(callback: (item: T, index: number, array: T[]) => boolean): T | undefined {
		return this.items.find(callback);
	}

	some(callback: (item: T, index: number, array: T[]) => boolean): boolean {
		return this.items.some(callback);
	}

	every(callback: (item: T, index: number, array: T[]) => boolean): boolean {
		return this.items.every(callback);
	}

	reduce<U>(
		callback: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U,
		initialValue: U
	): U {
		return this.items.reduce(callback, initialValue);
	}

	sort(compareFn?: (a: T, b: T) => number): this {
		this.items.sort(compareFn);
		return this;
	}

	reverse(): this {
		this.items.reverse();
		return this;
	}

	slice(start?: number, end?: number): T[] {
		return this.items.slice(start, end);
	}

	splice(start: number, deleteCount?: number, ...items: T[]): T[] {
		if (deleteCount === undefined) {
			return this.items.splice(start);
		}
		return this.items.splice(start, deleteCount, ...items);
	}

	// Index-based access
	at(index: number): T | undefined {
		return this.items.at(index);
	}

	// Utility methods
	clear(): void {
		this.items.length = 0;
	}

	isEmpty(): boolean {
		return this.items.length === 0;
	}

	toArray(): T[] {
		return [...this.items];
	}

	clone(): List<T, KeyField> {
		return new List(this.keyField, this.toArray());
	}

	// Iterator methods
	[Symbol.iterator](): Iterator<T> {
		return this.items[Symbol.iterator]();
	}

	keys(): IterableIterator<number> {
		return this.items.keys();
	}

	values(): IterableIterator<T> {
		return this.items.values();
	}

	entries(): IterableIterator<[number, T]> {
		return this.items.entries();
	}

	// Array-like indexing (for compatibility)
	get(index: number): T | undefined {
		return this.items[index];
	}

	set(index: number, item: T): void {
		this.items[index] = item;
	}
}
