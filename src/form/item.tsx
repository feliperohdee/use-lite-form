import { ReactNode, forwardRef, ForwardedRef, useCallback, useContext, useState, useEffect, useRef } from 'react';
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
	export type RenderProps = {
		[key: string]: any;
		error: Instance.Errors | Instance.Error | Instance.Error[];
		id: string;
		onChange: (value: Instance.Value) => void;
		value: Instance.Value;
	};

	export type RenderFunction = (props: RenderProps) => ReactNode;
	export type Props = {
		children: ReactNode | RenderFunction;
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
		transform?: (input: { instance: Instance; prevValue: Instance.Value; path: Instance.Path; value: Instance.Value }) => Instance.Value;
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

let itemIndex = 0;

const trimString = (value: string): string => {
	if (isString(value)) {
		return trim(value);
	}
	return value;
};

const Item = forwardRef(
	(
		{
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
			transform,
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

		const effectRef = useRef((value: Instance.Value) => {
			if (isFunction(effect)) {
				effect({
					instance,
					prevValue: instance.get(path.current, defaultValue),
					path: path.current,
					value
				});
			}
		});

		const transformInRef = useRef((): Instance.Value => {
			const value = instance.get(path.current, defaultValue);

			if (isFunction(transformIn)) {
				const newValue = transformIn({
					instance,
					prevValue: instance.get(path.current, defaultValue),
					path: path.current,
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
				const prevValue = instance.get(path.current, defaultValue);
				const newValue = transformOut({
					instance,
					prevValue,
					path: path.current,
					value
				});

				if (!isUndefined(newValue)) {
					return newValue;
				}
			}

			return value;
		});

		const transformRef = useRef((value: Instance.Value): Instance.Value => {
			if (isFunction(transform)) {
				const newValue = transform({
					instance,
					prevValue: instance.get(path.current, defaultValue),
					path: path.current,
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

		const id = useRef(propId || `form-item-${itemIndex++}`);
		const item = useRef<Instance.RegisteredItem>(null);
		const path = useRef(propPath);
		const reportFormDelayed = useRef<(() => void) & { cancel?: () => void }>(null);
		const required = useRef(propRequired);
		const userInputPendingReport = useRef(false);

		const innerStateRef = useRef<Item.State>({
			error: instance.getError(path.current),
			value: transformInRef.current()
		});

		const [state, setState] = useState<Item.State>(innerStateRef.current);
		const reportForm = useRef(() => {
			const transformed = transformOutRef.current(innerStateRef.current.value);

			if (isFunction(effect)) {
				effectRef.current(transformed);
			}

			instance.set(path.current, transformed, false);
			userInputPendingReport.current = false;

			if (required.current) {
				if (isFunction(required.current)) {
					const requiredError = required.current({
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

						instance.setError(path.current, isString(requiredError) ? requiredError : 'Required Field.', false, true);
						return;
					}
				} else if (trimString(innerStateRef.current.value) === emptyValue) {
					instance.setError(path.current, 'Required Field.', false, true);
					return;
				}
			}

			instance.unsetError(path.current);
		});

		// effect to setup form, runs once
		useEffect(() => {
			if (debounceTime && debounceTime > 0) {
				reportFormDelayed.current = debounce(reportForm.current, debounceTime);
			} else {
				reportFormDelayed.current = reportForm.current;
			}

			if (!item.current) {
				item.current = {
					id: id.current,
					reportFormImmediate: () => {
						if (reportFormDelayed.current?.cancel) {
							reportFormDelayed.current.cancel();
						}

						reportForm.current();
					}
				};
			}

			instance.registerItem(item.current);

			return () => {
				if (reportFormDelayed.current?.cancel) {
					reportFormDelayed.current.cancel();
				}

				if (item.current) {
					instance.unregisterItem(item.current);
				}
			};
		}, []); // eslint-disable-line react-hooks/exhaustive-deps

		useEffect(() => {
			const error = instance.getError(path.current);

			// when user input is pending to report (means there are changes in the value), we just update the error
			if (userInputPendingReport.current) {
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

		// update path
		useEffect(() => {
			path.current = propPath;
		}, [propPath]);

		// update required
		useEffect(() => {
			required.current = propRequired;
		}, [propRequired]);

		const handleChange = useCallback(
			(value: Instance.Value | React.ChangeEvent) => {
				if (locked) {
					return;
				}

				value = getValueFromEvent.current(value);

				if (value && value.target instanceof EventTarget && !isUndefined(value.target)) {
					if (file && !isUndefined(value.target.files)) {
						value = value.target.files;
					} else if (!isUndefined(value.target[valueProperty])) {
						value = value.target[valueProperty];
					}
				}

				userInputPendingReport.current = true;

				if (reportFormDelayed.current?.cancel) {
					reportFormDelayed.current.cancel();
				}

				innerStateRef.current.value = value;
				setState(state => {
					return {
						...state,
						value
					};
				});

				if (reportFormDelayed.current) {
					reportFormDelayed.current();
				}
			},
			[locked, file, valueProperty]
		);

		const childrenProps = {
			'data-error': state.error,
			'data-id': id.current,
			[onChangeProperty]: handleChange,
			[valueProperty]: file ? null : transformRef.current(state.value),
			ref
		};

		return util.renderChildren(children, childrenProps, {
			error: state.error,
			id: id.current,
			onChange: handleChange,
			value: state.value
		});
	}
);

export default Item;
