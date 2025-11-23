import { createContext, Fragment, ReactNode, useCallback, useContext, useRef } from 'react';
import filter from 'lodash/filter';
import isFunction from 'lodash/isFunction';
import isPlainObject from 'lodash/isPlainObject';
import isUndefined from 'lodash/isUndefined';
import map from 'lodash/map';
import nth from 'lodash/nth';
import reject from 'lodash/reject';
import size from 'lodash/size';

import context from '@/form/context';
import Instance from '@/form/instance';
import util from '@/form/util';

namespace List {
	export type Context = {
		canAdd: boolean;
		canRemove: boolean;
		getId: (value: Instance.Value, key: number, index: number) => string;
		getKey: (index: number) => number;
		getNthValue: (index: number) => Instance.Value | null;
		handleAdd: (value: Instance.Value, index?: number) => number;
		handleRemove: (index: number) => void;
		handleMove: (from: number, to: number) => void;
		items: Item[];
		path: Instance.Path;
		replace: (value: Instance.Value) => void;
		size: number;
	};

	export type Item<T extends object = Instance.Value> = {
		index: number;
		value: T;
	};

	export type ItemFunctionProps<T extends object = Instance.Value> = {
		add: (value: T, index?: number) => number | undefined;
		addStart: (value: Instance.Value) => number | undefined;
		addAfter: (value: T) => number | undefined;
		addBefore: (value: T) => number | undefined;
		canAdd: boolean;
		canRemove: boolean;
		remove: () => void;
		duplicate: (newValue?: T | ((value: T) => T)) => number | undefined;
		error: () => Instance.Error | Instance.Error[];
		first: boolean;
		getNthValue: (index: number) => T | null;
		index: number;
		instance: Instance;
		items: Item<T>[];
		key: number;
		last: boolean;
		moveDown: () => void;
		moveUp: () => void;
		path: Instance.Path;
		replace: (value: Instance.Value) => void;
		size: number;
		value: T;
	};

	export type ItemFunction<T extends object = Instance.Value> = (props: ItemFunctionProps<T>) => ReactNode;
	export type ItemProps<T extends object = Instance.Value> = {
		children: ReactNode | ItemFunction<T>;
		filter?: (item: List.Item<T>) => boolean;
	};

	export type Props = {
		children: ReactNode;
		getId?: (value: Instance.Value, key: number, index: number) => string;
		min?: number;
		max?: number;
		path: Instance.Path;
	};
}

const listContext = createContext<List.Context>({
	canAdd: false,
	canRemove: false,
	getId: () => '',
	getNthValue: () => null,
	getKey: () => 0,
	handleAdd: () => 0,
	handleRemove: () => {},
	handleMove: () => {},
	items: [],
	path: [],
	replace: () => {},
	size: 0
});

const move = <T extends Instance.Value[]>(array: T, moveIndex: number, toIndex: number): T => {
	const size = array.length;

	if (moveIndex < 0 || moveIndex >= size || toIndex < 0 || toIndex >= size) {
		return array;
	}

	const item = array[moveIndex];
	const diff = moveIndex - toIndex;

	if (diff > 0) {
		// move left
		return [...array.slice(0, toIndex), item, ...array.slice(toIndex, moveIndex), ...array.slice(moveIndex + 1, size)] as T;
	}

	if (diff < 0) {
		// move right
		return [...array.slice(0, moveIndex), ...array.slice(moveIndex + 1, toIndex + 1), item, ...array.slice(toIndex + 1, size)] as T;
	}

	return array;
};

const List = ({
	children,
	getId = (value, key) => {
		return `item-${key}`;
	},
	min = 0,
	max = Infinity,
	path
}: List.Props) => {
	const { instance } = useContext(context);
	const keyManager = useRef({ keys: [] as number[], id: 0 });

	const getKey = useCallback((index: number) => {
		let key = keyManager.current.keys[index];

		if (isUndefined(key)) {
			key = keyManager.current.keys[index] = keyManager.current.id;
			keyManager.current.id += 1;
		}

		return key;
	}, []);

	const handleAdd = useCallback(
		(value: Instance.Value, index = -1) => {
			if (!value) {
				return 0;
			}

			const items = instance.get(path, []);
			const key = keyManager.current.id++;
			const itemsSize = size(items);

			if (index >= 0 && index <= itemsSize) {
				keyManager.current.keys = [...keyManager.current.keys.slice(0, index), key, ...keyManager.current.keys.slice(index)];
				instance.set(path, [...items.slice(0, index), value, ...items.slice(index)]);

				return key;
			}

			keyManager.current.keys = [...keyManager.current.keys, key];
			instance.set(path, [...items, value]);

			return key;
		},
		[instance, path]
	);

	const handleMove = useCallback(
		(from: number, to: number) => {
			if (from === to) {
				return;
			}

			const items = instance.get(path, []);
			const itemsSize = size(items);

			// Do not handle out of range
			if (from < 0 || from >= itemsSize || to < 0 || to >= itemsSize) {
				return;
			}

			keyManager.current.keys = move(keyManager.current.keys, from, to);

			const fromError = instance.getError([...path, from]) as Instance.Error;
			const fromRequiredError = instance.requiredErrors.has([...path, from]);
			const toError = instance.getError([...path, to]) as Instance.Error;
			const toRequiredError = instance.requiredErrors.has([...path, to]);

			instance.unsetError([...path, from]);
			instance.unsetError([...path, to]);

			if (fromError) {
				instance.setError([...path, to], fromError);

				if (fromRequiredError) {
					instance.requiredErrors.add([...path, to]);
				}
			}

			if (toError) {
				instance.setError([...path, from], toError);

				if (toRequiredError) {
					instance.requiredErrors.add([...path, from]);
				}
			}

			return instance.set(path, move(items, from, to));
		},
		[instance, path]
	);

	const handleRemove = useCallback(
		(index: number) => {
			const items = instance.get(path, []) as Instance.Value[];

			instance.requiredErrors.remove([...path, index]);
			instance.unsetError([...path, index]);

			keyManager.current.keys = reject(keyManager.current.keys, (_, index_) => {
				return index === index_;
			});

			return instance.set(
				path,
				reject(items, (_, index_) => {
					return index === index_;
				})
			);
		},
		[instance, path]
	);

	const items = map(instance.get(path, []), (value, index) => {
		return {
			index,
			value
		};
	});

	const getNthValue = useCallback(
		(index: number) => {
			const item = nth(items, index);

			return item ? item.value : null;
		},
		[items]
	);

	const replace = (value: Instance.Value) => {
		return instance.set(path, value);
	};

	const itemsSize = size(items);
	const canAdd = itemsSize < max;
	const canRemove = itemsSize > min;

	const contextValue: List.Context = {
		canAdd,
		canRemove,
		getId,
		getKey,
		getNthValue,
		handleAdd,
		handleRemove,
		handleMove,
		items,
		path,
		replace,
		size: itemsSize
	};

	return (
		<listContext.Provider value={contextValue}>
			{util.renderChildren(children, null, {
				add: (value: Instance.Value, index = -1) => {
					if (!canAdd) {
						return;
					}

					return handleAdd(value, index);
				},
				canAdd,
				getNthValue,
				replace,
				size
			})}
		</listContext.Provider>
	);
};

const ListItems = ({ children, filter: filterFn }: List.ItemProps) => {
	let { instance } = useContext(context);
	let {
		canAdd,
		canRemove,
		getId,
		getKey,
		getNthValue,
		handleAdd,
		handleRemove,
		handleMove,
		items,
		path,
		replace,
		size: itemsSize
	} = useContext(listContext);

	if (filterFn) {
		items = filter(items, filterFn);
		itemsSize = size(items);
	}

	return map(items, ({ index, value }, localIndex) => {
		const key = getKey(index);
		const first = localIndex === 0;
		const last = localIndex >= itemsSize - 1;

		const itemFunctionProps: List.ItemFunctionProps = {
			add: (value: Instance.Value, index?: number) => {
				if (!canAdd) {
					return;
				}

				return handleAdd(value, index);
			},
			addStart: (value: Instance.Value) => {
				if (!canAdd) {
					return;
				}

				return handleAdd(value, 0);
			},
			addAfter: (value: Instance.Value) => {
				if (!canAdd) {
					return;
				}

				return handleAdd(value, index + 1);
			},
			addBefore: (value: Instance.Value) => {
				return handleAdd(value, index);
			},
			canAdd,
			canRemove,
			remove: () => {
				if (!canRemove) {
					return;
				}
				return handleRemove(index);
			},
			duplicate: (newValue?: Instance.Value | ((value: Instance.Value) => Instance.Value)) => {
				if (!canAdd) {
					return;
				}

				if (isFunction(value)) {
					newValue = newValue(value);
				}

				if (!isPlainObject(value)) {
					newValue = {};
				}

				return handleAdd({ ...value, ...newValue }, index + 1);
			},
			error: () => {
				return instance.getError([...path, index]) as Instance.Error | Instance.Error[];
			},
			first,
			getNthValue,
			index,
			instance,
			items,
			key,
			last,
			moveDown: () => {
				if (last) {
					return;
				}

				let nextIndex = index + 1;

				if (filterFn) {
					while (
						nextIndex < itemsSize &&
						!filterFn({
							index: nextIndex,
							value: getNthValue(nextIndex)
						})
					) {
						nextIndex += 1;
					}
				}
				return handleMove(index, nextIndex);
			},
			moveUp: () => {
				if (first) {
					return;
				}

				let prevIndex = index - 1;

				if (filterFn) {
					while (
						prevIndex >= 0 &&
						!filterFn({
							index: prevIndex,
							value: getNthValue(prevIndex)
						})
					) {
						prevIndex -= 1;
					}
				}

				return handleMove(index, prevIndex);
			},
			path: [...path, index],
			replace,
			size: itemsSize,
			value
		};

		return <Fragment key={getId(value, key, index)}>{util.renderChildren(children, itemFunctionProps)}</Fragment>;
	}).filter(Boolean);
};

type ListAddRenderProps = {
	add: (value: Instance.Value, index?: number) => number | undefined;
	canAdd: boolean;
	getNthValue: (index: number) => Instance.Value | null;
	instance: Instance;
	items: List.Item[];
	replace: (value: Instance.Value) => void;
	size: number;
	value: Instance.Value;
};

type ListAddRenderFunction = (props: ListAddRenderProps) => ReactNode;
type ListAddProps = {
	children: ReactNode | ListAddRenderFunction;
};

const ListAdd = ({ children }: ListAddProps) => {
	const { instance } = useContext(context);
	const { canAdd, getNthValue, handleAdd, items, replace, size } = useContext(listContext);

	return util.renderChildren(children, {
		add: (value: Instance.Value, index = -1) => {
			if (!canAdd) {
				return;
			}

			return handleAdd(value, index);
		},
		canAdd,
		getNthValue,
		instance,
		items,
		replace,
		size
	});
};

List.Items = ListItems;
List.Add = ListAdd;

export default List;
