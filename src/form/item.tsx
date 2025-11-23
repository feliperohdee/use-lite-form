import { ReactNode, forwardRef, ForwardedRef, useCallback, useContext, useState, useEffect, useId, useRef } from 'react';
import debounce from 'lodash/debounce';
import forEach from 'lodash/forEach';
import isArray from 'lodash/isArray';
import isEqual from 'lodash/isEqual';
import isFunction from 'lodash/isFunction';
import isObject from 'lodash/isObject';
import isString from 'lodash/isString';
import isUndefined from 'lodash/isUndefined';
import trim from 'lodash/trim';

import context from '@/form/context';
import Instance from '@/form/instance';
import util from '@/form/util';

namespace Item {
	export type ItemFunctionProps<T extends object = Instance.Value> = {
		[key: string]: any;
		error: Instance.Errors | Instance.Error | Instance.Error[];
		id: string;
		onChange: (value: Instance.Value) => void;
		value: T;
	};

	export type ItemFunction<T extends object = Instance.Value> = (props: ItemFunctionProps<T>) => ReactNode;
	export type Props = {
		children: ReactNode | ItemFunction;
		childTransform?: (input: {
			instance: Instance;
			prevValue: Instance.Value;
			path: Instance.Path;
			value: Instance.Value;
		}) => Instance.Value;
		debounce?: number;
		defaultValue?: Instance.Value;
		effect?: (input: { instance: Instance; prevValue: Instance.Value; path: Instance.Path; value: Instance.Value }) => void;
		emptyValue?: Instance.Value;
		file?: boolean;
		id?: string;
		onChangeProperty?: string;
		path: Instance.Path;
		required?:
			| boolean
			| ((data: {
					value: Instance.Value;
			  }) => string | boolean | { path: Instance.Path; error: string | boolean }[] | { path: Instance.Path; error: string | boolean });
		resetDelay?: number;
		transformIn?: (input: { instance: Instance; prevValue: Instance.Value; path: Instance.Path; value: Instance.Value }) => Instance.Value;
		transformOut?: (input: { instance: Instance; prevValue: Instance.Value; path: Instance.Path; value: Instance.Value }) => Instance.Value;
		valueGetter?: (value: Instance.Value | React.ChangeEvent) => Instance.Value;
		valueProperty?: string;
	};

	export type State = {
		error: Instance.Errors | Instance.Error | Instance.Error[];
		value: Instance.Value;
	};
}

const trimString = (value: string): string => {
	if (isString(value)) {
		return trim(value);
	}

	return value;
};

const Item = forwardRef(
	(
		{
			childTransform,
			children,
			debounce: debounceTime = 250,
			defaultValue = '',
			effect,
			emptyValue = '',
			file,
			id: propId,
			onChangeProperty = 'onChange',
			path: propPath,
			required: propRequired,
			resetDelay = 100,
			transformIn,
			transformOut,
			valueGetter,
			valueProperty = 'value'
		}: Item.Props,
		ref: ForwardedRef<unknown>
	) => {
		const { instance, locked } = useContext(context);

		if (isUndefined(instance)) {
			throw new Error(`"instance.Item" must be used within a "Form" component.`);
		}

		if (!isArray(propPath)) {
			throw new Error(`"path" is required.`);
		}

		const childTransformRef = useRef((value: Instance.Value): Instance.Value => {
			if (isFunction(childTransform)) {
				const newValue = childTransform({
					instance,
					prevValue: instance.get(pathRef.current, defaultValue),
					path: pathRef.current,
					value
				});

				if (!isUndefined(newValue)) {
					return newValue;
				}
			}

			return value;
		});

		const effectRef = useRef((value: Instance.Value) => {
			if (isFunction(effect)) {
				effect({
					instance,
					prevValue: instance.get(pathRef.current, defaultValue),
					path: pathRef.current,
					value
				});
			}
		});

		const transformInRef = useRef((): Instance.Value => {
			const value = instance.get(pathRef.current, defaultValue);

			if (isFunction(transformIn)) {
				const newValue = transformIn({
					instance,
					prevValue: instance.get(pathRef.current, defaultValue),
					path: pathRef.current,
					value
				});

				if (!isUndefined(newValue)) {
					return newValue;
				}
			}

			return value;
		});

		const transformOutRef = useRef((value: Instance.Value): Instance.Value => {
			if (isFunction(transformOut)) {
				const prevValue = instance.get(pathRef.current, defaultValue);
				const newValue = transformOut({
					instance,
					prevValue,
					path: pathRef.current,
					value
				});

				if (!isUndefined(newValue)) {
					return newValue;
				}
			}

			return value;
		});

		const getValueFromEvent = useRef((value: Instance.Value | React.ChangeEvent): Instance.Value => {
			if (isFunction(valueGetter)) {
				const newValue = valueGetter(value);

				if (!isUndefined(newValue)) {
					return newValue;
				}
			}

			return value;
		});

		const id = useId();
		const idRef = useRef(propId || `form-item-${id}`);
		const itemRef = useRef<Instance.RegisteredItem>(null);
		const pathRef = useRef(propPath);
		const reportFormDelayedRef = useRef<(() => void) & { cancel?: () => void }>(null);
		const requiredRef = useRef(propRequired);
		const userInputPendingReportRef = useRef(false);

		const innerStateRef = useRef<Item.State>({
			error: instance.getError(pathRef.current),
			value: transformInRef.current()
		});

		const [state, setState] = useState<Item.State>(innerStateRef.current);
		const reportForm = useRef(() => {
			const transformed = transformOutRef.current(innerStateRef.current.value);

			if (isFunction(effect)) {
				effectRef.current(transformed);
			}

			instance.set(pathRef.current, transformed, false);
			setTimeout(() => {
				userInputPendingReportRef.current = false;
			}, resetDelay);

			if (requiredRef.current) {
				if (isFunction(requiredRef.current)) {
					const requiredError = requiredRef.current({
						value: trimString(innerStateRef.current.value)
					});

					if (requiredError) {
						if (isArray(requiredError)) {
							forEach(requiredError, ({ path, error }) => {
								if (isArray(path)) {
									if (error) {
										instance.setError(path, isString(error) ? error : 'Required Field.', false, true);
									} else {
										instance.unsetError(path);
									}
								}
							});
							return;
						} else if (isObject(requiredError) && isArray(requiredError.path)) {
							if (requiredError.error) {
								instance.setError(requiredError.path, isString(requiredError.error) ? requiredError.error : 'Required Field.', false, true);
							} else {
								instance.unsetError(requiredError.path);
							}
							return;
						}

						instance.setError(pathRef.current, isString(requiredError) ? requiredError : 'Required Field.', false, true);
						return;
					}
				} else if (trimString(innerStateRef.current.value) === emptyValue) {
					instance.setError(pathRef.current, 'Required Field.', false, true);
					return;
				}
			}

			instance.unsetError(pathRef.current);
		});

		// effect to setup form, runs once
		useEffect(() => {
			if (debounceTime && debounceTime > 0) {
				reportFormDelayedRef.current = debounce(reportForm.current, debounceTime);
			} else {
				reportFormDelayedRef.current = reportForm.current;
			}

			if (!itemRef.current) {
				itemRef.current = {
					id: idRef.current,
					reportFormImmediate: () => {
						if (reportFormDelayedRef.current?.cancel) {
							reportFormDelayedRef.current.cancel();
						}

						reportForm.current();
					}
				};
			}

			instance.registerItem(itemRef.current);

			return () => {
				if (reportFormDelayedRef.current?.cancel) {
					reportFormDelayedRef.current.cancel();
				}

				if (itemRef.current) {
					instance.unregisterItem(itemRef.current);
				}
			};
		}, []); // eslint-disable-line react-hooks/exhaustive-deps

		// update path
		useEffect(() => {
			pathRef.current = propPath;
		}, [propPath]);

		// update required
		useEffect(() => {
			requiredRef.current = propRequired;
		}, [propRequired]);

		// update error or error and value when user input is not pending to report
		useEffect(() => {
			const error = instance.getError(pathRef.current);

			// when user input is pending to report (means there are changes in the value), we just update the error
			if (userInputPendingReportRef.current) {
				if (!isEqual(error, innerStateRef.current.error)) {
					innerStateRef.current.error = error;
					setState(state => {
						return {
							...state,
							error
						};
					});
				}
			} else {
				// when user input is not pending to report, we update the error and value
				const value = transformInRef.current();

				if (!isEqual(error, innerStateRef.current.error) || !isEqual(value, innerStateRef.current.value)) {
					innerStateRef.current.error = error;
					innerStateRef.current.value = value;

					setState(state => {
						return {
							...state,
							error,
							value
						};
					});
				}
			}
		}, [instance, instance.lastChange]);

		const handleChange = useCallback(
			(value: Instance.Value | React.ChangeEvent) => {
				if (locked) {
					return;
				}

				if (reportFormDelayedRef.current?.cancel) {
					reportFormDelayedRef.current.cancel();
				}

				value = getValueFromEvent.current(value);

				if (value && value.target instanceof EventTarget && !isUndefined(value.target)) {
					if (file && !isUndefined(value.target.files)) {
						value = value.target.files;
					} else if (!isUndefined(value.target[valueProperty])) {
						value = value.target[valueProperty];
					}
				}

				userInputPendingReportRef.current = true;
				innerStateRef.current.value = value;
				setState(state => {
					return {
						...state,
						value
					};
				});

				if (reportFormDelayedRef.current) {
					reportFormDelayedRef.current();
				}
			},
			[locked, file, valueProperty]
		);

		const childrenProps = {
			'data-error': state.error,
			'data-id': idRef.current,
			[onChangeProperty]: handleChange,
			[valueProperty]: file ? null : childTransformRef.current(state.value),
			ref
		};

		const itemFunctionProps: Item.ItemFunctionProps = {
			error: state.error,
			id: idRef.current,
			onChange: handleChange,
			value: state.value
		};

		return util.renderChildren(children, childrenProps, itemFunctionProps);
	}
);

export default Item;
