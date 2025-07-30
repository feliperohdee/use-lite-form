import { useContext, useEffect } from 'react';

import FormContext from '@/form/context';
import useHistoryState, { DebounceSettings } from 'use-good-hooks/use-history-state';

type UseFormHistoryOptions = {
	maxCapacity?: number;
	debounceSettings?: DebounceSettings;
	debounceTime?: number;
};

const useFormHistory = (options: UseFormHistoryOptions = {}) => {
	const { debounceSettings, debounceTime, maxCapacity = 10 } = options;
	const { instance } = useContext(FormContext);

	if (!instance) {
		throw new Error('"useFormHistory" must be wrapped by a "Form".');
	}

	const { canRedo, canUndo, clear, redo, set, undo } = useHistoryState(instance.value, {
		debounceSettings,
		debounceTime,
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
				set(payload.value);
			}
		});

		return () => {
			return unsubscribe();
		};
	}, [instance, set]);

	return {
		canRedo,
		canUndo,
		clear,
		redo,
		undo
	};
};

export default useFormHistory;
