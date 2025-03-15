import { describe, expect, it, vi } from 'vitest';
import { PropsWithChildren } from 'react';
import { render } from '@testing-library/react';

import util from '@/form/util';

interface TestProps extends PropsWithChildren {
	[key: string]: any;
	className?: string;
	testId?: string;
}

const Test = ({ className, testId, children, ...props }: TestProps) => {
	return (
		<div
			data-testid={testId || 'test-element'}
			className={className}
			{...props}
		>
			{children}
		</div>
	);
};

describe('/form/util', () => {
	describe('renderChildren', () => {
		it('should return null for null/undefined children', () => {
			expect(util.renderChildren(null)).toBeNull();
			expect(util.renderChildren(undefined)).toBeNull();
		});

		it('should handle element', () => {
			const mergeProps = {
				className: 'merged',
				'data-custom-prop': 'value'
			};

			const res = util.renderChildren(Test, mergeProps);
			const { getByTestId } = render(res);
			const element = getByTestId('test-element');

			expect(element).toHaveClass('merged');
			expect(element).toHaveAttribute('data-custom-prop', 'value');
		});

		it('should handle function', () => {
			const childrenFn = vi.fn();
			const mergeProps = {
				className: 'regular-props'
			};
			const mergePropsForFunction = {
				functionProp: 'special-value'
			};

			util.renderChildren(childrenFn, mergeProps, mergePropsForFunction);
			expect(childrenFn).toHaveBeenCalledWith({
				...mergeProps,
				...mergePropsForFunction
			});
		});

		it('should handle an array of elements', () => {
			const children = [
				<Test
					key='1'
					testId='child-1'
					className='child-1'
				>
					Child 1
				</Test>,
				<Test
					key='2'
					testId='child-2'
					className='child-2'
				>
					Child 2
				</Test>
			];

			const mergeProps = {
				className: 'merged',
				'data-prop': 'shared'
			};
			const res = util.renderChildren(children, mergeProps);
			const { getByTestId } = render(<div>{res}</div>);
			const element1 = getByTestId('child-1');
			const element2 = getByTestId('child-2');

			expect(element1).toHaveClass('child-1');
			expect(element1).toHaveClass('merged');
			expect(element1).toHaveAttribute('data-prop', 'shared');
			expect(element1.textContent).toBe('Child 1');

			expect(element2).toHaveClass('child-2');
			expect(element2).toHaveClass('merged');
			expect(element2).toHaveAttribute('data-prop', 'shared');
			expect(element2.textContent).toBe('Child 2');
		});

		it('should filter out null/undefined elements in an array', () => {
			const children = [
				<Test
					key='1'
					testId='child-1'
				>
					Child 1
				</Test>,
				null,
				<Test
					key='2'
					testId='child-2'
				>
					Child 2
				</Test>,
				undefined
			];

			const res = util.renderChildren(children);
			const { queryByTestId } = render(res);

			expect(queryByTestId('child-1')).toBeTruthy();
			expect(queryByTestId('child-2')).toBeTruthy();

			// Should be exactly 2 test elements (no nulls/undefined rendered)
			// @ts-expect-error
			expect(queryByTestId('child-1').parentElement.children.length).toBe(2);
		});
	});
});
