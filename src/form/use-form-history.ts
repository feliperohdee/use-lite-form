import { useContext, useEffect } from 'react';

import FormContext from '@/form/context';
import useHistoryState, { DebounceSettings } from 'use-good-hooks/use-history-state';

type UseFormHistoryOptions = {
	maxCapacity?: number;
	debounceMs?: number;
	debounceSettings?: DebounceSettings;
};

const useFormHistory = (options: UseFormHistoryOptions = {}) => {
	const { debounceSettings, debounceMs, maxCapacity = 10 } = options;
	const { instance } = useContext(FormContext);

	if (!instance) {
		throw new Error('"useFormHistory" must be wrapped by a "Form".');
	}

	const [historyState, historyActions] = useHistoryState(instance.value, {
		debounceSettings,
		debounceMs,
		maxCapacity,
		onChange: ({ action, state }) => {
			if (action === 'CLEAR' || action === 'REDO' || action === 'UNDO') {
				instance.replace(state, true);
			}
		}
	});

	useEffect(() => {
		const unsubscribe = instance.onChange((payload, { silent }) => {
			if (payload.changed && !silent) {
				historyActions.set(payload.value);
			}
		});

		return () => {
			return unsubscribe();
		};
	}, [instance, historyActions]);

	return [historyState, historyActions] as const;
};

export default useFormHistory;
