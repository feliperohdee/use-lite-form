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

		expect(result.current.canRedo).toEqual(false);
		expect(result.current.canUndo).toEqual(false);
	});

	it('should track form changes and enable undo', async () => {
		const instance = new Instance({ name: '', email: '' });
		const wrapper = createFormWrapper(instance);

		const { result } = renderHook(
			() => {
				return useFormHistory({ maxCapacity: 5 });
			},
			{ wrapper }
		);

		expect(result.current.canRedo).toEqual(false);
		expect(result.current.canUndo).toEqual(false);

		act(() => {
			instance.set(['name'], 'John Doe');
		});

		await waitFor(() => {
			expect(result.current.canRedo).toEqual(false);
			expect(result.current.canUndo).toEqual(true);
		});
	});

	it('should allow undo and redo operations', async () => {
		const instance = new Instance({ name: '', email: '' });
		const wrapper = createFormWrapper(instance);

		const { result } = renderHook(
			() => {
				return useFormHistory({ maxCapacity: 5 });
			},
			{ wrapper }
		);

		act(() => {
			instance.set(['name'], 'John Doe');
			instance.set(['email'], 'john@example.com');
		});

		await waitFor(() => {
			expect(result.current.canRedo).toEqual(false);
			expect(result.current.canUndo).toEqual(true);

			expect(instance.get(['name'])).toEqual('John Doe');
			expect(instance.get(['email'])).toEqual('john@example.com');
		});

		// Undo one change
		act(() => {
			result.current.undo();
		});

		await waitFor(() => {
			expect(result.current.canRedo).toEqual(true);
			expect(result.current.canUndo).toEqual(false);

			expect(instance.get(['name'])).toEqual('');
			expect(instance.get(['email'])).toEqual('');
		});

		// Redo
		act(() => {
			result.current.redo();
		});

		await waitFor(() => {
			expect(result.current.canRedo).toEqual(false);
			expect(result.current.canUndo).toEqual(true);

			expect(instance.get(['name'])).toEqual('John Doe');
			expect(instance.get(['email'])).toEqual('john@example.com');
		});
	});

	it('should clear', async () => {
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

		await waitFor(() => {
			expect(result.current.canRedo).toEqual(false);
			expect(result.current.canUndo).toEqual(true);
		});

		// Clear history
		act(() => {
			result.current.clear();
		});

		await waitFor(() => {
			expect(result.current.canRedo).toEqual(false);
			expect(result.current.canUndo).toEqual(false);
		});
	});
});
