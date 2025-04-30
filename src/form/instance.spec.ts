import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Instance, deepClean } from '@/form/instance';

const wait = (ms: number) => {
	return new Promise(resolve => setTimeout(resolve, ms));
};

describe('/form/instance', () => {
	let instance: Instance;

	beforeEach(() => {
		instance = new Instance();
	});

	describe('constructor', () => {
		it('should initialize with default values', () => {
			expect(instance.value).toEqual({});
			expect(instance.errors).toEqual({});
			expect(instance.id).toMatch(/^form-\d+$/);
			expect(instance.lastChange).toEqual(0);
		});

		it('should initialize with provided value', () => {
			const initialValue = { name: 'test' };
			instance = new Instance(initialValue);
			expect(instance.value).toEqual(initialValue);
		});
	});

	describe('get', () => {
		it('should return the entire value when path is not provided', () => {
			instance.value = { name: 'test' };
			expect(instance.get()).toEqual({ name: 'test' });
		});

		it('should return value at specified path', () => {
			instance.value = { user: { name: 'test', age: 30 } };
			expect(instance.get(['user', 'name'])).toEqual('test');
		});

		it('should return default value when path does not exist', () => {
			instance.value = { user: { name: 'test' } };
			expect(instance.get(['user', 'age'], 25)).toEqual(25);
		});

		it('should use cache for repeated calls', () => {
			instance.value = { user: { name: 'test' } };
			const path = ['user', 'name'];

			// First call should cache the result
			const result1 = instance.get(path);

			// Modify value internally without triggering cache invalidation
			instance.value = { user: { name: 'modified' } };

			// Second call should return cached result
			const result2 = instance.get(path);

			expect(result1).toEqual('test');
			expect(result2).toEqual('test');

			// After triggering onChange, cache should be cleared
			instance.triggerOnChange({ silent: true });

			// Now should get the new value
			expect(instance.get(path)).toEqual('modified');
		});
	});

	describe('getError', () => {
		it('should return all errors when path is not provided', () => {
			instance.errors = { name: 'Required field' };
			expect(instance.getError()).toEqual({ name: 'Required field' });
		});

		it('should return error at specified path', () => {
			instance.errors = { user: { name: 'Required field' } };
			expect(instance.getError(['user', 'name'])).toEqual('Required field');
		});

		it('should return null when error at path does not exist', () => {
			instance.errors = { user: { name: 'Required field' } };
			expect(instance.getError(['user', 'age'])).toBeNull();
		});
	});

	describe('set', () => {
		it('should set value at specified path', () => {
			instance.set(['user', 'name'], 'test');
			expect(instance.value).toEqual({ user: { name: 'test' } });
		});

		it('should trigger onChange when setting a value', () => {
			const triggerSpy = vi.spyOn(instance, 'triggerOnChange');
			instance.set(['user', 'name'], 'test');
			expect(triggerSpy).toHaveBeenCalledWith({ silent: false });
		});

		it('should not trigger onChange when silent is true', () => {
			const triggerSpy = vi.spyOn(instance, 'triggerOnChange');
			instance.set(['user', 'name'], 'test', true);
			expect(triggerSpy).toHaveBeenCalledWith({ silent: true });
		});

		it('should return the updated value', () => {
			const result = instance.set(['user', 'name'], 'test');
			expect(result).toEqual({ user: { name: 'test' } });
		});
	});

	describe('setError', () => {
		it('should set error at specified path', () => {
			instance.setError(['user', 'name'], 'Required field');
			expect(instance.errors).toEqual({ user: { name: 'Required field' } });
		});

		it('should trigger onChange when setting an error', () => {
			const triggerSpy = vi.spyOn(instance, 'triggerOnChange');
			instance.setError(['user', 'name'], 'Required field');
			expect(triggerSpy).toHaveBeenCalledWith({ silent: false });
		});

		it('should not trigger onChange when silent is true', () => {
			const triggerSpy = vi.spyOn(instance, 'triggerOnChange');
			instance.setError(['user', 'name'], 'Required field', true);
			expect(triggerSpy).toHaveBeenCalledWith({ silent: true });
		});

		it('should add to requiredErrors when requiredError is true', () => {
			const addSpy = vi.spyOn(instance.requiredErrors, 'add');
			instance.setError(['user', 'name'], 'Required field', false, true);
			expect(addSpy).toHaveBeenCalledWith(['user', 'name']);
		});

		it('should not add to requiredErrors when requiredError is false', () => {
			const addSpy = vi.spyOn(instance.requiredErrors, 'add');
			instance.setError(['user', 'name'], 'Required field');
			expect(addSpy).not.toHaveBeenCalled();
		});

		it('should return the updated errors', () => {
			const result = instance.setError(['user', 'name'], 'Required field');
			expect(result).toEqual({ user: { name: 'Required field' } });
		});
	});

	describe('unsetError', () => {
		beforeEach(() => {
			instance.errors = {
				user: {
					name: 'Required field',
					age: 'Invalid age'
				}
			};

			instance.requiredErrors.add(['user', 'name']);
		});

		it('should remove error at specified path', () => {
			instance.unsetError(['user', 'name']);
			expect(instance.errors).toEqual({ user: { age: 'Invalid age' } });
		});

		it('should remove from requiredErrors', () => {
			const deleteSpy = vi.spyOn(instance.requiredErrors, 'delete');
			instance.unsetError(['user', 'name']);
			expect(deleteSpy).toHaveBeenCalledWith(['user', 'name']);
		});

		it('should trigger onChange when unsetting an error', () => {
			const triggerSpy = vi.spyOn(instance, 'triggerOnChange');
			instance.unsetError(['user', 'name']);
			expect(triggerSpy).toHaveBeenCalledWith({ silent: false });
		});

		it('should not trigger onChange when silent is true', () => {
			const triggerSpy = vi.spyOn(instance, 'triggerOnChange');
			instance.unsetError(['user', 'name'], true);
			expect(triggerSpy).toHaveBeenCalledWith({ silent: true });
		});

		it('should return the updated errors', () => {
			const result = instance.unsetError(['user', 'name']);
			expect(result).toEqual({ user: { age: 'Invalid age' } });
		});
	});

	describe('update', () => {
		beforeEach(() => {
			instance.value = { count: 5 };
		});

		it('should update value using provided function', () => {
			instance.update(['count'], value => value + 1);
			expect(instance.value).toEqual({ count: 6 });
		});

		it('should trigger onChange when updating a value', () => {
			const triggerSpy = vi.spyOn(instance, 'triggerOnChange');
			instance.update(['count'], value => value + 1);
			expect(triggerSpy).toHaveBeenCalledWith({ silent: false });
		});

		it('should not trigger onChange when silent is true', () => {
			const triggerSpy = vi.spyOn(instance, 'triggerOnChange');
			instance.update(['count'], value => value + 1, true);
			expect(triggerSpy).toHaveBeenCalledWith({ silent: true });
		});

		it('should return the updated value', () => {
			const result = instance.update(['count'], value => value + 1);
			expect(result).toEqual({ count: 6 });
		});

		it('should return original value if fn is not a function', () => {
			const result = instance.update(['count'], 'not a function' as any);
			expect(result).toEqual({ count: 5 });
		});
	});

	describe('patch', () => {
		beforeEach(() => {
			instance.value = { name: 'John', age: 30 };
		});

		it('should merge value with provided object', () => {
			instance.patch({ email: 'john@example.com' });
			expect(instance.value).toEqual({ name: 'John', age: 30, email: 'john@example.com' });
		});

		it('should override existing properties', () => {
			instance.patch({ name: 'Jane' });
			expect(instance.value).toEqual({ name: 'Jane', age: 30 });
		});

		it('should trigger onChange when patching', () => {
			const triggerSpy = vi.spyOn(instance, 'triggerOnChange');
			instance.patch({ email: 'john@example.com' });
			expect(triggerSpy).toHaveBeenCalledWith({ silent: false });
		});

		it('should not trigger onChange when silent is true', () => {
			const triggerSpy = vi.spyOn(instance, 'triggerOnChange');
			instance.patch({ email: 'john@example.com' }, true);
			expect(triggerSpy).toHaveBeenCalledWith({ silent: true });
		});
	});

	describe('replace', () => {
		beforeEach(() => {
			instance.value = { name: 'John', age: 30 };
		});

		it('should replace the entire value', () => {
			instance.replace({ email: 'john@example.com' });
			expect(instance.value).toEqual({ email: 'john@example.com' });
		});

		it('should trigger onChange when replacing', () => {
			const triggerSpy = vi.spyOn(instance, 'triggerOnChange');
			instance.replace({ email: 'john@example.com' });
			expect(triggerSpy).toHaveBeenCalledWith({ silent: false });
		});

		it('should not trigger onChange when silent is true', () => {
			const triggerSpy = vi.spyOn(instance, 'triggerOnChange');
			instance.replace({ email: 'john@example.com' }, true);
			expect(triggerSpy).toHaveBeenCalledWith({ silent: true });
		});
	});

	describe('clear', () => {
		beforeEach(() => {
			instance.value = { name: 'John' };
			instance.errors = { name: 'Error' };
			instance.requiredErrors.add(['name']);
		});

		it('should clear value, errors, and requiredErrors', () => {
			instance.clear();
			expect(instance.value).toEqual({});
			expect(instance.errors).toEqual({});
			expect(instance.requiredErrors.size).toEqual(0);
		});

		it('should trigger onChange when clearing', () => {
			const triggerSpy = vi.spyOn(instance, 'triggerOnChange');
			instance.clear();
			expect(triggerSpy).toHaveBeenCalledWith({ silent: false });
		});

		it('should not trigger onChange when silent is true', () => {
			const triggerSpy = vi.spyOn(instance, 'triggerOnChange');
			instance.clear(true);
			expect(triggerSpy).toHaveBeenCalledWith({ silent: true });
		});
	});

	describe('clearErrors', () => {
		beforeEach(() => {
			instance.value = { name: 'John' };
			instance.errors = { name: 'Error' };
			instance.requiredErrors.add(['name']);
		});

		it('should clear errors and requiredErrors but not value', () => {
			instance.clearErrors();
			expect(instance.value).toEqual({ name: 'John' });
			expect(instance.errors).toEqual({});
			expect(instance.requiredErrors.size).toEqual(0);
		});

		it('should trigger onChange when clearing errors', () => {
			const triggerSpy = vi.spyOn(instance, 'triggerOnChange');
			instance.clearErrors();
			expect(triggerSpy).toHaveBeenCalledWith({ silent: false });
		});

		it('should not trigger onChange when silent is true', () => {
			const triggerSpy = vi.spyOn(instance, 'triggerOnChange');
			instance.clearErrors(true);
			expect(triggerSpy).toHaveBeenCalledWith({ silent: true });
		});
	});

	describe('errorsCount', () => {
		it('should return the number of errors', () => {
			instance.errors = {
				name: 'Name error',
				email: 'Email error',
				address: {
					city: 'City error'
				}
			};

			expect(instance.errorsCount()).toEqual(3);
		});

		it('should return 0 when no errors', () => {
			instance.errors = {};
			expect(instance.errorsCount()).toEqual(0);
		});
	});

	describe('requiredErrorsCount', () => {
		it('should return the size of requiredErrors', () => {
			instance.requiredErrors.add(['name']);
			instance.requiredErrors.add(['email']);

			expect(instance.requiredErrorsCount()).toEqual(2);
		});

		it('should return 0 when no required errors', () => {
			expect(instance.requiredErrorsCount()).toEqual(0);
		});
	});

	describe('onChange', () => {
		it('should add listener to onChangeListeners', async () => {
			const listener = vi.fn();
			instance.onChange(listener);

			// Trigger a change to check if listener is called
			instance.set(['name'], 'test');

			await wait(15);

			expect(listener).toHaveBeenCalledWith(
				{
					errors: {},
					value: { name: 'test' }
				},
				false
			);
		});

		it('should return unsubscribe function', () => {
			const listener = vi.fn();
			const unsubscribe = instance.onChange(listener);

			// Unsubscribe
			unsubscribe();

			// Trigger a change - listener should not be called
			instance.set(['name'], 'test');

			expect(listener).not.toHaveBeenCalled();
		});

		it('should throw error if listener is not a function', () => {
			expect(() => {
				instance.onChange('not a function' as any);
			}).toThrow('listener must be a function.');
		});
	});

	describe('requestImmediateValue', () => {
		it('should call reportFormImmediate on all registered items', () => {
			const item1 = { id: 'item1', reportFormImmediate: vi.fn() };
			const item2 = { id: 'item2', reportFormImmediate: vi.fn() };

			instance.registerItem(item1);
			instance.registerItem(item2);

			instance.requestImmediateValue();

			expect(item1.reportFormImmediate).toHaveBeenCalled();
			expect(item2.reportFormImmediate).toHaveBeenCalled();
		});
	});

	describe('RequiredErrors class', () => {
		it('should convert path array to string when adding', () => {
			instance.requiredErrors.add(['user', 'name']);
			expect(instance.requiredErrors.has('user.name')).toEqual(true);
		});

		it('should convert path array to string when checking has', () => {
			instance.requiredErrors.add('user.name');
			expect(instance.requiredErrors.has(['user', 'name'])).toEqual(true);
		});

		it('should convert path array to string when deleting', () => {
			instance.requiredErrors.add('user.name');
			instance.requiredErrors.delete(['user', 'name']);
			expect(instance.requiredErrors.has('user.name')).toEqual(false);
		});

		it('should delete all errors starting with the given path', () => {
			instance.requiredErrors.add('user.name');
			instance.requiredErrors.add('user.age');
			instance.requiredErrors.add('user.address.city');

			instance.requiredErrors.delete('user');

			expect(instance.requiredErrors.has('user.name')).toEqual(false);
			expect(instance.requiredErrors.has('user.age')).toEqual(false);
			expect(instance.requiredErrors.has('user.address.city')).toEqual(false);
		});

		it('should return true if any error was deleted', () => {
			instance.requiredErrors.add('user.name');

			const result = instance.requiredErrors.delete('user');

			expect(result).toEqual(true);
		});

		it('should return false if no error was deleted', () => {
			const result = instance.requiredErrors.delete('user');

			expect(result).toEqual(false);
		});
	});

	describe('deepClean', () => {
		it('should remove null and undefined values from an object', () => {
			const input = {
				a: 1,
				b: null,
				c: undefined,
				d: 'value'
			};

			const expected = {
				a: 1,
				d: 'value'
			};

			expect(deepClean(input)).toEqual(expected);
		});

		it('should handle nested objects', () => {
			const input = {
				a: 1,
				b: {
					c: null,
					d: 'value',
					e: {
						f: undefined,
						g: 2
					}
				}
			};

			const expected = {
				a: 1,
				b: {
					d: 'value',
					e: {
						g: 2
					}
				}
			};

			expect(deepClean(input)).toEqual(expected);
		});

		it('should remove empty arrays after compaction', () => {
			const input = {
				a: [null, undefined],
				b: [1, 2, 3],
				c: []
			};

			const expected = {
				b: [1, 2, 3]
			};

			expect(deepClean(input)).toEqual(expected);
		});

		it('should remove empty objects', () => {
			const input = {
				a: {},
				b: { c: 1 },
				d: { e: {} }
			};

			const expected = {
				b: { c: 1 }
			};

			expect(deepClean(input)).toEqual(expected);
		});

		it('should handle complex nested structures', () => {
			const input = {
				a: 1,
				b: null,
				c: [{ d: null, e: 2 }, null, { f: undefined, g: {} }],
				h: { i: undefined, j: [] }
			};

			const expected = {
				a: 1,
				c: [{ e: 2 }]
			};

			expect(deepClean(input)).toEqual(expected);
		});

		it('should return the original object if nothing to remove', () => {
			const input = {
				a: 1,
				b: 'test',
				c: { d: 2 }
			};

			expect(deepClean(input)).toEqual(input);
		});
	});
});
