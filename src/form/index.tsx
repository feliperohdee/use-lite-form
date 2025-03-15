import clsx from 'clsx';
import isFunction from 'lodash/isFunction';
import isUndefined from 'lodash/isUndefined';
import {
	createElement,
	ElementType,
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
		onChange?: (value: Instance.Value, errors: Instance.Errors) => void;
		onSubmit?: (payload: SubmitPayload) => void;
		value?: Instance.Value;
	}

	export type Error = Instance.Error;
	export type Errors = Instance.Errors;
	export type Path = Instance.Path;
	export type Value = Instance.Value;

	export interface ValueProps {
		path: Path;
		children: (value: Instance.Value) => ReactNode;
	}
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
	value: propValue,
	...rest
}: Form.Props) => {
	const formInstance = useRef(
		(() => {
			if (propForm && !isUndefined(propValue)) {
				propForm.value = propValue;
			}

			return propForm || new Instance(propValue || {});
		})()
	);

	const [state, setState] = useState({
		contextValue: {
			form: formInstance.current,
			locked
		},
		errors: formInstance.current.errors,
		value: formInstance.current.value
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
				onChange(value, errors);
			}
		},
		[onChange]
	);

	// Subscribe to form changes
	useEffect(() => {
		const unsubscribe = formInstance.current.onChange(handleChange);

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
				formInstance.current.requestImmediateValue();

				onSubmit({
					errors: formInstance.current.errors,
					errorsCount: formInstance.current.errorsCount(),
					form: formInstance.current,
					requiredErrorsCount: formInstance.current.requiredErrorsCount(),
					value: formInstance.current.value
				});
			}
		},
		[onSubmit]
	);

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
		errorsCount: formInstance.current.errorsCount(),
		form: formInstance.current,
		requiredErrorsCount: formInstance.current.requiredErrorsCount(),
		submit: handleSubmit,
		value: formInstance.current.value
	});

	if (implicit) {
		return <context.Provider value={state.contextValue}>{formChildren}</context.Provider>;
	}

	const formProps: any = {
		className: clsx('form', className),
		...rest
	};

	if (as === 'form') {
		formProps.onSubmit = handleSubmit;
	} else {
		formProps.onKeyDown = handleEmulateSubmit;
	}

	return <context.Provider value={state.contextValue}>{createElement(as, formProps, formChildren)}</context.Provider>;
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
Form.Instance = Instance;
Form.Item = Item;
Form.List = List;
Form.useForm = useForm;
Form.Value = Value;

export default Form;
