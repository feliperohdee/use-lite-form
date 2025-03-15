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
		canDelete: boolean;
		getId: (value: Instance.Value, key: number, index: number) => string;
		getKey: (index: number) => number;
		getValue: (index?: number) => Instance.Value | null;
		handleAdd: (value: Instance.Value, index?: number) => number;
		handleDelete: (index: number) => void;
		handleMove: (from: number, to: number) => void;
		items: Item[];
		path: Instance.Path;
		replace: (value: Instance.Value) => void;
		size: number;
	};

	export type Item = {
		index: number;
		value: Instance.Value;
	};

	export type ItemRenderProps = {
		add: (value: Instance.Value, index?: number) => number | undefined;
		addStart: (value: Instance.Value) => number | undefined;
		addAfter: (value: Instance.Value) => number | undefined;
		addBefore: (value: Instance.Value) => number | undefined;
		canAdd: boolean;
		canDelete: boolean;
		delete: () => void;
		duplicate: (newValue?: Instance.Value | ((value: Instance.Value) => Instance.Value)) => number | undefined;
		error: () => Instance.Error | Instance.Error[];
		first: boolean;
		getValue: (index?: number) => Instance.Value | null;
		index: number;
		key: number;
		last: boolean;
		moveDown: () => void;
		moveUp: () => void;
		path: Instance.Path;
		replace: (value: Instance.Value) => void;
		size: number;
		value: Instance.Value;
	};

	export type ItemsRenderFunction = (props: ItemRenderProps) => ReactNode;
	export type ItemsProps = {
		children: ReactNode | ItemsRenderFunction;
		filter?: (item: List.Item) => boolean;
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
	canDelete: false,
	getId: () => '',
	getValue: () => null,
	getKey: () => 0,
	handleAdd: () => 0,
	handleDelete: () => {},
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
	const { form } = useContext(context);
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

			const items = form.get(path, []);
			const key = keyManager.current.id++;
			const itemsSize = size(items);

			if (index >= 0 && index <= itemsSize) {
				keyManager.current.keys = [...keyManager.current.keys.slice(0, index), key, ...keyManager.current.keys.slice(index)];
				form.set(path, [...items.slice(0, index), value, ...items.slice(index)]);

				return key;
			}

			keyManager.current.keys = [...keyManager.current.keys, key];
			form.set(path, [...items, value]);

			return key;
		},
		[form, path]
	);

	const handleMove = useCallback(
		(from: number, to: number) => {
			if (from === to) {
				return;
			}

			const items = form.get(path, []);
			const itemsSize = size(items);

			// Do not handle out of range
			if (from < 0 || from >= itemsSize || to < 0 || to >= itemsSize) {
				return;
			}

			keyManager.current.keys = move(keyManager.current.keys, from, to);

			const fromError = form.getError([...path, from]) as Instance.Error;
			const fromRequiredError = form.requiredErrors.has([...path, from]);
			const toError = form.getError([...path, to]) as Instance.Error;
			const toRequiredError = form.requiredErrors.has([...path, to]);

			form.unsetError([...path, from]);
			form.unsetError([...path, to]);

			if (fromError) {
				form.setError([...path, to], fromError);

				if (fromRequiredError) {
					form.requiredErrors.add([...path, to]);
				}
			}

			if (toError) {
				form.setError([...path, from], toError);

				if (toRequiredError) {
					form.requiredErrors.add([...path, from]);
				}
			}

			return form.set(path, move(items, from, to));
		},
		[form, path]
	);

	const handleDelete = useCallback(
		(index: number) => {
			const items = form.get(path, []) as Instance.Value[];

			form.requiredErrors.delete([...path, index]);
			form.unsetError([...path, index]);

			keyManager.current.keys = reject(keyManager.current.keys, (_, index_) => {
				return index === index_;
			});

			return form.set(
				path,
				reject(items, (_, index_) => {
					return index === index_;
				})
			);
		},
		[form, path]
	);

	const items = map(form.get(path, []), (value, index) => ({
		index,
		value
	}));

	const getValue = useCallback(
		(index?: number) => {
			if (isUndefined(index)) {
				return map(items, 'item');
			}

			const item = nth(items, index);

			return item ? item.value : null;
		},
		[items]
	);

	const replace = (value: Instance.Value) => {
		return form.set(path, value);
	};

	const itemsSize = size(items);
	const canAdd = itemsSize < max;
	const canDelete = itemsSize > min;

	const contextValue: List.Context = {
		canAdd,
		canDelete,
		getId,
		getKey,
		getValue,
		handleAdd,
		handleDelete,
		handleMove,
		items,
		path,
		replace,
		size: itemsSize
	};

	return (
		<listContext.Provider value={contextValue}>
			{util.renderChildren(children, {
				add: (value: Instance.Value, index = -1) => {
					if (!canAdd) {
						return;
					}

					return handleAdd(value, index);
				},
				canAdd,
				getValue,
				replace,
				size
			})}
		</listContext.Provider>
	);
};

const ListItems = ({ children, filter: filterFn }: List.ItemsProps) => {
	let { form } = useContext(context);
	let {
		canAdd,
		canDelete,
		getId,
		getKey,
		getValue,
		handleAdd,
		handleDelete,
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

		const itemProps: List.ItemRenderProps = {
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
			canDelete,
			delete: () => {
				if (!canDelete) {
					return;
				}
				return handleDelete(index);
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
				return form.getError([...path, index]) as Instance.Error | Instance.Error[];
			},
			first,
			getValue,
			index,
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
							value: getValue(nextIndex)
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
							value: getValue(prevIndex)
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

		return <Fragment key={getId(value, key, index)}>{util.renderChildren(children, itemProps)}</Fragment>;
	}).filter(Boolean);
};

type ListAddRenderProps = {
	add: (value: Instance.Value, index?: number) => number | undefined;
	canAdd: boolean;
	getValue: (index?: number) => Instance.Value | null;
	replace: (value: Instance.Value) => void;
	size: number;
};

type ListAddRenderFunction = (props: ListAddRenderProps) => ReactNode;
type ListAddProps = {
	children: ReactNode | ListAddRenderFunction;
};

const ListAdd = ({ children }: ListAddProps) => {
	const { canAdd, getValue, handleAdd, replace, size } = useContext(listContext);

	return util.renderChildren(children, {
		add: (value: Instance.Value, index = -1) => {
			if (!canAdd) {
				return;
			}

			return handleAdd(value, index);
		},
		canAdd,
		getValue,
		replace,
		size
	});
};

List.Items = ListItems;
List.Add = ListAdd;

export default List;
