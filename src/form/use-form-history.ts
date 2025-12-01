import { useContext, useEffect } from 'react';

import FormContext from '@/form/context';
import useHistoryState, { DebounceSettings } from 'use-good-hooks/use-history-state';

type UseFormHistoryOptions = {
	maxCapacity?: number;
	debounceMs?: number;
	debounceSettings?: DebounceSettings;
};

const useFormHistory = (options: UseFormHistoryOptions = {}) => {
	const { debounceMs, debounceSettings, maxCapacity } = options;
	const { instance } = useContext(FormContext);

	if (!instance) {
		throw new Error('"useFormHistory" must be wrapped by a "Form".');
	}

	const [historyState, historyActions] = useHistoryState(instance.value, {
		debounceMs,
		debounceSettings,
		maxCapacity,
		onChange: ({ action, state }) => {
			if (action === 'INITIAL') {
				instance.clear();
			} else if (action === 'REDO' || action === 'UNDO') {
				instance.historyAction(action, state);
			}
		}
	});

	useEffect(() => {
		const unsubscribe = instance.onChange((payload, { action }) => {
			if (action === 'HISTORY_REPLACE') {
				historyActions.replace(payload.value);
			}

			if (!action.startsWith('HISTORY_')) {
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
