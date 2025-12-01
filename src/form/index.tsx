import clsx from 'clsx';
import isFunction from 'lodash/isFunction';
import isUndefined from 'lodash/isUndefined';
import now from 'lodash/now';
import {
	createElement,
	ElementType,
	FormEvent,
	ForwardedRef,
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
import useFormHistory from '@/form/use-form-history';
import useNewForm from '@/form/use-new-form';
import util from '@/form/util';

namespace Form {
	export interface Props extends Omit<PropsWithChildren<HTMLAttributes<HTMLElement>>, 'onChange' | 'onSubmit'> {
		as?: ElementType;
		children: ReactNode;
		className?: string;
		instance?: Instance;
		implicit?: boolean;
		locked?: boolean;
		onChange?: (payload: Instance.Payload, action: Instance.Action) => void;
		onInit?: (payload: Instance.Payload) => void;
		onSubmit?: (payload: Instance.Payload) => void;
		submitOnEnter?: boolean;
		ref?: ForwardedRef<HTMLElement>;
		value?: Instance.Value;
	}

	export type Error = Instance.Error;
	export type Errors = Instance.Errors;
	export type InstanceAction = Instance.Action;
	export type InstanceType<T extends object = Instance.Value> = Instance<T>;
	export type Path = Instance.Path;
	export type Payload<T extends object = Instance.Value> = Instance.Payload<T>;
	export type Value = Instance.Value;
	export type ValueProps = {
		path: Path;
		children: (value: { value: Instance.Value }) => ReactNode;
	};

	export type ItemFunctionProps<T extends object = Instance.Value> = Item.ItemFunctionProps<T>;
	export type ItemFunction<T extends object = Instance.Value> = Item.ItemFunction<T>;
	export type ListItemFunctionProps<T extends object = Instance.Value> = List.ItemFunctionProps<T>;
	export type ListItemFunction<T extends object = Instance.Value> = List.ItemFunction<T>;

	export type SubmitProps = {
		children: (props: { submit: (value: Instance.Value) => void }) => ReactNode;
	};
}

const Form = ({
	as = 'form',
	className,
	children,
	instance,
	implicit = false,
	locked = false,
	onChange,
	onInit,
	onSubmit,
	ref,
	submitOnEnter = false,
	value: propValue,
	...rest
}: Form.Props) => {
	const instanceRef = useRef<Instance>(null!);

	if (!instanceRef.current) {
		const initialInstance = instance || new Instance(propValue || {});

		if (instance && !isUndefined(propValue)) {
			instance.value = propValue;
		}

		instanceRef.current = initialInstance;
	}

	const formRef = useRef<HTMLElement | null>(null);
	const init = useRef({ listeningCustomEvent: false });
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

	const [contextState, setContextState] = useState({
		instance: instanceRef.current,
		locked,
		submit: (e: FormEvent<HTMLFormElement> | KeyboardEvent<HTMLElement>) => {
			e.preventDefault();
		}
	});

	// Update context when locked prop changes
	useEffect(() => {
		setContextState(state => {
			return {
				...state,
				locked
			};
		});
	}, [locked]);

	// Form change handler
	const handleChange = useCallback(
		(
			payload: Instance.Payload,
			options: {
				action: Instance.Action;
				silent: boolean;
			}
		) => {
			// force context consumers to update
			setContextState(state => {
				return {
					...state
				};
			});

			if (!options.silent && isFunction(onChange)) {
				onChange(payload, options.action);
			}
		},
		[onChange]
	);

	// Subscribe to form changes
	useEffect(() => {
		const unsubscribe = instanceRef.current.onChange(handleChange);

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
				instanceRef.current.requestImmediateValue();
				instanceRef.current.lastSubmit = now();

				onSubmit(instanceRef.current.getPayload());
			}
		},
		[onSubmit]
	);

	// Update context when submit handler changes
	useEffect(() => {
		setContextState(state => {
			return {
				...state,
				submit: handleSubmit
			};
		});
	}, [handleSubmit]);

	// Listen for custom form:submit event
	useEffect(() => {
		if (init.current.listeningCustomEvent) {
			return;
		}
		init.current.listeningCustomEvent = true;

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

	// Handle form init
	useEffect(() => {
		if (isFunction(onInit)) {
			onInit(instanceRef.current.getPayload());
		}
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

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
		...instanceRef.current.getPayload(),
		submit: handleSubmit
	});

	if (implicit) {
		return <context.Provider value={contextState}>{formChildren}</context.Provider>;
	}

	const formProps: any = {
		className: clsx('form', className),
		ref: combinedRef,
		...rest
	};

	if (as === 'form') {
		formProps.onSubmit = handleSubmit;
	} else if (submitOnEnter) {
		formProps.onKeyDown = handleEmulateSubmit;
	}

	return <context.Provider value={contextState}>{createElement(as, formProps, formChildren)}</context.Provider>;
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
	const { instance, submit } = useContext(context);

	if (!instance) {
		throw new Error('"Form.Submit" must be used within a "Form" component.');
	}

	if (!isFunction(children)) {
		throw new Error('"Form.Submit" requires a render function as children.');
	}

	return <>{children({ submit })}</>;
};

const Value = ({ path, children }: Form.ValueProps) => {
	const { instance } = useContext(context);

	if (!instance) {
		throw new Error('"Form.Value" must be used within a "Form" component.');
	}

	if (!isFunction(children)) {
		throw new Error('"Form.Value" requires a render function as children.');
	}

	const value = instance.get(path);

	return <>{children({ value })}</>;
};

// Static properties
Form.dispatchSubmit = dispatchSubmit;
Form.Instance = Instance;
Form.Item = Item;
Form.List = List;
Form.Submit = Submit;
Form.useForm = useForm;
Form.useFormHistory = useFormHistory;
Form.useNewForm = useNewForm;
Form.Value = Value;

export default Form;
