import cloneDeep from 'lodash/cloneDeep';
import debounce from 'lodash/debounce';
import every from 'lodash/every';
import get from 'lodash/get';
import isArray from 'lodash/isArray';
import isEmpty from 'lodash/isEmpty';
import isFunction from 'lodash/isFunction';
import isNil from 'lodash/isNil';
import isObject from 'lodash/isObject';
import isPlainObject from 'lodash/isPlainObject';
import isString from 'lodash/isString';
import isUndefined from 'lodash/isUndefined';
import keys from 'lodash/keys';
import map from 'lodash/map';
import now from 'lodash/now';
import set from 'lodash/set';
import size from 'lodash/size';
import values from 'lodash/values';

const deepClean = (obj: any, isRoot: boolean = true): any => {
	// Special case for empty objects/arrays at root level
	if (isRoot && ((isArray(obj) && size(obj) === 0) || (isPlainObject(obj) && size(obj) === 0))) {
		return obj;
	}

	// Handle null/undefined input
	if (isNil(obj)) {
		return obj;
	}

	// Process arrays
	if (isArray(obj)) {
		// Clean each array item recursively
		const processed = map(obj, item => {
			// Keep null/undefined as is to preserve indices
			if (isNil(item)) {
				return item;
			}

			// Process objects recursively
			if (isObject(item)) {
				return deepClean(item, false);
			}

			// Return primitive values as is
			return item;
		});

		// If all items are null/undefined or if array is empty (and not root)
		const allNil = every(processed, isNil);

		if (!isRoot && (allNil || size(processed) === 0)) {
			return null;
		}

		// Return the processed array
		return processed;
	}

	// Process objects
	if (isPlainObject(obj)) {
		// Process each property
		for (const key of keys(obj)) {
			const value = obj[key];

			// Remove null/undefined values
			if (isNil(value)) {
				delete obj[key];
				continue;
			}

			// Special case for empty objects - delete them
			if (isPlainObject(value) && isEmpty(value)) {
				delete obj[key];
				continue;
			}

			// Special case for empty arrays or arrays with only null/undefined
			if (isArray(value)) {
				if (isEmpty(value)) {
					// Empty arrays become null
					obj[key] = null;
					continue;
				} else if (every(value, isNil)) {
					// Arrays with only null/undefined become null
					obj[key] = null;
					continue;
				}
			}

			// Process nested objects and arrays
			if (isObject(value)) {
				const cleaned = deepClean(value, false);

				if (isNil(cleaned)) {
					// If the cleaned result is null, delete the property
					delete obj[key];
				} else if (isArray(cleaned) && every(cleaned, isNil)) {
					// Arrays with all null values after cleaning become null
					obj[key] = null;
				} else if (isPlainObject(cleaned)) {
					// Handle empty objects
					if (isEmpty(cleaned)) {
						delete obj[key];
					} else {
						// Check if object only contains null values
						const hasOnlyNullValues = every(values(cleaned), isNil);

						if (hasOnlyNullValues && size(cleaned) > 0) {
							delete obj[key];
						} else {
							obj[key] = cleaned;
						}
					}
				} else {
					// Keep the cleaned value
					obj[key] = cleaned;
				}
			}
		}

		// Check if object only contains null values after processing
		const hasOnlyNullValues = every(values(obj), isNil);

		// If all values are null and not at root level, return null
		if (!isRoot && hasOnlyNullValues && size(obj) > 0) {
			return null;
		}

		// If object is now empty and not root, return null
		if (!isRoot && isEmpty(obj)) {
			return null;
		}

		// Return the processed object
		return obj;
	}

	// Return primitive values as is
	return obj;
};

namespace Instance {
	export type Error = string | null;
	export type Errors = {
		[key: string]: Errors | Error | Error[];
	};

	export type Action = 'CLEAR' | 'CLEAR_ERRORS' | 'INIT' | 'REPLACE' | 'HISTORY_REDO' | 'HISTORY_REPLACE' | 'HISTORY_UNDO' | 'SET';
	export type Payload<T extends object = Value, V = Nil> = {
		changed: boolean;
		changesCount: number;
		errors: Instance.Errors;
		errorsCount: number;
		instance: Instance<T>;
		lastChange: number;
		lastSubmit: number;
		requiredErrorsCount: number;
		value: V extends Nil ? T : V;
	};

	export type Nil = null | undefined;
	export type Path = (string | number)[];
	export type RegisteredItem = {
		id: string;
		reportFormImmediate: () => void;
	};

	export type Listener<T extends object = Value> = {
		(payload: Payload<T>, options: { action: Instance.Action; silent: boolean }): void;
	};
	export type Value = any;
}

class RequiredErrors extends Set<string> {
	add(key: string | Instance.Path): this {
		if (isArray(key)) {
			key = key.join('.');
		}

		return super.add(key);
	}

	remove(key: string | Instance.Path): boolean {
		if (isArray(key)) {
			key = key.join('.');
		}

		let removed = false;

		super.forEach(requiredError => {
			if (requiredError.startsWith(key)) {
				super.delete(requiredError);
				removed = true;
			}
		});

		return super.delete(key) || removed;
	}

	has(key: string | Instance.Path): boolean {
		if (isArray(key)) {
			key = key.join('.');
		}

		return super.has(key);
	}
}

class Instance<T extends object = Instance.Value> {
	private static index = 0;
	private cache: {
		error: { [key: string]: Instance.Error };
		get: { [key: string]: Instance.Value };
	};

	private items: Set<Instance.RegisteredItem>;
	private onChangeListeners: Set<Instance.Listener<T>>;

	public changed: boolean;
	public changesCount: number;
	public errors: Instance.Errors;
	public id: string;
	public lastChange: number;
	public lastSubmit: number;
	public requiredErrors: RequiredErrors;
	public value: T;

	constructor(value?: T) {
		this.cache = {
			error: {},
			get: {}
		};

		this.errors = {};
		this.changed = false;
		this.id = `form-${Instance.index++}`;
		this.items = new Set();
		this.changesCount = 0;
		this.lastChange = 0;
		this.lastSubmit = 0;
		this.onChangeListeners = new Set();
		this.requiredErrors = new RequiredErrors();
		this.value = value || ({} as T);
	}

	private cacheFlush(): void {
		this.cache = {
			error: {},
			get: {}
		};
	}

	private cacheGet(type: 'error' | 'get', path: Instance.Path): Instance.Error | Instance.Value {
		return this.cache[type][path.join('.')];
	}

	private cacheSet(type: 'error' | 'get', path: Instance.Path, value: Instance.Error | Instance.Value): void {
		this.cache[type][path.join('.')] = value;
	}

	clear(silent: boolean = false): void {
		this.errors = {};
		this.requiredErrors.clear();
		this.value = {} as T;
		this.triggerOnChange({ action: 'CLEAR', silent });
	}

	clearErrors(silent: boolean = false): void {
		this.errors = {};
		this.requiredErrors.clear();
		this.triggerOnChange({ action: 'CLEAR_ERRORS', silent });
	}

	errorsCount(): number {
		return size(this.errors);
	}

	get(path?: Instance.Nil, defaultValue?: Instance.Nil): T;
	get<V extends Instance.Value = Instance.Value>(path?: Instance.Path, defaultValue?: Instance.Value): V;
	get<V extends Instance.Value = Instance.Value>(path: Instance.Path | Instance.Nil, defaultValue?: Instance.Value | Instance.Nil): V | T {
		if (isNil(path)) {
			return this.value as T;
		}

		const cacheValue = this.cacheGet('get', path);

		if (!isUndefined(cacheValue)) {
			return cacheValue;
		}

		const value = get(this.value, path, defaultValue);

		this.cacheSet('get', path, value);

		return value;
	}

	getError(path?: Instance.Path): Instance.Errors | Instance.Error | Instance.Error[] {
		if (!path) {
			return this.errors;
		}

		const cacheValue = this.cacheGet('error', path);

		if (!isUndefined(cacheValue)) {
			return cacheValue;
		}

		const value = get(this.errors, path, null);

		this.cacheSet('error', path, value);

		return value;
	}

	getPayload(): Instance.Payload<T> {
		return {
			changed: this.changed,
			changesCount: this.changesCount,
			errors: this.errors,
			errorsCount: this.errorsCount(),
			instance: this,
			lastChange: this.lastChange,
			lastSubmit: this.lastSubmit,
			requiredErrorsCount: this.requiredErrorsCount(),
			value: this.value
		};
	}

	historyAction(action: 'REDO' | 'UNDO' | 'REPLACE', value: T, silent: boolean = false): void {
		this.value = value;

		switch (action) {
			case 'REDO':
				this.triggerOnChange({ action: 'HISTORY_REDO', silent });
				break;
			case 'REPLACE':
				this.triggerOnChange({ action: 'HISTORY_REPLACE', silent });
				break;
			case 'UNDO':
				this.triggerOnChange({ action: 'HISTORY_UNDO', silent });
				break;
		}
	}

	init(value: T, silent: boolean = false): boolean {
		if (size(this.value) > 0) {
			return false;
		}

		this.value = value;
		this.triggerOnChange({ action: 'INIT', silent });

		return true;
	}

	onChange(listener: Instance.Listener<T>): () => void {
		if (!isFunction(listener)) {
			throw new Error('listener must be a function.');
		}

		this.onChangeListeners.add(listener);

		return () => {
			this.onChangeListeners.delete(listener);
		};
	}

	patch(value: Partial<T>, silent: boolean = false): void {
		this.value = {
			...this.value,
			...value
		};
		this.triggerOnChange({ action: 'SET', silent });
	}

	registerItem(item: Instance.RegisteredItem): void {
		this.items.add(item);
	}

	replace(value: T, silent: boolean = false): void {
		this.value = value;
		this.triggerOnChange({ action: 'REPLACE', silent });
	}

	requestImmediateValue(): void {
		this.items.forEach(item => {
			if (isFunction(item.reportFormImmediate)) {
				item.reportFormImmediate();
			}
		});
	}

	requiredErrorsCount(): number {
		return this.requiredErrors.size;
	}

	set(path: Instance.Path, value: Instance.Value, silent: boolean = false): T {
		this.value = set(cloneDeep(this.value), path, value);
		this.triggerOnChange({ action: 'SET', silent });

		return this.value;
	}

	setError(
		path: Instance.Path,
		value: Instance.Error | Instance.Error[],
		silent: boolean = false,
		requiredError: boolean = false
	): Instance.Errors {
		if (isString(value) && isEmpty(value)) {
			return this.errors;
		}

		this.errors = set(cloneDeep(this.errors), path, value);

		if (requiredError) {
			this.requiredErrors.add(path);
		}

		this.triggerOnChange({ action: 'SET', silent });

		return this.errors;
	}

	triggerOnChange(args: { action: Instance.Action; silent?: boolean }) {
		const { action, silent = false } = args;

		this.lastChange = now();
		this.cacheFlush();
		this.triggerOnChangeDebounced({ action, silent });
	}

	triggerOnChangeDebounced = debounce((args: { action: Instance.Action; silent?: boolean }) => {
		const { action, silent = false } = args;

		this.changesCount += 1;
		this.changed = this.lastChange > this.lastSubmit;

		const payload = this.getPayload();
		this.onChangeListeners.forEach(listener => {
			listener(payload, { action, silent });
		});
	}, 10);

	unregisterItem(item: Instance.RegisteredItem): void {
		this.items.delete(item);
	}

	unsetError(path: Instance.Path, silent: boolean = false): Instance.Errors {
		this.errors = deepClean(set(cloneDeep(this.errors), path, null));
		this.requiredErrors.remove(path);
		this.triggerOnChange({ action: 'SET', silent });

		return this.errors;
	}

	update(path: Instance.Path, fn: (value: Instance.Value) => Instance.Value, silent: boolean = false): T {
		if (!isFunction(fn)) {
			return this.value;
		}

		const value = this.get(path, null);

		return this.set(path, fn(value), silent);
	}
}

export { Instance, deepClean };
export default Instance;
