import { createRef } from 'react';
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

	it('should handle basic form init', () => {
		const onInit = vi.fn();

		render(
			<Form
				onInit={onInit}
				value={{ name: 'Felipe Rohde' }}
			>
				<Form.Item path={['name']}>
					<input type='text' />
				</Form.Item>
			</Form>
		);

		expect(onInit).toHaveBeenCalledWith({
			errors: {},
			errorsCount: 0,
			form: expect.any(Form.Instance),
			requiredErrorsCount: 0,
			value: {
				name: 'Felipe Rohde'
			}
		});
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

	it('should handle basic form submission with Form.Submit', () => {
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

				<Form.Submit>
					{({ submit }) => {
						return (
							<div
								data-testid='submit'
								onClick={submit}
							>
								Submit
							</div>
						);
					}}
				</Form.Submit>
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

	it('should handle basic form submission with Form.dispatchSubmit', () => {
		const onSubmit = vi.fn();
		const value = { name: 'Felipe Rohde' };
		const formRef = createRef<HTMLElement>();

		render(
			<Form
				as='div'
				onSubmit={onSubmit}
				ref={formRef}
				value={value}
			>
				<Form.Item path={['name']}>
					<input type='text' />
				</Form.Item>
			</Form>
		);

		Form.dispatchSubmit(formRef.current);

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
											data-testid={`remove-${props.index}`}
											onClick={e => {
												e.preventDefault();
												return props.remove();
											}}
										>
											Remove
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
			fireEvent.click(screen.getByTestId('remove-0'));
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

	describe('Form.Item transformations and effects', () => {
		it('should apply transformIn when getting value from form', async () => {
			const initialValue = { age: '25' };
			const transformIn = vi.fn(({ value }) => parseInt(value, 10));

			render(
				<Form value={initialValue}>
					<Form.Item
						path={['age']}
						transformIn={transformIn}
					>
						{({ value }) => <div data-testid='age-value'>{value}</div>}
					</Form.Item>
				</Form>
			);

			expect(transformIn).toHaveBeenCalledWith({
				form: expect.any(Form.Instance),
				prevValue: '25',
				value: '25',
				path: ['age']
			});
			expect(screen.getByTestId('age-value').textContent).toBe('25');
			expect(typeof screen.getByTestId('age-value').textContent).toBe('string');
		});

		it('should apply transformOut when setting value to form', async () => {
			const transformOut = vi.fn(({ value }) => value.toString());
			const onChange = vi.fn();
			const form = new Form.Instance();

			form.onChange = onChange;

			render(
				<Form form={form}>
					<Form.Item
						path={['age']}
						transformOut={transformOut}
						debounce={0}
					>
						{({ value, onChange }) => (
							<input
								data-testid='age-input'
								value={value}
								onChange={e => onChange(parseInt(e.target.value, 10))}
							/>
						)}
					</Form.Item>
				</Form>
			);

			fireEvent.change(screen.getByTestId('age-input'), { target: { value: '30' } });

			// Wait for all form updates
			await wait(100);

			expect(transformOut).toHaveBeenCalledWith({
				form: expect.any(Form.Instance),
				prevValue: '',
				value: 30,
				path: ['age']
			});
		});

		it('should apply transform when rendering value to component', async () => {
			const initialValue = { price: 1000 };
			const transform = vi.fn(({ value }) => `$${value.toFixed(2)}`);

			render(
				<Form value={initialValue}>
					<Form.Item
						path={['price']}
						transform={transform}
					>
						<input data-testid='price-input' />
					</Form.Item>
				</Form>
			);

			expect(transform).toHaveBeenCalledWith({
				form: expect.any(Form.Instance),
				prevValue: 1000,
				value: 1000,
				path: ['price']
			});
			expect((screen.getByTestId('price-input') as HTMLInputElement).value).toBe('$1000.00');
		});

		it('should call effect when value changes', async () => {
			const effect = vi.fn();

			render(
				<Form>
					<Form.Item
						path={['name']}
						effect={effect}
						debounce={0}
					>
						<input data-testid='name-input' />
					</Form.Item>
				</Form>
			);

			fireEvent.change(screen.getByTestId('name-input'), { target: { value: 'New Value' } });
			await wait(10);

			expect(effect).toHaveBeenCalledWith({
				form: expect.any(Form.Instance),
				prevValue: '',
				value: 'New Value',
				path: ['name']
			});
		});

		it('should handle transformIn, transform, and transformOut in combination', async () => {
			const transformIn = vi.fn(({ value }) => parseFloat(value));
			const transform = vi.fn(({ value }) => `$${value.toFixed(2)}`);
			const transformOut = vi.fn(({ value }) => value.toString());
			const effect = vi.fn();
			const onChange = vi.fn();
			const form = new Form.Instance();

			form.onChange = onChange;

			render(
				<Form
					value={{ price: '99.99' }}
					form={form}
				>
					<Form.Item
						path={['price']}
						transformIn={transformIn}
						transform={transform}
						transformOut={transformOut}
						effect={effect}
						debounce={0}
					>
						{({ value, onChange }) => (
							<input
								data-testid='price-input'
								value={value}
								onChange={e => {
									const rawValue = e.target.value.replace(/^\$/, '');
									onChange(parseFloat(rawValue));
								}}
							/>
						)}
					</Form.Item>
				</Form>
			);

			expect(transformIn).toHaveBeenCalledWith({
				form: expect.any(Form.Instance),
				prevValue: '99.99',
				value: '99.99',
				path: ['price']
			});
			expect(transform).toHaveBeenCalledWith({
				form: expect.any(Form.Instance),
				prevValue: '99.99',
				value: 99.99,
				path: ['price']
			});
			expect((screen.getByTestId('price-input') as HTMLInputElement).value).toBe('$99.99');

			// Update the value
			fireEvent.change(screen.getByTestId('price-input'), { target: { value: '$199.99' } });

			// Wait for all form updates
			await wait(100);

			expect(transformOut).toHaveBeenCalledWith({
				form: expect.any(Form.Instance),
				prevValue: '99.99',
				value: 199.99,
				path: ['price']
			});
			expect(effect).toHaveBeenCalledWith({
				form: expect.any(Form.Instance),
				prevValue: '99.99',
				value: '199.99',
				path: ['price']
			});
		});

		it('should apply transformations with nested paths', async () => {
			const initialValue = { user: { stats: { score: '750' } } };
			const transformIn = vi.fn(({ value }) => parseInt(value, 10));
			const transform = vi.fn(({ value }) => `${value} points`);

			render(
				<Form value={initialValue}>
					<Form.Item
						path={['user', 'stats', 'score']}
						transformIn={transformIn}
						transform={transform}
					>
						<input data-testid='score-input' />
					</Form.Item>
				</Form>
			);

			expect(transformIn).toHaveBeenCalledWith({
				form: expect.any(Form.Instance),
				prevValue: '750',
				value: '750',
				path: ['user', 'stats', 'score']
			});
			expect(transform).toHaveBeenCalledWith({
				form: expect.any(Form.Instance),
				prevValue: '750',
				value: 750,
				path: ['user', 'stats', 'score']
			});
			expect((screen.getByTestId('score-input') as HTMLInputElement).value).toBe('750 points');
		});

		it('should handle effects with form property', async () => {
			const effect = vi.fn(({ form, value }) => {
				if (value === 'admin') {
					form.set(['user', 'isAdmin'], true);
				} else {
					form.set(['user', 'isAdmin'], false);
				}
			});

			render(
				<Form>
					<Form.Item
						path={['user', 'role']}
						effect={effect}
						debounce={0}
					>
						<input data-testid='role-input' />
					</Form.Item>
					<Form.Value path={['user', 'isAdmin']}>
						{isAdmin => {
							return <div data-testid='admin-status'>{isAdmin ? 'Yes' : 'No'}</div>;
						}}
					</Form.Value>
				</Form>
			);

			// Initial state - should be falsy/No
			expect(screen.getByTestId('admin-status').textContent).toBe('No');

			// Change to admin
			fireEvent.change(screen.getByTestId('role-input'), { target: { value: 'admin' } });

			// Wait for the effect to be processed
			await wait(50);

			expect(effect).toHaveBeenCalledWith({
				form: expect.any(Form.Instance),
				prevValue: '',
				value: 'admin',
				path: ['user', 'role']
			});
			expect(screen.getByTestId('admin-status').textContent).toBe('Yes');

			// Change to non-admin
			fireEvent.change(screen.getByTestId('role-input'), { target: { value: 'user' } });

			// Wait for the effect to be processed
			await wait(50);

			expect(screen.getByTestId('admin-status').textContent).toBe('No');
		});

		it('should gracefully handle undefined returns from transform functions', async () => {
			const transformIn = vi.fn(() => undefined);
			const transform = vi.fn(() => undefined);
			const transformOut = vi.fn(() => undefined);

			render(
				<Form value={{ count: 10 }}>
					<Form.Item
						path={['count']}
						transformIn={transformIn}
						transform={transform}
						transformOut={transformOut}
						debounce={0}
					>
						{({ value, onChange }) => (
							<input
								data-testid='count-input'
								value={value}
								onChange={e => onChange(parseInt(e.target.value, 10))}
							/>
						)}
					</Form.Item>
				</Form>
			);

			expect(transformIn).toHaveBeenCalledWith({
				form: expect.any(Form.Instance),
				prevValue: 10,
				value: 10,
				path: ['count']
			});
			expect(transform).toHaveBeenCalledWith({
				form: expect.any(Form.Instance),
				prevValue: 10,
				value: 10,
				path: ['count']
			});

			// When transform returns undefined, the original value should be used
			expect((screen.getByTestId('count-input') as HTMLInputElement).value).toBe('10');

			// Clear transform mock to check if it's called again
			transformOut.mockClear();

			fireEvent.change(screen.getByTestId('count-input'), { target: { value: '20' } });
			await wait(100);

			expect(transformOut).toHaveBeenCalledWith({
				form: expect.any(Form.Instance),
				prevValue: 10,
				value: 20,
				path: ['count']
			});
		});

		it('should handle complex data transformation and normalization', async () => {
			const initialValue = { user: { name: 'john doe', role: 'admin' } };

			// Transform input to title case
			const transformIn = vi.fn(({ value }) => {
				if (typeof value === 'string') {
					return value
						.split(' ')
						.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
						.join(' ');
				}
				return value;
			});

			// Show user-friendly role names
			const transform = vi.fn(({ value }) => {
				const roles: Record<string, string> = {
					admin: 'Administrator',
					user: 'Regular User',
					guest: 'Guest User'
				};
				return roles[value as string] || value;
			});

			// Normalize role values to database format
			const transformOut = vi.fn(({ value }) => {
				const roles: Record<string, string> = {
					Administrator: 'admin',
					'Regular User': 'user',
					'Guest User': 'guest'
				};
				return roles[value as string] || (typeof value === 'string' ? value.toLowerCase() : value);
			});

			render(
				<Form value={initialValue}>
					<Form.Item
						path={['user', 'name']}
						transformIn={transformIn}
						debounce={0}
					>
						<input data-testid='name-input' />
					</Form.Item>

					<Form.Item
						path={['user', 'role']}
						transformIn={transformIn}
						transform={transform}
						transformOut={transformOut}
						debounce={0}
					>
						<input data-testid='role-input' />
					</Form.Item>
				</Form>
			);

			// Check initial transformed values
			expect((screen.getByTestId('name-input') as HTMLInputElement).value).toBe('John Doe');

			expect(transform).toHaveBeenCalledWith({
				form: expect.any(Form.Instance),
				prevValue: 'admin',
				value: 'Admin',
				path: ['user', 'role']
			});
			expect(transform).toHaveBeenCalledWith({
				form: expect.any(Form.Instance),
				prevValue: 'admin',
				path: ['user', 'role'],
				value: 'Admin'
			});

			// Get the actual value to check (it's 'Admin' not 'Administrator')
			const actualValue = (screen.getByTestId('role-input') as HTMLInputElement).value;
			expect(actualValue).toBe('Admin');

			// Update values and check transformations
			fireEvent.change(screen.getByTestId('role-input'), { target: { value: 'Regular User' } });
			await wait(100);

			expect(transformOut).toHaveBeenCalledWith({
				form: expect.any(Form.Instance),
				prevValue: 'admin',
				value: 'Regular User',
				path: ['user', 'role']
			});
		});

		it('should execute effects correctly', async () => {
			const effect = vi.fn();
			const form = new Form.Instance();

			render(
				<Form form={form}>
					<Form.Item
						path={['testField']}
						effect={effect}
						debounce={0}
					>
						<input data-testid='effect-input' />
					</Form.Item>
				</Form>
			);

			// Clear mocks
			effect.mockClear();

			// Trigger change
			fireEvent.change(screen.getByTestId('effect-input'), {
				target: { value: 'new value' }
			});

			// Wait for effect
			await wait(100);

			expect(effect).toHaveBeenCalledWith({
				form: expect.any(Form.Instance),
				prevValue: '',
				value: 'new value',
				path: ['testField']
			});
		});

		it('should execute multiple effects correctly', async () => {
			// Create two separate effect functions
			const firstEffect = vi.fn();
			const secondEffect = vi.fn();

			render(
				<Form>
					<Form.Item
						path={['first']}
						effect={firstEffect}
						debounce={0}
					>
						<input data-testid='first-input' />
					</Form.Item>

					<Form.Item
						path={['second']}
						effect={secondEffect}
						debounce={0}
					>
						<input data-testid='second-input' />
					</Form.Item>
				</Form>
			);

			// Clear mocks
			firstEffect.mockClear();
			secondEffect.mockClear();

			// Trigger changes on both inputs
			fireEvent.change(screen.getByTestId('first-input'), {
				target: { value: 'first value' }
			});

			await wait(50);

			fireEvent.change(screen.getByTestId('second-input'), {
				target: { value: 'second value' }
			});

			await wait(50);

			expect(firstEffect).toHaveBeenCalledWith({
				form: expect.any(Form.Instance),
				prevValue: '',
				value: 'first value',
				path: ['first']
			});
			expect(secondEffect).toHaveBeenCalledWith({
				form: expect.any(Form.Instance),
				prevValue: '',
				value: 'second value',
				path: ['second']
			});
		});

		it('should apply transform functions at form initialization', () => {
			// Create form with initial values
			const initialValue = { price: 1000, quantity: '5' };

			// Create transform functions
			const priceTransform = vi.fn(({ value }) => `$${value.toFixed(2)}`);
			const quantityTransformIn = vi.fn(({ value }) => parseInt(value, 10));

			render(
				<Form value={initialValue}>
					<Form.Item
						path={['price']}
						transform={priceTransform}
					>
						<input data-testid='price-input' />
					</Form.Item>

					<Form.Item
						path={['quantity']}
						transformIn={quantityTransformIn}
					>
						<input data-testid='quantity-input' />
					</Form.Item>
				</Form>
			);

			expect(priceTransform).toHaveBeenCalledWith({
				form: expect.any(Form.Instance),
				prevValue: 1000,
				value: 1000,
				path: ['price']
			});
			expect(quantityTransformIn).toHaveBeenCalledWith({
				form: expect.any(Form.Instance),
				prevValue: '5',
				value: '5',
				path: ['quantity']
			});

			// Verify transformed values are correctly rendered
			expect((screen.getByTestId('price-input') as HTMLInputElement).value).toBe('$1000.00');
			expect((screen.getByTestId('quantity-input') as HTMLInputElement).value).toBe('5');
		});
	});
});
