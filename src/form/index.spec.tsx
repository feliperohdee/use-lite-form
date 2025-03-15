import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import Form from '@/form';

const wait = (ms: number) => {
	return new Promise(resolve => setTimeout(resolve, ms));
};

describe('/form', () => {
	it('should render without crashing', () => {
		render(
			<Form>
				<div>Test Form</div>
			</Form>
		);

		expect(screen.getByText('Test Form')).toBeTruthy();
	});

	it('should handle basic form submission', () => {
		const onSubmit = vi.fn();
		const value = { name: 'Felipe Rohde' };

		render(
			<Form
				onSubmit={onSubmit}
				value={value}
			>
				<Form.Item path={['name']}>
					<input type='text' />
				</Form.Item>

				<button
					data-testid='submit'
					type='submit'
				>
					Submit
				</button>
			</Form>
		);

		fireEvent.click(screen.getByTestId('submit'));

		expect(onSubmit).toHaveBeenCalledWith({
			errors: {},
			errorsCount: 0,
			form: expect.any(Form.Instance),
			requiredErrorsCount: 0,
			value: { name: 'Felipe Rohde' }
		});
	});

	it('should validate required fields', () => {
		const onSubmit = vi.fn();

		render(
			<Form onSubmit={onSubmit}>
				<Form.Item
					path={['name']}
					required
				>
					<input type='text' />
				</Form.Item>

				<button
					data-testid='submit'
					type='submit'
				>
					Submit
				</button>
			</Form>
		);

		fireEvent.click(screen.getByTestId('submit'));

		expect(onSubmit).toHaveBeenCalledWith({
			errors: { name: 'Required Field.' },
			errorsCount: 1,
			form: expect.any(Form.Instance),
			requiredErrorsCount: 1,
			value: { name: '' }
		});
	});

	it('should validate custom required function', () => {
		const onSubmit = vi.fn();
		const customRequired = ({ value }: { value: Form.Value }) => {
			return value.length < 3 ? 'Name must be at least 3 characters' : false;
		};

		render(
			<Form onSubmit={onSubmit}>
				<Form.Item
					path={['name']}
					required={customRequired}
				>
					<input
						data-testid='text'
						type='text'
					/>
				</Form.Item>

				<button
					data-testid='submit'
					type='submit'
				>
					Submit
				</button>
			</Form>
		);

		fireEvent.change(screen.getByTestId('text'), { target: { value: 'ab' } });
		fireEvent.click(screen.getByTestId('submit'));

		expect(onSubmit).toHaveBeenCalledWith({
			errors: { name: 'Name must be at least 3 characters' },
			errorsCount: 1,
			form: expect.any(Form.Instance),
			requiredErrorsCount: 1,
			value: { name: 'ab' }
		});
	});

	it('should clear errors when field becomes valid', () => {
		const onSubmit = vi.fn();

		render(
			<Form onSubmit={onSubmit}>
				<Form.Item
					path={['name']}
					required
				>
					<input
						data-testid='text'
						type='text'
					/>
				</Form.Item>

				<button
					data-testid='submit'
					type='submit'
				>
					Submit
				</button>
			</Form>
		);

		fireEvent.click(screen.getByTestId('submit'));
		expect(onSubmit).toHaveBeenCalledWith({
			errors: { name: 'Required Field.' },
			errorsCount: 1,
			form: expect.any(Form.Instance),
			requiredErrorsCount: 1,
			value: { name: '' }
		});

		fireEvent.change(screen.getByTestId('text'), {
			target: { value: 'Felipe Rohde' }
		});

		fireEvent.click(screen.getByTestId('submit'));

		expect(onSubmit).toHaveBeenCalledWith({
			errors: {},
			errorsCount: 0,
			form: expect.any(Form.Instance),
			requiredErrorsCount: 0,
			value: { name: 'Felipe Rohde' }
		});
	});

	describe('Form.List', () => {
		it('should handle adding and removing items', async () => {
			const onSubmit = vi.fn();

			render(
				<Form onSubmit={onSubmit}>
					<Form.List path={['items']}>
						<Form.List.Items>
							{props => {
								return (
									<div>
										<Form.Item path={[...props.path, 'name']}>
											<input
												data-testid='text'
												type='text'
											/>
										</Form.Item>

										<button
											data-testid={`delete-${props.index}`}
											onClick={e => {
												e.preventDefault();
												return props.delete();
											}}
										>
											Delete
										</button>
									</div>
								);
							}}
						</Form.List.Items>

						<Form.List.Add>
							{props => {
								return (
									<button
										data-testid='add'
										onClick={e => {
											e.preventDefault();
											return props.add({ name: '' });
										}}
									>
										Add Item
									</button>
								);
							}}
						</Form.List.Add>
					</Form.List>

					<button
						data-testid='submit'
						type='submit'
					>
						Submit
					</button>
				</Form>
			);

			fireEvent.click(screen.getByTestId('add'));
			fireEvent.click(screen.getByTestId('add'));
			fireEvent.click(screen.getByTestId('add'));
			await wait(20);

			expect(screen.getAllByTestId('text')).toHaveLength(3);
			fireEvent.click(screen.getByTestId('delete-0'));
			await wait(20);
			expect(screen.getAllByTestId('text')).toHaveLength(2);

			fireEvent.click(screen.getByTestId('submit'));
			expect(onSubmit).toHaveBeenCalledWith({
				errors: {},
				errorsCount: 0,
				form: expect.any(Form.Instance),
				requiredErrorsCount: 0,
				value: {
					items: [{ name: '' }, { name: '' }]
				}
			});
		});
	});

	describe('Form.Value', () => {
		it('should render the value at the specified path', () => {
			const initialValue = {
				user: {
					name: 'John Doe',
					email: 'john@example.com'
				}
			};

			render(
				<Form value={initialValue}>
					<Form.Value path={['user', 'name']}>{value => <div data-testid='name-value'>{value}</div>}</Form.Value>
				</Form>
			);

			expect(screen.getByTestId('name-value').textContent).toBe('John Doe');
		});

		it('should update when the form value changes', async () => {
			const initialValue = {
				user: {
					name: 'John Doe',
					email: 'john@example.com'
				}
			};

			render(
				<Form value={initialValue}>
					<Form.Item
						debounce={0}
						path={['user', 'name']}
					>
						{({ value, onChange }) => (
							<input
								data-testid='name-input'
								value={value}
								onChange={e => {
									onChange(e.target.value);
								}}
							/>
						)}
					</Form.Item>
					<Form.Value path={['user', 'name']}>
						{value => {
							return <div data-testid='name-display'>{value}</div>;
						}}
					</Form.Value>
				</Form>
			);

			// Initial value check
			expect(screen.getByTestId('name-display').textContent).toBe('John Doe');

			// Change the input value
			fireEvent.change(screen.getByTestId('name-input'), {
				target: { value: 'Jane Smith' }
			});

			await wait(50);

			// Check if the display is updated
			expect(screen.getByTestId('name-display').textContent).toBe('Jane Smith');
		});

		it('should work with nested Form.Value components', () => {
			const initialValue = {
				user: {
					name: 'John Doe',
					address: {
						city: 'New York',
						country: 'USA'
					}
				}
			};

			render(
				<Form value={initialValue}>
					<Form.Value path={['user']}>
						{user => (
							<div>
								<div data-testid='user-name'>{user.name}</div>
								<Form.Value path={['user', 'address']}>
									{address => (
										<div>
											<div data-testid='user-city'>{address.city}</div>
											<div data-testid='user-country'>{address.country}</div>
										</div>
									)}
								</Form.Value>
							</div>
						)}
					</Form.Value>
				</Form>
			);

			expect(screen.getByTestId('user-name').textContent).toBe('John Doe');
			expect(screen.getByTestId('user-city').textContent).toBe('New York');
			expect(screen.getByTestId('user-country').textContent).toBe('USA');
		});

		it('should throw an error when used outside of a Form', () => {
			// Suppress console.error for this test
			const originalConsoleError = console.error;
			console.error = vi.fn();

			expect(() => {
				render(<Form.Value path={['user', 'name']}>{value => <div>{value}</div>}</Form.Value>);
			}).toThrow('"Form.Value" must be used within a "Form" component.');

			// Restore console.error
			console.error = originalConsoleError;
		});

		it('should throw an error when children is not a function', () => {
			// Suppress console.error for this test
			const originalConsoleError = console.error;
			console.error = vi.fn();

			expect(() => {
				render(
					<Form value={{}}>
						<Form.Value path={['user', 'name']}>
							{/* @ts-ignore - Testing invalid children */}
							<div>Not a function</div>
						</Form.Value>
					</Form>
				);
			}).toThrow('"Form.Value" requires a render function as children.');

			// Restore console.error
			console.error = originalConsoleError;
		});
	});
});
