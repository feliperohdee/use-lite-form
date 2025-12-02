import { act, renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { describe, it, expect } from 'vitest';

import Form from '@/form';
import Instance from '@/form/instance';
import useFormHistory from '@/form/use-form-history';

// Mock form context provider for testing
const createFormWrapper = (instance: Instance) => {
	return ({ children }: { children: ReactNode }) => (
		<Form
			instance={instance}
			implicit
		>
			{children}
		</Form>
	);
};

describe('useFormHistory', () => {
	it('should be defined', () => {
		expect(useFormHistory).toBeDefined();
	});

	it('should initialize with no history actions available', () => {
		const instance = new Instance({ name: '', email: '' });
		const wrapper = createFormWrapper(instance);

		const { result } = renderHook(() => useFormHistory(), { wrapper });

		const [historyState] = result.current;
		expect(historyState.canRedo).toEqual(false);
		expect(historyState.canUndo).toEqual(false);
	});

	it.only('should track form changes and enable undo', async () => {
		const instance = new Instance({ name: '', email: '' });
		const wrapper = createFormWrapper(instance);

		const { result } = renderHook(
			() => {
				return useFormHistory({ maxCapacity: 5 });
			},
			{ wrapper }
		);

		let [historyState] = result.current;
		expect(historyState.canRedo).toEqual(false);
		expect(historyState.canUndo).toEqual(false);

		act(() => {
			instance.set(['name'], 'John Doe');
		});

		await waitFor(() => {
			[historyState] = result.current;
			expect(historyState.canRedo).toEqual(false);
			expect(historyState.canUndo).toEqual(true);
		});
	});

	it('should allow undo and redo operations', async () => {
		const instance = new Instance({ name: '', email: '' });
		const wrapper = createFormWrapper(instance);

		const { result } = renderHook(
			() => {
				return useFormHistory({ maxCapacity: 5, debounceMs: 0 });
			},
			{ wrapper }
		);

		act(() => {
			instance.set(['name'], 'John Doe');
			instance.set(['email'], 'john@example.com');
		});

		let [historyState, historyActions] = result.current;
		await waitFor(() => {
			[historyState] = result.current;
			expect(historyState.canRedo).toEqual(false);
			expect(historyState.canUndo).toEqual(true);

			expect(instance.get(['name'])).toEqual('John Doe');
			expect(instance.get(['email'])).toEqual('john@example.com');
		});

		// Undo one change
		act(() => {
			historyActions.undo();
		});

		await waitFor(() => {
			[historyState] = result.current;
			expect(historyState.canRedo).toEqual(true);
			expect(historyState.canUndo).toEqual(false);

			expect(instance.get(['name'])).toEqual('');
			expect(instance.get(['email'])).toEqual('');
		});

		// Redo
		act(() => {
			historyActions.redo();
		});

		await waitFor(() => {
			[historyState] = result.current;
			expect(historyState.canRedo).toEqual(false);
			expect(historyState.canUndo).toEqual(true);

			expect(instance.get(['name'])).toEqual('John Doe');
			expect(instance.get(['email'])).toEqual('john@example.com');
		});
	});

	it('should reset to initial state', async () => {
		const instance = new Instance({ name: '' });
		const wrapper = createFormWrapper(instance);

		const { result } = renderHook(
			() => {
				return useFormHistory({ maxCapacity: 3 });
			},
			{ wrapper }
		);

		act(() => {
			instance.set(['name'], 'John');
		});

		let [historyState, historyActions] = result.current;
		await waitFor(() => {
			[historyState] = result.current;
			expect(historyState.canRedo).toEqual(false);
			expect(historyState.canUndo).toEqual(true);
		});

		// Reset to initial state
		act(() => {
			historyActions.initial();
		});

		await waitFor(() => {
			[historyState] = result.current;
			expect(historyState.canRedo).toEqual(false);
			expect(historyState.canUndo).toEqual(false);
		});
	});
});
