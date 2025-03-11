import { Component, forwardRef, ForwardedRef, ReactNode, useContext } from 'react';
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
		form?: Instance;
		id?: string;
		locked?: boolean;
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
		id: string;
		value: Instance.Value;
	};
}

class Item extends Component<Item.Props, Item.State> {
	static defaultProps: Partial<Item.Props> = {
		debounce: 250,
		defaultValue: '',
		emptyValue: '',
		onChangeProperty: 'onChange',
		valueProperty: 'value'
	};

	private static index: number = 0;
	private commit: boolean = false;
	// @ts-expect-error
	private reportFormDelayed: (() => void) & { cancel?: () => void };

	constructor(props: Item.Props) {
		super(props);

		const { defaultValue, form, path } = props;

		if (isUndefined(form)) {
			throw new Error(`"Form.Item" must be wrapped by a "Form".`);
		}

		if (!isArray(path)) {
			throw new Error(`"path" is required.`);
		}

		const value = form.get(path, defaultValue);

		this.state = {
			error: form.getError(path),
			id: props.id || '',
			value: this.transformIn(value)
		};
	}

	cancelReportFormDelayed(): void {
		if (!isFunction(this.reportFormDelayed.cancel)) {
			return;
		}

		this.reportFormDelayed.cancel();
	}

	componentDidMount(): void {
		const { debounce: debounceTime, form, id } = this.props;

		if (debounceTime && debounceTime > 0) {
			this.reportFormDelayed = debounce(this.reportForm, debounceTime);
		} else {
			this.reportFormDelayed = this.reportForm;
		}

		form!.registerItem(this);

		if (!id) {
			this.setState({ id: `form-item-${Item.index++}` });
		}
	}

	componentWillUnmount(): void {
		const { form } = this.props;

		form!.unregisterItem(this);
	}

	componentDidUpdate(): void {
		const { form, path, defaultValue } = this.props;
		const error = form!.getError(path);

		if (this.commit) {
			if (!isEqual(error, this.state.error)) {
				this.setState({ error });
			}
		} else {
			const value = this.transformIn(form!.get(path, defaultValue));

			if (!isEqual(error, this.state.error) || !isEqual(value, this.state.value)) {
				this.setState({ error, value });
			}
		}
	}

	onChange(value: Instance.Value | React.ChangeEvent): void {
		const { file, locked, valueProperty } = this.props;

		if (locked) {
			return;
		}

		value = this.valueGetter(value);

		if (value && value.target instanceof EventTarget && !isUndefined(value.target)) {
			if (file && !isUndefined(value.target.files)) {
				value = value.target.files;
			} else if (!isUndefined(value.target[valueProperty!])) {
				value = value.target[valueProperty!];
			}
		}

		this.commit = true;
		this.cancelReportFormDelayed();
		this.setState({ value }, this.reportFormDelayed);
	}

	render(): ReactNode {
		const { children, file, onChangeProperty, valueProperty } = this.props;
		const { error, id, value } = this.state;
		const childrenProps: any = {
			'data-error': error,
			'data-id': id,
			[onChangeProperty!]: this.onChange.bind(this),
			[valueProperty!]: file ? undefined : this.transform(value)
		};

		return util.renderChildren(children, childrenProps, { error, id });
	}

	reportForm(): void {
		const { effect, emptyValue, form, path, required } = this.props;
		const { value } = this.state;

		const transformed = this.transformOut(value);

		if (isFunction(effect)) {
			effect(transformed);
		}

		form!.set(path, transformed, false);
		this.commit = false;

		if (required) {
			if (isFunction(required)) {
				const requiredError = required({ value: this.trimString(value) });

				if (requiredError) {
					if (isArray(requiredError)) {
						forEach(requiredError, ({ path, error }) => {
							if (isArray(path)) {
								if (error) {
									form!.setError(path, isString(error) ? error : 'Required Field.', false, true);
								} else {
									form!.unsetError(path);
								}
							}
						});
						return;
					} else if (isObject(requiredError) && isArray(requiredError.path)) {
						if (requiredError.error) {
							form!.setError(requiredError.path, isString(requiredError.error) ? requiredError.error : 'Required Field.', false, true);
						} else {
							form!.unsetError(requiredError.path);
						}

						return;
					}

					form!.setError(path, isString(requiredError) ? requiredError : 'Required Field.', false, true);
					return;
				}
			} else if (this.trimString(value) === emptyValue) {
				form!.setError(path, 'Required Field.', false, true);
				return;
			}
		}

		form!.unsetError(path);
	}

	reportFormImmediate(): void {
		this.cancelReportFormDelayed();
		this.reportForm();
	}

	transform(value: Instance.Value): Instance.Value {
		const { transform } = this.props;

		if (isFunction(transform)) {
			const newValue = transform(value);

			if (!isUndefined(newValue)) {
				return newValue;
			}
		}

		return value;
	}

	trimString(value: string): string {
		if (isString(value)) {
			return trim(value);
		}

		return value;
	}

	transformIn(value: Instance.Value): Instance.Value {
		const { transformIn } = this.props;

		if (isFunction(transformIn)) {
			const newValue = transformIn(value);

			if (!isUndefined(newValue)) {
				return newValue;
			}
		}

		return value;
	}

	transformOut(value: Instance.Value): Instance.Value {
		const { defaultValue, form, path, transformOut } = this.props;

		if (isFunction(transformOut)) {
			const newValue = transformOut(value, {
				form: form!,
				oldValue: form!.get(path, defaultValue),
				path
			});

			if (!isUndefined(newValue)) {
				return newValue;
			}
		}

		return value;
	}

	valueGetter(value: Instance.Value | React.ChangeEvent): Instance.Value {
		const { valueGetter } = this.props;

		if (isFunction(valueGetter)) {
			const newValue = valueGetter(value);

			if (!isUndefined(newValue)) {
				return newValue;
			}
		}

		return value;
	}
}

const ForwardedItem = forwardRef((props: Item.Props, ref: ForwardedRef<Item>) => {
	const { form, locked } = useContext(context);

	return (
		<Item
			{...props}
			form={form}
			locked={locked}
			ref={ref}
		/>
	);
});

export { Item };
export default ForwardedItem;
