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
	useMemo,
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
		onErrorChange?: (payload: Instance.Payload, action: Instance.Action) => void;
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
	onErrorChange,
	onInit,
	onSubmit,
	ref,
	submitOnEnter = false,
	value,
	...rest
}: Form.Props) => {
	const onChangeRef = useRef<Form.Props['onChange']>(onChange);
	const onErrorChangeRef = useRef<Form.Props['onErrorChange']>(onErrorChange);
	const onInitRef = useRef<Form.Props['onInit']>(onInit);
	const onSubmitRef = useRef<Form.Props['onSubmit']>(onSubmit);
	const instanceRef = useRef<Instance>(null!);
	const [state, setState] = useState({
		changes: 0,
		errors: 0
	});

	if (!instanceRef.current) {
		instanceRef.current = instance || new Instance(value || {});

		if (instanceRef.current && !isUndefined(value)) {
			instanceRef.current.value = value;
		}
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

	const submit = useCallback((e: FormEvent<HTMLFormElement> | KeyboardEvent<HTMLElement>) => {
		if (e && isFunction(e.preventDefault)) {
			e.preventDefault();
		}

		if (isFunction(onSubmitRef.current)) {
			instanceRef.current.requestImmediateValue();
			instanceRef.current.lastSubmit = now();

			onSubmitRef.current(instanceRef.current.getPayload());
		}
	}, []);

	const emulateSubmit = useCallback(
		(e: KeyboardEvent<HTMLElement>) => {
			const enter = e.key === 'Enter';
			const target = e.target as EventTarget & { nodeName?: string };

			if (enter && target.nodeName === 'INPUT') {
				submit(e);
			}
		},
		[submit]
	);

	const contextValue = useMemo(() => {
		return {
			...state,
			instance: instanceRef.current,
			locked,
			submit
		};
	}, [state, locked, submit]);

	// Listen to form changes
	useEffect(() => {
		const unsubscribe = instanceRef.current.onChange((payload, action) => {
			// force context consumers to update
			setState(state => {
				return {
					...state,
					changes: state.changes + 1
				};
			});

			if (isFunction(onChangeRef.current)) {
				onChangeRef.current(payload, action);
			}
		});

		// Cleanup subscription on unmount
		return () => {
			unsubscribe?.();
		};
	}, []);

	// Listen to form errors changes
	useEffect(() => {
		const unsubscribe = instanceRef.current.onErrorChange((payload, action) => {
			// force context consumers to update
			setState(state => {
				return {
					...state,
					errors: state.errors + 1
				};
			});

			if (isFunction(onErrorChangeRef.current)) {
				onErrorChangeRef.current?.(payload, action);
			}
		});

		return () => {
			unsubscribe?.();
		};
	}, []);

	// Listen for custom form:submit event
	useEffect(() => {
		if (init.current.listeningCustomEvent) {
			return;
		}
		init.current.listeningCustomEvent = true;

		const onCustomSubmit = (e: CustomEvent) => {
			submit(e as unknown as FormEvent<HTMLFormElement>);
		};

		if (formRef.current) {
			formRef.current.addEventListener('form:submit', onCustomSubmit as EventListener);
		}

		return () => {
			if (formRef.current) {
				formRef.current.removeEventListener('form:submit', onCustomSubmit as EventListener);
			}
		};
	}, [submit]);

	useEffect(() => {
		if (isFunction(onInitRef.current)) {
			onInitRef.current(instanceRef.current.getPayload());
		}
	}, []);

	useEffect(() => {
		onChangeRef.current = onChange;
	}, [onChange]);

	useEffect(() => {
		onErrorChangeRef.current = onErrorChange;
	}, [onErrorChange]);

	useEffect(() => {
		onSubmitRef.current = onSubmit;
	}, [onSubmit]);

	const formChildren = util.renderChildren(children, null, {
		...instanceRef.current.getPayload(),
		submit
	});

	if (implicit) {
		return <context.Provider value={contextValue}>{formChildren}</context.Provider>;
	}

	const formProps: any = {
		className: clsx('form', className),
		ref: combinedRef,
		...rest
	};

	if (as === 'form') {
		formProps.onSubmit = submit;
	} else if (submitOnEnter) {
		formProps.onKeyDown = emulateSubmit;
	}

	return <context.Provider value={contextValue}>{createElement(as, formProps, formChildren)}</context.Provider>;
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
