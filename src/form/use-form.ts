import { useContext } from 'react';

import FormContext from '@/form/context';
import Instance from '@/form/instance';

type UseForm = {
	<T extends object = any>(): Instance.Payload<T>;
	<V = any, T extends object = any>(path: Instance.Path): Instance.Payload<T, V>;
};

const useForm: UseForm = <V = Instance.Nil, T extends object = Instance.Value>(path?: Instance.Path): Instance.Payload<T, V> => {
	const { instance } = useContext(FormContext);

	if (!instance) {
		throw new Error('"useForm" must be wrapped by a "Form".');
	}

	return {
		...instance.getPayload(),
		value: instance.get(path, null)
	};
};

export default useForm;
