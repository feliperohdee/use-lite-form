import clsx from 'clsx';
import isFunction from 'lodash/isFunction';
import isUndefined from 'lodash/isUndefined';
import now from 'lodash/now';
import {
	createElement,
	ElementType,
	ForwardedRef,
	FormEvent,
	HTMLAttributes,
	KeyboardEvent,
	PropsWithChildren,
	ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState
} from 'react';

import context from '@/form/context';
import Instance from '@/form/instance';
import Item from '@/form/item';
import List from '@/form/list';
import useForm from '@/form/use-form';
import util from '@/form/util';

namespace Form {
	export type ChangePayload = {
		errors: Instance.Errors;
		errorsCount: number;
		form: Instance;
		requiredErrorsCount: number;
		value: Instance.Value;
	};

	export type SubmitPayload = {
		errors: Instance.Errors;
		errorsCount: number;
		form: Instance;
		requiredErrorsCount: number;
		value: Instance.Value;
	};

	export interface Props extends Omit<PropsWithChildren<HTMLAttributes<HTMLElement>>, 'onChange' | 'onSubmit'> {
		as?: ElementType;
		children: ReactNode;
		className?: string;
		form?: Instance;
		implicit?: boolean;
		locked?: boolean;
		onChange?: (payload: ChangePayload) => void;
		onSubmit?: (payload: SubmitPayload) => void;
		ref?: ForwardedRef<HTMLElement>;
		value?: Instance.Value;
	}

	export type Error = Instance.Error;
	export type Errors = Instance.Errors;
	export type Path = Instance.Path;
	export type Value = Instance.Value;

	export type ValueProps = {
		path: Path;
		children: (value: Instance.Value) => ReactNode;
	};

	export type SubmitProps = {
		children: (value: Instance.Value) => ReactNode;
	};
}

const Form = ({
	as = 'form',
	className,
	children,
	form: propForm,
	implicit = false,
	locked = false,
	onChange,
	onSubmit,
	ref,
	value: propValue,
	...rest
}: Form.Props) => {
	const form = useRef(
		(() => {
			if (propForm && !isUndefined(propValue)) {
				propForm.value = propValue;
			}

			return propForm || new Instance(propValue || {});
		})()
	);

	const formRef = useRef<HTMLElement | null>(null);
	const combinedRef = (node: HTMLElement | null) => {
		formRef.current = node;

		// forward ref
		if (ref) {
			if (isFunction(ref)) {
				ref(node);
			} else {
				ref.current = node;
			}
		}
	};

	const [state, setState] = useState({
		contextValue: {
			form: form.current,
			locked,
			submit: (e: FormEvent<HTMLFormElement> | KeyboardEvent<HTMLElement>) => {
				e.preventDefault();
			}
		},
		errors: form.current.errors,
		value: form.current.value
	});

	// Update context when locked prop changes
	useEffect(() => {
		setState(prevState => ({
			...prevState,
			contextValue: {
				...prevState.contextValue,
				locked
			}
		}));
	}, [locked]);

	// Form change handler
	const handleChange = useCallback(
		(
			{
				errors,
				value
			}: {
				errors: Instance.Errors;
				value: Instance.Value;
			},
			silent = false
		) => {
			// force context consumers to update
			setState(prevState => ({
				contextValue: {
					...prevState.contextValue
				},
				errors,
				value
			}));

			if (!silent && isFunction(onChange)) {
				onChange({
					errors,
					errorsCount: form.current.errorsCount(),
					form: form.current,
					requiredErrorsCount: form.current.requiredErrorsCount(),
					value
				});
			}
		},
		[onChange]
	);

	// Subscribe to form changes
	useEffect(() => {
		const unsubscribe = form.current.onChange(handleChange);

		// Cleanup subscription on unmount
		return () => {
			if (isFunction(unsubscribe)) {
				unsubscribe();
			}
		};
	}, [handleChange]);

	// Handle form submission
	const handleSubmit = useCallback(
		(e: FormEvent<HTMLFormElement> | KeyboardEvent<HTMLElement>) => {
			if (e && isFunction(e.preventDefault)) {
				e.preventDefault();
			}

			if (isFunction(onSubmit)) {
				form.current.requestImmediateValue();
				form.current.lastSubmit = now();

				onSubmit({
					errors: form.current.errors,
					errorsCount: form.current.errorsCount(),
					form: form.current,
					requiredErrorsCount: form.current.requiredErrorsCount(),
					value: form.current.value
				});
			}
		},
		[onSubmit]
	);

	// Update context when submit handler changes
	useEffect(() => {
		setState(state => {
			return {
				...state,
				contextValue: {
					...state.contextValue,
					submit: handleSubmit
				}
			};
		});
	}, [handleSubmit]);

	// Listen for custom form:submit event
	useEffect(() => {
		const onCustomSubmit = (e: CustomEvent) => {
			handleSubmit(e as unknown as FormEvent<HTMLFormElement>);
		};

		if (formRef.current) {
			formRef.current.addEventListener('form:submit', onCustomSubmit as EventListener);
		}

		return () => {
			if (formRef.current) {
				formRef.current.removeEventListener('form:submit', onCustomSubmit as EventListener);
			}
		};
	}, [handleSubmit]);

	// Handle emulated submit (Enter key in input)
	const handleEmulateSubmit = useCallback(
		(e: KeyboardEvent<HTMLElement>) => {
			const enter = e.key === 'Enter';
			const target = e.target as EventTarget & { nodeName?: string };

			if (enter && target.nodeName === 'INPUT') {
				handleSubmit(e);
			}
		},
		[handleSubmit]
	);

	const formChildren = util.renderChildren(children, null, {
		errorsCount: form.current.errorsCount(),
		form: form.current,
		requiredErrorsCount: form.current.requiredErrorsCount(),
		submit: handleSubmit,
		value: form.current.value
	});

	if (implicit) {
		return <context.Provider value={state.contextValue}>{formChildren}</context.Provider>;
	}

	const formProps: any = {
		className: clsx('form', className),
		ref: combinedRef,
		...rest
	};

	if (as === 'form') {
		formProps.onSubmit = handleSubmit;
	} else {
		formProps.onKeyDown = handleEmulateSubmit;
	}

	return <context.Provider value={state.contextValue}>{createElement(as, formProps, formChildren)}</context.Provider>;
};

const dispatchSubmit = (element: HTMLElement | null) => {
	if (!element) {
		console.warn('Form.dispatchSubmit: No element provided');
		return;
	}

	const customSubmitEvent = new CustomEvent('form:submit', {
		bubbles: true,
		cancelable: true,
		detail: { element }
	});

	element.dispatchEvent(customSubmitEvent);
};

const Submit = ({ children }: Form.SubmitProps) => {
	const { form, submit } = useContext(context);

	if (!form) {
		throw new Error('"Form.Submit" must be used within a "Form" component.');
	}

	if (!isFunction(children)) {
		throw new Error('"Form.Submit" requires a render function as children.');
	}

	return <>{children({ submit })}</>;
};

const Value = ({ path, children }: Form.ValueProps) => {
	const { form } = useContext(context);

	if (!form) {
		throw new Error('"Form.Value" must be used within a "Form" component.');
	}

	if (!isFunction(children)) {
		throw new Error('"Form.Value" requires a render function as children.');
	}

	const value = form.get(path);

	return <>{children(value)}</>;
};

// Static properties
Form.dispatchSubmit = dispatchSubmit;
Form.Instance = Instance;
Form.Item = Item;
Form.List = List;
Form.Submit = Submit;
Form.useForm = useForm;
Form.Value = Value;

export default Form;
