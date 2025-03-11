import { ReactNode, ReactElement, Children, cloneElement, Key } from 'react';
import clsx from 'clsx';
import isArray from 'lodash/isArray';
import isFunction from 'lodash/isFunction';
import isNumber from 'lodash/isNumber';
import isObject from 'lodash/isObject';
import size from 'lodash/size';

type RenderChildrenProps = {
	className?: string;
	key?: Key | null;
	[key: string]: any;
};

type RenderChildrenFunction<T extends RenderChildrenProps = RenderChildrenProps> = (props: T) => ReactNode;

const renderChildren = <T extends RenderChildrenProps = RenderChildrenProps>(
	children: ReactNode | RenderChildrenFunction<T>,
	mergeProps?: Partial<T> | null,
	mergePropsForFunction?: Partial<T>
): ReactNode => {
	if (!children) {
		return null;
	}

	const props = (childProps?: Partial<T>): T => {
		const className = clsx(childProps && childProps.className, mergeProps && mergeProps.className);
		const props = {
			...childProps,
			...mergeProps
		} as T;

		if (className) {
			props.className = className;
		}

		if (!props.key) {
			props.key = null;
		}

		return props;
	};

	if (isFunction(children)) {
		return (children as RenderChildrenFunction<T>)(props(mergePropsForFunction as Partial<T>));
	}

	if (isArray(children)) {
		return Children.map(children, child => {
			if (!child) {
				return null;
			}
			return renderChildren(child, mergeProps, mergePropsForFunction);
		});
	}

	return cloneElement(children as ReactElement, props((children as ReactElement).props as Partial<T>));
};

const set = <T>(obj: T, paths: (string | number)[], value: any = null): T => {
	if (!size(paths)) {
		return value;
	}

	let clone: any;
	const [path, ...restPath] = paths;

	if (!obj && isNumber(path)) {
		clone = [];
	} else if (isArray(obj)) {
		clone = [...obj];
	} else if (!isObject(obj)) {
		clone = {};
	} else {
		clone = { ...(obj as object) };
	}

	clone[path] = set(clone[path], restPath, value);
	return clone as T;
};

export default {
	renderChildren,
	set
};
