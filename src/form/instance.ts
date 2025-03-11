import cloneDeep from 'lodash/cloneDeep';
import debounce from 'lodash/debounce';
import get from 'lodash/get';
import isArray from 'lodash/isArray';
import isEmpty from 'lodash/isEmpty';
import isFunction from 'lodash/isFunction';
import isString from 'lodash/isString';
import isUndefined from 'lodash/isUndefined';
import now from 'lodash/now';
import omit from 'lodash/omit';
import set from 'lodash/set';
import size from 'lodash/size';

import { Item } from '@/form/item';

namespace Instance {
	export type Path = (string | number)[];
	export type Value = any;

	export type Error = string | null;
	export type Errors = {
		[key: string]: Errors | Error | Error[];
	};

	export type Listener = {
		(data: { errors: Errors; value: Instance.Value }, silent: boolean): void;
	};
}

class RequiredErrors extends Set<string> {
	add(key: string | Instance.Path): this {
		if (isArray(key)) {
			key = key.join('.');
		}

		return super.add(key);
	}

	delete(key: string | Instance.Path): boolean {
		if (isArray(key)) {
			key = key.join('.');
		}

		let deleted = false;

		super.forEach(requiredError => {
			if (requiredError.startsWith(key)) {
				super.delete(requiredError);
				deleted = true;
			}
		});

		return super.delete(key) || deleted;
	}

	has(key: string | Instance.Path): boolean {
		if (isArray(key)) {
			key = key.join('.');
		}

		return super.has(key);
	}
}

class Instance {
	private static index = 0;
	private cache: {
		error: { [key: string]: Instance.Error };
		get: { [key: string]: Instance.Value };
	};

	private items: Set<Item>;
	private onChangeListeners: Set<Instance.Listener>;

	public errors: Instance.Errors;
	public id: string;
	public lastChange: number;
	public requiredErrors: RequiredErrors;
	public value: Instance.Value;

	constructor(value?: Instance.Value) {
		this.cache = {
			error: {},
			get: {}
		};

		this.errors = {};
		this.id = `form-${Instance.index++}`;
		this.items = new Set();
		this.lastChange = 0;
		this.onChangeListeners = new Set();
		this.requiredErrors = new RequiredErrors();
		this.value = value || {};
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
		this.value = {};
		this.errors = {};
		this.requiredErrors.clear();
		this.triggerOnChange({ silent });
	}

	clearErrors(silent: boolean = false): void {
		this.errors = {};
		this.requiredErrors.clear();
		this.triggerOnChange({ silent });
	}

	get(path?: Instance.Path, defaultValue?: Instance.Value): Instance.Value {
		if (!path) {
			return this.value;
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

	errorsCount(): number {
		return size(this.errors);
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

	patch(value: Partial<Instance.Value>, silent: boolean = false): void {
		this.value = {
			...this.value,
			...value
		};
		this.triggerOnChange({ silent });
	}

	registerItem(item: Item): void {
		this.items.add(item);
	}

	replace(value: Instance.Value, silent: boolean = false): void {
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

	set(path: Instance.Path, value: Instance.Value, silent: boolean = false): Instance.Value {
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

		this.onChangeListeners.forEach(listener => {
			listener(
				{
					errors: this.errors,
					value: this.value
				},
				silent
			);
		});
	}, 10);

	unregisterItem(item: Item): void {
		this.items.delete(item);
	}

	unsetError(path: Instance.Path, silent: boolean = false): Instance.Errors {
		this.errors = omit(this.errors, path.join('.'));
		this.requiredErrors.delete(path);
		this.triggerOnChange({ silent });

		return this.errors;
	}

	update(path: Instance.Path, fn: (value: Instance.Value) => Instance.Value, silent: boolean = false): Instance.Value {
		if (!isFunction(fn)) {
			return this.value;
		}

		const value = this.get(path, null);

		return this.set(path, fn(value), silent);
	}
}

export { Instance };
export default Instance;
