import cloneDeep from 'lodash/cloneDeep';
import debounce from 'lodash/debounce';
import forEach from 'lodash/forEach';
import get from 'lodash/get';
import isArray from 'lodash/isArray';
import isEmpty from 'lodash/isEmpty';
import isFunction from 'lodash/isFunction';
import isNil from 'lodash/isNil';
import isObject from 'lodash/isObject';
import isPlainObject from 'lodash/isPlainObject';
import isString from 'lodash/isString';
import isUndefined from 'lodash/isUndefined';
import now from 'lodash/now';
import omitBy from 'lodash/omitBy';
import set from 'lodash/set';
import size from 'lodash/size';

const deepClean = (obj: any): any => {
	// avoid mutating the original object
	const clone = cloneDeep(obj);

	// Handle null/undefined input
	if (isNil(clone)) {
		return clone;
	}

	// Process arrays
	if (isArray(clone)) {
		// First clean each array item recursively
		const processed = clone
			.map(item => {
				return isObject(item) ? deepClean(item) : item;
			})
			// Then filter out null/undefined values
			.filter(item => {
				return !isNil(item);
			});

		// Return null if array is empty after processing
		return size(processed) > 0 ? processed : null;
	}

	// Process objects
	if (isPlainObject(clone)) {
		// Process each property recursively
		forEach(clone, (value, key) => {
			if (isObject(value)) {
				clone[key] = deepClean(value);

				// If the result is null after processing, remove the property
				if (isNil(clone[key])) {
					delete clone[key];
				}
			}
		});

		// Use omitBy to remove all null/undefined values
		const result = omitBy(clone, isNil);

		// Return null if object is empty after processing
		return !isEmpty(result) ? result : null;
	}

	// Return primitive values as is
	return clone;
};

namespace Instance {
	export type Error = string | null;
	export type Errors = {
		[key: string]: Errors | Error | Error[];
	};

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
		(payload: Payload<T>, silent: boolean): void;
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
	private onChangeListeners: Set<Instance.Listener>;

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
		this.triggerOnChange({ silent });
	}

	clearErrors(silent: boolean = false): void {
		this.errors = {};
		this.requiredErrors.clear();
		this.triggerOnChange({ silent });
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

	init(value: T, silent: boolean = false): void {
		if (size(this.value) > 0) {
			return;
		}

		this.value = value;
		this.triggerOnChange({ silent });
	}

	onChange(listener: Instance.Listener): () => void {
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
		this.triggerOnChange({ silent });
	}

	registerItem(item: Instance.RegisteredItem): void {
		this.items.add(item);
	}

	replace(value: T, silent: boolean = false): void {
		this.value = value;
		this.triggerOnChange({ silent });
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
		this.triggerOnChange({ silent });

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

		this.triggerOnChange({ silent });

		return this.errors;
	}

	triggerOnChange(args: { silent?: boolean }) {
		const { silent = false } = args;

		this.lastChange = now();
		this.cacheFlush();
		this.triggerOnChangeDebounced({ silent });
	}

	triggerOnChangeDebounced = debounce((args: { silent?: boolean }) => {
		const { silent = false } = args;

		if (this.changesCount > 0) {
			this.changed = this.lastChange > this.lastSubmit;
		}

		this.changesCount += 1;

		const payload = this.getPayload();
		this.onChangeListeners.forEach(listener => {
			listener(payload, silent);
		});
	}, 10);

	unregisterItem(item: Instance.RegisteredItem): void {
		this.items.delete(item);
	}

	unsetError(path: Instance.Path, silent: boolean = false): Instance.Errors {
		this.errors = deepClean(set(this.errors, path, null)) || {};
		this.requiredErrors.remove(path);
		this.triggerOnChange({ silent });

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
