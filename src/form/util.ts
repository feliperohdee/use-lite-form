import { ReactNode, ReactElement, Children, cloneElement, Key } from 'react';
import clsx from 'clsx';
import isArray from 'lodash/isArray';
import isFunction from 'lodash/isFunction';

type RenderChildrenProps = {
	[key: string]: any;
	className?: string;
	key?: Key | null;
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

export default { renderChildren };
