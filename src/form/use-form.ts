import { useContext } from 'react';

import FormContext from '@/form/context';
import Instance from '@/form/instance';

type UseFormResult<T = any> = {
	form: Instance;
	value: T;
};

const useForm = <T = any>(path?: Instance.Path): UseFormResult<T> => {
	const { form } = useContext(FormContext);

	if (!form) {
		throw new Error('"useForm" must be wrapped by a "Form".');
	}

	return {
		form,
		value: form.get(path, null) as T
	};
};

export default useForm;
