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
		effect?: (value: Instance.Value) => void;
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
		transform?: (value: Instance.Value) => Instance.Value;
		transformIn?: (value: Instance.Value) => Instance.Value;
		transformOut?: (value: Instance.Value, context: { form: Instance; oldValue: Instance.Value; path: Instance.Path }) => Instance.Value;
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
		const { form, locked } = useContext(context);

		if (isUndefined(form)) {
			throw new Error(`"Form.Item" must be used within a "Form" component.`);
		}

		if (!isArray(propPath)) {
			throw new Error(`"path" is required.`);
		}

		const transformInValue = useRef((value: Instance.Value): Instance.Value => {
			if (isFunction(transformIn)) {
				const newValue = transformIn(value);

				if (!isUndefined(newValue)) {
					return newValue;
				}
			}

			return value;
		});

		const transformOutValue = useRef((value: Instance.Value): Instance.Value => {
			if (isFunction(transformOut)) {
				const newValue = transformOut(value, {
					form: form,
					oldValue: form.get(path.current, defaultValue),
					path: path.current
				});

				if (!isUndefined(newValue)) {
					return newValue;
				}
			}

			return value;
		});

		const transformValue = useRef((value: Instance.Value): Instance.Value => {
			if (isFunction(transform)) {
				const newValue = transform(value);

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
		const userInputPending = useRef(false);

		const state = useRef<Item.State>({
			error: form.getError(path.current),
			value: transformInValue.current(form.get(path.current, defaultValue))
		});

		const [uiState, setUiState] = useState<Item.State>(state.current);
		const reportForm = useRef(() => {
			const transformed = transformOutValue.current(state.current.value);

			if (isFunction(effect)) {
				effect(transformed);
			}

			form.set(path.current, transformed, false);
			userInputPending.current = false;

			if (required.current) {
				if (isFunction(required.current)) {
					const requiredError = required.current({ value: trimString(state.current.value) });

					if (requiredError) {
						if (isArray(requiredError)) {
							forEach(requiredError, ({ path, error }) => {
								if (isArray(path)) {
									if (error) {
										form.setError(path, isString(error) ? error : 'Required Field.', false, true);
									} else {
										form.unsetError(path);
									}
								}
							});
							return;
						} else if (isObject(requiredError) && isArray(requiredError.path)) {
							if (requiredError.error) {
								form.setError(requiredError.path, isString(requiredError.error) ? requiredError.error : 'Required Field.', false, true);
							} else {
								form.unsetError(requiredError.path);
							}
							return;
						}

						form.setError(path.current, isString(requiredError) ? requiredError : 'Required Field.', false, true);
						return;
					}
				} else if (trimString(state.current.value) === emptyValue) {
					form.setError(path.current, 'Required Field.', false, true);
					return;
				}
			}

			form.unsetError(path.current);
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

			form.registerItem(item.current);

			return () => {
				if (reportFormDelayed.current?.cancel) {
					reportFormDelayed.current.cancel();
				}

				if (item.current) {
					form.unregisterItem(item.current);
				}
			};
		}, []); // eslint-disable-line react-hooks/exhaustive-deps

		useEffect(() => {
			const error = form.getError(path.current);

			// when user input is pending, we just update the error
			if (userInputPending.current) {
				if (!isEqual(error, state.current.error)) {
					state.current.error = error;
					setUiState(state => {
						return {
							...state,
							error
						};
					});
				}
			} else {
				// when user input is not pending, we update the error and value
				const value = transformInValue.current(form.get(path.current, defaultValue));

				if (!isEqual(error, state.current.error) || !isEqual(value, state.current.value)) {
					state.current.error = error;
					state.current.value = value;

					setUiState(state => {
						return {
							...state,
							error,
							value
						};
					});
				}
			}
		}, [form, path, defaultValue]);

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

				userInputPending.current = true;

				if (reportFormDelayed.current?.cancel) {
					reportFormDelayed.current.cancel();
				}

				state.current.value = value;
				setUiState(state => {
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
			'data-error': uiState.error,
			'data-id': id.current,
			[onChangeProperty]: handleChange,
			[valueProperty]: file ? null : transformValue.current(uiState.value),
			ref
		};

		return util.renderChildren(children, childrenProps, {
			error: uiState.error,
			id: id.current,
			onChange: handleChange,
			value: uiState.value
		});
	}
);

export default Item;
