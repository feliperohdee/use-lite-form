import { useEffect, useRef, useState } from 'react';
import isFunction from 'lodash/isFunction';

import Instance from '@/form/instance';

const useNewForm = <T extends object = Instance.Value>(initialValue?: T): Instance.Payload<T> => {
	const formRef = useRef(new Instance<T>(initialValue));
	const [state, setState] = useState<Instance.Payload<T>>(() => {
		return formRef.current.getPayload();
	});

	useEffect(() => {
		if (!formRef.current) {
			return;
		}

		const unsubscribe = formRef.current.onChange(setState);

		// Cleanup subscription on unmount
		return () => {
			if (isFunction(unsubscribe)) {
				unsubscribe();
			}
		};
	}, []);

	return state;
};

export default useNewForm;
