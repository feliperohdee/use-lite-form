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
			if (action === 'REDO' || action === 'UNDO') {
				instance.historyAction(action, state);
			}
		}
	});

	// subscribe to form changes and commit them to the history
	useEffect(() => {
		const unsubscribe = instance.onChange((payload, action) => {
			if (action === 'HISTORY_REPLACE') {
				// form was replaced using "HISTORY_REPLACE" and we need to replace the history state too
				// we could call form.replace, trigering "REPLACE" event, but it would always replace history, and maybe this is not user intent
				// se we have a custom action to replace the history
				historyActions.replace(payload.value);
			} else if (!action.startsWith('HISTORY_')) {
				// Just commit changes to the history if they are not history-related
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
