import { useContext } from 'react';

import FormContext from '@/form/context';
import Instance from '@/form/instance';

type UseForm = {
	<T extends object = any>(): Instance.Payload<T>;
	<V = any, T extends object = any>(path: Instance.Path): Instance.Payload<T, V>;
};

const useForm: UseForm = <V = Instance.Nil, T extends object = Instance.Value>(path?: Instance.Path): Instance.Payload<T, V> => {
	const { form } = useContext(FormContext);

	if (!form) {
		throw new Error('"useForm" must be wrapped by a "Form".');
	}

	return {
		...form.getPayload(),
		value: form.get(path, null)
	};
};

export default useForm;
