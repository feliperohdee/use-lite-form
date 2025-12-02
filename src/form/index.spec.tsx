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
			changed: false,
			changesCount: 0,
			errors: {},
			errorsCount: 0,
			instance: expect.any(Form.Instance),
			lastChange: expect.any(Number),
			lastSubmit: expect.any(Number),
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
			changed: false,
			changesCount: 0,
			errors: {},
			errorsCount: 0,
			instance: expect.any(Form.Instance),
			lastChange: expect.any(Number),
			lastSubmit: expect.any(Number),
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
			changed: false,
			changesCount: 0,
			errors: {},
			errorsCount: 0,
			instance: expect.any(Form.Instance),
			lastChange: expect.any(Number),
			lastSubmit: expect.any(Number),
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
			changed: false,
			changesCount: 0,
			errors: {},
			errorsCount: 0,
			instance: expect.any(Form.Instance),
			lastChange: expect.any(Number),
			lastSubmit: expect.any(Number),
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
			changed: false,
			changesCount: 0,
			errors: { name: 'Required Field.' },
			errorsCount: 1,
			instance: expect.any(Form.Instance),
			lastChange: expect.any(Number),
			lastSubmit: expect.any(Number),
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
			changed: false,
			changesCount: 0,
			errors: { name: 'Name must be at least 3 characters' },
			errorsCount: 1,
			instance: expect.any(Form.Instance),
			lastChange: expect.any(Number),
			lastSubmit: expect.any(Number),
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
			changed: false,
			changesCount: 0,
			errors: { name: 'Required Field.' },
			errorsCount: 1,
			instance: expect.any(Form.Instance),
			lastChange: expect.any(Number),
			lastSubmit: expect.any(Number),
			requiredErrorsCount: 1,
			value: { name: '' }
		});

		fireEvent.change(screen.getByTestId('text'), {
			target: { value: 'Felipe Rohde' }
		});

		fireEvent.click(screen.getByTestId('submit'));

		expect(onSubmit).toHaveBeenCalledWith({
			changed: false,
			changesCount: 0,
			errors: {},
			errorsCount: 0,
			instance: expect.any(Form.Instance),
			lastChange: expect.any(Number),
			lastSubmit: expect.any(Number),
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
				changed: true,
				changesCount: 2,
				errors: {},
				errorsCount: 0,
				instance: expect.any(Form.Instance),
				lastChange: expect.any(Number),
				lastSubmit: expect.any(Number),
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
					<Form.Value path={['user', 'name']}>{({ value }) => <div data-testid='name-value'>{value}</div>}</Form.Value>
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
						{({ value }) => {
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
						{({ value: user }) => (
							<div>
								<div data-testid='user-name'>{user.name}</div>
								<Form.Value path={['user', 'address']}>
									{({ value: address }) => (
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
				render(<Form.Value path={['user', 'name']}>{({ value }) => <div>{value}</div>}</Form.Value>);
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
				instance: expect.any(Form.Instance),
				prevValue: '25',
				path: ['age'],
				value: '25'
			});
			expect(screen.getByTestId('age-value').textContent).toBe('25');
			expect(typeof screen.getByTestId('age-value').textContent).toBe('string');
		});

		it('should apply transformOut when setting value to form', async () => {
			const transformOut = vi.fn(({ value }) => value.toString());
			const onChange = vi.fn();
			const instance = new Form.Instance();

			instance.onChange = onChange;

			render(
				<Form instance={instance}>
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
				instance: expect.any(Form.Instance),
				path: ['age'],
				prevValue: '',
				value: 30
			});
		});

		it('should apply childTransform when rendering value to component', async () => {
			const initialValue = { price: 1000 };
			const instance = new Form.Instance();
			const childTransform = vi.fn(({ value }) => `$${value.toFixed(2)}`);

			render(
				<Form
					instance={instance}
					value={initialValue}
				>
					<Form.Item
						childTransform={childTransform}
						path={['price']}
					>
						<input data-testid='price-input' />
					</Form.Item>
				</Form>
			);

			expect(childTransform).toHaveBeenCalledWith({
				instance: expect.any(Form.Instance),
				prevValue: 1000,
				path: ['price'],
				value: 1000
			});

			expect(instance.get(['price'])).toBe(1000);
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
				instance: expect.any(Form.Instance),
				prevValue: '',
				value: 'New Value',
				path: ['name']
			});
		});

		it('should handle childTransform, transformIn, and transformOut in combination', async () => {
			const childTransform = vi.fn(({ value }) => `$${value.toFixed(2)}`);
			const transformIn = vi.fn(({ value }) => parseFloat(value));
			const transformOut = vi.fn(({ value }) => value.toString());
			const effect = vi.fn();
			const onChange = vi.fn();
			const instance = new Form.Instance();

			instance.onChange = onChange;

			render(
				<Form
					instance={instance}
					value={{ price: '99.99' }}
				>
					<Form.Item
						childTransform={childTransform}
						path={['price']}
						transformIn={transformIn}
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
				instance: expect.any(Form.Instance),
				path: ['price'],
				prevValue: '99.99',
				value: '99.99'
			});
			expect(childTransform).toHaveBeenCalledWith({
				instance: expect.any(Form.Instance),
				path: ['price'],
				prevValue: '99.99',
				value: 99.99
			});
			expect((screen.getByTestId('price-input') as HTMLInputElement).value).toBe('$99.99');

			// Update the value
			fireEvent.change(screen.getByTestId('price-input'), { target: { value: '$199.99' } });

			// Wait for all form updates
			await wait(100);

			expect(transformOut).toHaveBeenCalledWith({
				instance: expect.any(Form.Instance),
				path: ['price'],
				prevValue: '99.99',
				value: 199.99
			});
			expect(effect).toHaveBeenCalledWith({
				instance: expect.any(Form.Instance),
				path: ['price'],
				prevValue: '99.99',
				value: '199.99'
			});

			expect(instance.get(['price'])).toBe('199.99');
		});

		it('should apply transformations with nested paths', async () => {
			const initialValue = { user: { stats: { score: '750' } } };
			const childTransform = vi.fn(({ value }) => `${value} points`);
			const transformIn = vi.fn(({ value }) => parseInt(value, 10));

			render(
				<Form value={initialValue}>
					<Form.Item
						childTransform={childTransform}
						path={['user', 'stats', 'score']}
						transformIn={transformIn}
					>
						<input data-testid='score-input' />
					</Form.Item>
				</Form>
			);

			expect(transformIn).toHaveBeenCalledWith({
				instance: expect.any(Form.Instance),
				path: ['user', 'stats', 'score'],
				prevValue: '750',
				value: '750'
			});
			expect(childTransform).toHaveBeenCalledWith({
				instance: expect.any(Form.Instance),
				path: ['user', 'stats', 'score'],
				prevValue: '750',
				value: 750
			});
			expect((screen.getByTestId('score-input') as HTMLInputElement).value).toBe('750 points');
		});

		it('should handle effects with instance property', async () => {
			const effect = vi.fn(({ instance, value }) => {
				if (value === 'admin') {
					instance.set(['user', 'isAdmin'], true);
				} else {
					instance.set(['user', 'isAdmin'], false);
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
						{({ value }) => {
							return <div data-testid='admin-status'>{value ? 'Yes' : 'No'}</div>;
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
				instance: expect.any(Form.Instance),
				path: ['user', 'role'],
				prevValue: '',
				value: 'admin'
			});
			expect(screen.getByTestId('admin-status').textContent).toBe('Yes');

			// Change to non-admin
			fireEvent.change(screen.getByTestId('role-input'), { target: { value: 'user' } });

			// Wait for the effect to be processed
			await wait(50);

			expect(screen.getByTestId('admin-status').textContent).toBe('No');
		});

		it('should gracefully handle undefined returns from transform functions', async () => {
			const childTransform = vi.fn(() => undefined);
			const transformIn = vi.fn(() => undefined);
			const transformOut = vi.fn(() => undefined);

			render(
				<Form value={{ count: 10 }}>
					<Form.Item
						childTransform={childTransform}
						path={['count']}
						transformIn={transformIn}
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
				instance: expect.any(Form.Instance),
				path: ['count'],
				prevValue: 10,
				value: 10
			});
			expect(childTransform).toHaveBeenCalledWith({
				instance: expect.any(Form.Instance),
				path: ['count'],
				prevValue: 10,
				value: 10
			});

			// When transform returns undefined, the original value should be used
			expect((screen.getByTestId('count-input') as HTMLInputElement).value).toBe('10');

			// Clear transform mock to check if it's called again
			transformOut.mockClear();

			fireEvent.change(screen.getByTestId('count-input'), { target: { value: '20' } });
			await wait(100);

			expect(transformOut).toHaveBeenCalledWith({
				instance: expect.any(Form.Instance),
				path: ['count'],
				prevValue: 10,
				value: 20
			});
		});

		it('should handle complex data transformation and normalization', async () => {
			const initialValue = { user: { name: 'john doe', role: 'admin' } };

			// Show user-friendly role names
			const childTransform = vi.fn(({ value }) => {
				const roles: Record<string, string> = {
					admin: 'Administrator',
					user: 'Regular User',
					guest: 'Guest User'
				};
				return roles[value as string] || value;
			});

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
						childTransform={childTransform}
						path={['user', 'role']}
						transformIn={transformIn}
						transformOut={transformOut}
						debounce={0}
					>
						<input data-testid='role-input' />
					</Form.Item>
				</Form>
			);

			// Check initial transformed values
			expect((screen.getByTestId('name-input') as HTMLInputElement).value).toBe('John Doe');

			expect(childTransform).toHaveBeenCalledWith({
				instance: expect.any(Form.Instance),
				path: ['user', 'role'],
				prevValue: 'admin',
				value: 'Admin'
			});
			expect(childTransform).toHaveBeenCalledWith({
				instance: expect.any(Form.Instance),
				path: ['user', 'role'],
				prevValue: 'admin',
				value: 'Admin'
			});

			// Get the actual value to check (it's 'Admin' not 'Administrator')
			const actualValue = (screen.getByTestId('role-input') as HTMLInputElement).value;
			expect(actualValue).toBe('Admin');

			// Update values and check transformations
			fireEvent.change(screen.getByTestId('role-input'), { target: { value: 'Regular User' } });
			await wait(100);

			expect(transformOut).toHaveBeenCalledWith({
				instance: expect.any(Form.Instance),
				path: ['user', 'role'],
				prevValue: 'admin',
				value: 'Regular User'
			});
		});

		it('should execute effects correctly', async () => {
			const effect = vi.fn();
			const instance = new Form.Instance();

			render(
				<Form instance={instance}>
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
				instance: expect.any(Form.Instance),
				path: ['testField'],
				prevValue: '',
				value: 'new value'
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
				instance: expect.any(Form.Instance),
				path: ['first'],
				prevValue: '',
				value: 'first value'
			});
			expect(secondEffect).toHaveBeenCalledWith({
				instance: expect.any(Form.Instance),
				path: ['second'],
				prevValue: '',
				value: 'second value'
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
						childTransform={priceTransform}
						path={['price']}
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
				instance: expect.any(Form.Instance),
				path: ['price'],
				prevValue: 1000,
				value: 1000
			});
			expect(quantityTransformIn).toHaveBeenCalledWith({
				instance: expect.any(Form.Instance),
				path: ['quantity'],
				prevValue: '5',
				value: '5'
			});

			// Verify transformed values are correctly rendered
			expect((screen.getByTestId('price-input') as HTMLInputElement).value).toBe('$1000.00');
			expect((screen.getByTestId('quantity-input') as HTMLInputElement).value).toBe('5');
		});
	});

	describe('onChange', () => {
		it('should call onChange when value is set', async () => {
			const onChange = vi.fn();
			const instance = new Form.Instance();

			render(
				<Form
					instance={instance}
					onChange={onChange}
				>
					<Form.Item path={['name']}>
						<input type='text' />
					</Form.Item>
				</Form>
			);

			instance.set(['name'], 'test');

			await wait(15);

			expect(onChange).toHaveBeenCalledWith(
				expect.objectContaining({
					value: { name: 'test' },
					changed: true,
					changesCount: 1
				}),
				'SET'
			);
		});
	});

	describe('onErrorChange', () => {
		it('should call onErrorChange when error is set', async () => {
			const onErrorChange = vi.fn();
			const instance = new Form.Instance();

			render(
				<Form
					instance={instance}
					onErrorChange={onErrorChange}
				>
					<Form.Item path={['name']}>
						<input type='text' />
					</Form.Item>
				</Form>
			);

			instance.setError(['name'], 'Required field');

			await wait(15);

			expect(onErrorChange).toHaveBeenCalledWith(
				expect.objectContaining({
					errors: { name: 'Required field' },
					errorsCount: 1
				}),
				'SET_ERROR'
			);
		});
	});
});
