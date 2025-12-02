import '@/demo.css';

import { ReactNode, useState } from 'react';
import Form from '@/form';

const Layout = ({ children }: { children: ReactNode; title: string }) => {
	return (
		<div className='container'>
			<main>{children}</main>
		</div>
	);
};

// Basic user form example
const BasicForm = () => {
	const [formResult, setFormResult] = useState<any>(null);
	const [lastSubmitTime, setLastSubmitTime] = useState<number | null>(null);

	const submit = (payload: Form.Payload) => {
		setFormResult(payload.value);
		setLastSubmitTime(payload.lastSubmit);
	};

	return (
		<div className='page'>
			<h2>Basic Form</h2>
			<p>A simple form with basic fields and validation.</p>

			<Form onSubmit={submit}>
				<div className='card'>
					<h3>Personal Information</h3>

					<div className='form-group'>
						<label className='form-label'>Full Name</label>
						<Form.Item
							path={['name']}
							required
						>
							<input
								type='text'
								className='form-input'
							/>
						</Form.Item>
					</div>

					<div className='form-group'>
						<label className='form-label'>Email</label>
						<Form.Item
							path={['email']}
							required
						>
							<input
								type='email'
								className='form-input'
							/>
						</Form.Item>
					</div>

					<div className='form-group'>
						<label className='form-label'>Age</label>
						<Form.Item
							path={['age']}
							defaultValue='0'
						>
							<input
								type='number'
								className='form-input'
							/>
						</Form.Item>
					</div>
				</div>

				<div className='actions'>
					<button
						type='submit'
						className='button'
					>
						Submit
					</button>
				</div>
			</Form>

			{formResult && (
				<div className='card form-result'>
					<h3>Form Result</h3>
					{lastSubmitTime && <p className='submit-time'>Last submitted: {new Date(lastSubmitTime).toLocaleString()}</p>}
					<pre className='result-display'>{JSON.stringify(formResult, null, 2)}</pre>
				</div>
			)}
		</div>
	);
};

// Form with complex validation
const ValidationForm = () => {
	const [formResult, setFormResult] = useState<any>(null);

	const submit = (payload: Form.Payload) => {
		setFormResult({
			errors: payload.errors,
			errorsCount: payload.errorsCount,
			value: payload.value
		});
	};

	const validatePassword = ({ value }: { value: string }) => {
		if (value.length < 8) {
			return 'Password must be at least 8 characters';
		}

		if (!/[A-Z]/.test(value)) {
			return 'Password must contain at least one uppercase letter';
		}

		if (!/[0-9]/.test(value)) {
			return 'Password must contain at least one number';
		}

		return false;
	};

	const validateEmail = ({ value }: { value: string }) => {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return !emailRegex.test(value) ? 'Please enter a valid email address' : false;
	};

	return (
		<div className='page'>
			<h2>Form Validation</h2>
			<p>Demonstrates various validation techniques.</p>

			<Form onSubmit={submit}>
				<div className='card'>
					<h3>Registration</h3>

					<div className='form-group'>
						<label className='form-label'>Username</label>
						<Form.Item
							path={['username']}
							required={({ value }) => (value.length < 3 ? 'Username must be at least 3 characters' : false)}
						>
							<input
								type='text'
								className='form-input'
							/>
						</Form.Item>
					</div>

					<div className='form-group'>
						<label className='form-label'>Email</label>
						<Form.Item
							path={['email']}
							required={validateEmail}
						>
							<input
								type='email'
								className='form-input'
							/>
						</Form.Item>
					</div>

					<div className='form-group'>
						<label className='form-label'>Password</label>
						<Form.Item
							path={['password']}
							required={validatePassword}
						>
							<input
								type='password'
								className='form-input'
							/>
						</Form.Item>
					</div>

					<div className='form-group'>
						<Form.Item
							path={['terms']}
							defaultValue={false}
						>
							{({ onChange, value }) => (
								<label className='form-checkbox-label'>
									<input
										type='checkbox'
										checked={value}
										onChange={e => onChange(e.target.checked)}
									/>
									<span>I agree to the terms and conditions</span>
								</label>
							)}
						</Form.Item>
					</div>
				</div>

				<div className='actions'>
					<button
						type='submit'
						className='button'
					>
						Register
					</button>
				</div>
			</Form>

			{formResult && (
				<div className='card form-result'>
					<h3>Form Result</h3>
					<pre className='result-display'>{JSON.stringify(formResult, null, 2)}</pre>
				</div>
			)}
		</div>
	);
};

// Dynamic form with conditional fields
const DynamicForm = () => {
	const [formResult, setFormResult] = useState<any>(null);

	const submit = (payload: Form.Payload) => {
		setFormResult(payload.value);
	};

	return (
		<div className='page'>
			<h2>Dynamic Form</h2>
			<p>This form demonstrates fields that change based on user selections.</p>

			<Form onSubmit={submit}>
				<div className='card'>
					<h3>Contact Preferences</h3>

					<div className='form-group'>
						<label className='form-label'>Preferred Contact Method</label>
						<Form.Item
							debounce={0}
							path={['contactMethod']}
							defaultValue='email'
						>
							{({ onChange, value }) => (
								<div className='radio-group'>
									<label className='radio-label'>
										<input
											type='radio'
											name='contactMethod'
											value='email'
											checked={value === 'email'}
											onChange={() => onChange('email')}
										/>
										<span>Email</span>
									</label>

									<label className='radio-label'>
										<input
											type='radio'
											name='contactMethod'
											value='phone'
											checked={value === 'phone'}
											onChange={() => onChange('phone')}
										/>
										<span>Phone</span>
									</label>

									<label className='radio-label'>
										<input
											type='radio'
											name='contactMethod'
											value='mail'
											checked={value === 'mail'}
											onChange={() => onChange('mail')}
										/>
										<span>Mail</span>
									</label>
								</div>
							)}
						</Form.Item>
					</div>

					<Form.Value path={['contactMethod']}>
						{({ value }) => {
							if (value === 'email') {
								return (
									<div className='form-group'>
										<label className='form-label'>Email Address</label>
										<Form.Item
											path={['emailAddress']}
											required
										>
											<input
												type='email'
												className='form-input'
											/>
										</Form.Item>
									</div>
								);
							}

							if (value === 'phone') {
								return (
									<div className='form-group'>
										<label className='form-label'>Phone Number</label>
										<Form.Item
											path={['phoneNumber']}
											required
										>
											<input
												type='tel'
												className='form-input'
											/>
										</Form.Item>
									</div>
								);
							}

							if (value === 'mail') {
								return (
									<div className='form-group'>
										<label className='form-label'>Mailing Address</label>
										<Form.Item
											path={['address', 'street']}
											required
										>
											<input
												type='text'
												placeholder='Street Address'
												className='form-input'
												style={{ marginBottom: '10px' }}
											/>
										</Form.Item>
										<Form.Item
											path={['address', 'city']}
											required
										>
											<input
												type='text'
												placeholder='City'
												className='form-input'
												style={{ marginBottom: '10px' }}
											/>
										</Form.Item>
										<div className='input-row'>
											<Form.Item
												path={['address', 'state']}
												required
											>
												<input
													type='text'
													placeholder='State'
													className='form-input'
												/>
											</Form.Item>
											<Form.Item
												path={['address', 'zip']}
												required
											>
												<input
													type='text'
													placeholder='Zip Code'
													className='form-input'
												/>
											</Form.Item>
										</div>
									</div>
								);
							}
						}}
					</Form.Value>

					<div className='form-group'>
						<label className='form-label'>Contact Frequency</label>
						<Form.Item
							path={['contactFrequency']}
							defaultValue='weekly'
						>
							<select className='form-select'>
								<option value='daily'>Daily</option>
								<option value='weekly'>Weekly</option>
								<option value='monthly'>Monthly</option>
								<option value='quarterly'>Quarterly</option>
							</select>
						</Form.Item>
					</div>
				</div>

				<div className='actions'>
					<button
						type='submit'
						className='button'
					>
						Save Preferences
					</button>
				</div>
			</Form>

			{formResult && (
				<div className='card form-result'>
					<h3>Form Result</h3>
					<pre className='result-display'>{JSON.stringify(formResult, null, 2)}</pre>
				</div>
			)}
		</div>
	);
};

// Form with List items
const FormListExample = () => {
	const [formResult, setFormResult] = useState<any>(null);

	const submit = (payload: Form.Payload) => {
		setFormResult(payload.value);
	};

	return (
		<div className='page'>
			<h2>Form List</h2>
			<p>Dynamic form with ability to add, remove, and reorder items.</p>

			<Form onSubmit={submit}>
				<div className='card'>
					<h3>Shopping List</h3>

					<Form.List path={['items']}>
						<Form.List.Items>
							{props => (
								<div className='list-item'>
									<div className='item-name'>
										<Form.Item
											path={[...props.path, 'name']}
											required
										>
											<input
												type='text'
												placeholder='Item name'
												className='form-input'
											/>
										</Form.Item>
									</div>

									<div className='item-quantity'>
										<Form.Item
											path={[...props.path, 'quantity']}
											defaultValue={1}
										>
											<input
												type='number'
												min='1'
												className='form-input'
											/>
										</Form.Item>
									</div>

									<div className='item-controls'>
										<button
											type='button'
											onClick={() => props.moveUp()}
											disabled={props.first}
											className='move-button'
										>
											↑
										</button>

										<button
											type='button'
											onClick={() => props.moveDown()}
											disabled={props.last}
											className='move-button'
										>
											↓
										</button>

										<button
											type='button'
											onClick={() => props.remove()}
											className='remove-button'
										>
											X
										</button>
									</div>
								</div>
							)}
						</Form.List.Items>

						<Form.List.Add>
							{props => (
								<button
									type='button'
									onClick={() => props.add({ name: '', quantity: 1 })}
									className='add-button'
								>
									+ Add Item
								</button>
							)}
						</Form.List.Add>
					</Form.List>
				</div>

				<div className='actions'>
					<button
						type='submit'
						className='button'
					>
						Save List
					</button>
				</div>
			</Form>

			{formResult && (
				<div className='card form-result'>
					<h3>Form Result</h3>
					<pre className='result-display'>{JSON.stringify(formResult, null, 2)}</pre>
				</div>
			)}
		</div>
	);
};

// Advanced form with transformations and complex validation
const AdvancedForm = () => {
	const [formResult, setFormResult] = useState<any>(null);

	const submit = (payload: Form.Payload) => {
		setFormResult(payload.value);
	};

	return (
		<div className='page'>
			<h2>Advanced Form</h2>
			<p>Shows advanced features like transformations and complex validations.</p>

			<Form onSubmit={submit}>
				<div className='card'>
					<h3>Profile Information</h3>

					<div className='form-group'>
						<label className='form-label'>Full Name</label>
						<Form.Item
							path={['fullName']}
							required
							transformOut={({ value }) => value.trim()}
						>
							<input
								type='text'
								className='form-input'
							/>
						</Form.Item>
					</div>

					<div className='form-group'>
						<label className='form-label'>Price</label>
						<Form.Item
							path={['price']}
							defaultValue=''
							required
							transformIn={({ value }) => (value ? parseFloat(value).toFixed(2) : '')}
							transformOut={({ value }) => (value ? parseFloat(value) : 0)}
						>
							<input
								type='text'
								className='form-input'
							/>
						</Form.Item>
					</div>

					<div className='form-group'>
						<label className='form-label'>Tags (comma separated)</label>
						<Form.Item
							path={['tags']}
							defaultValue={[]}
							transformIn={({ value }) => (Array.isArray(value) ? value.join(', ') : '')}
							transformOut={({ value }) =>
								value
									.split(',')
									.map((tag: string) => tag.trim())
									.filter(Boolean)
							}
						>
							<input
								type='text'
								placeholder='tag1, tag2, tag3'
								className='form-input'
							/>
						</Form.Item>
					</div>

					<div className='form-group'>
						<label className='form-label'>Date of Birth</label>
						<Form.Item
							path={['dob']}
							transformOut={({ value }) => {
								try {
									return new Date(value).toISOString().split('T')[0];
								} catch {
									return '';
								}
							}}
						>
							<input
								type='date'
								className='form-input'
							/>
						</Form.Item>
					</div>
				</div>

				<div className='actions'>
					<button
						type='submit'
						className='button'
					>
						Submit
					</button>
				</div>
			</Form>

			{formResult && (
				<div className='card form-result'>
					<h3>Form Result</h3>
					<pre className='result-display'>{JSON.stringify(formResult, null, 2)}</pre>
				</div>
			)}
		</div>
	);
};

// Form History Demo - shows undo/redo functionality
const FormHistoryDemo = () => {
	const [formResult, setFormResult] = useState<any>(null);

	const submit = (payload: Form.Payload) => {
		setFormResult(payload.value);
	};

	return (
		<div className='page'>
			<h2>Form History (Undo/Redo)</h2>
			<p>Demonstrates form state history with undo and redo functionality.</p>

			<Form onSubmit={submit}>
				{/* History Controls Component */}
				<HistoryControls />

				<div className='card'>
					<h3>Personal Information</h3>

					<div className='form-group'>
						<label className='form-label'>Full Name</label>
						<Form.Item
							path={['name']}
							required
						>
							<input
								type='text'
								className='form-input'
								placeholder='Enter your full name'
							/>
						</Form.Item>
					</div>

					<div className='form-group'>
						<label className='form-label'>Email</label>
						<Form.Item
							path={['email']}
							required
						>
							<input
								type='email'
								className='form-input'
								placeholder='Enter your email'
							/>
						</Form.Item>
					</div>

					<div className='form-group'>
						<label className='form-label'>Bio</label>
						<Form.Item
							path={['bio']}
							defaultValue=''
						>
							<textarea
								className='form-input'
								rows={4}
								placeholder='Tell us about yourself...'
							/>
						</Form.Item>
					</div>

					<div className='form-group'>
						<label className='form-label'>Age</label>
						<Form.Item
							path={['age']}
							defaultValue={18}
						>
							<input
								type='number'
								className='form-input'
								min={18}
								max={100}
							/>
						</Form.Item>
					</div>
				</div>

				<div className='actions'>
					<button
						type='submit'
						className='button'
					>
						Submit
					</button>
				</div>
			</Form>

			{formResult && (
				<div className='card form-result'>
					<h3>Form Result</h3>
					<pre className='result-display'>{JSON.stringify(formResult, null, 2)}</pre>
				</div>
			)}
		</div>
	);
};

// History Controls Component that uses the useFormHistory hook
const HistoryControls = () => {
	const [historyState, historyActions] = Form.useFormHistory({
		maxCapacity: 10
	});

	return (
		<div className='card'>
			<h3>History Controls</h3>
			<div className='form-group'>
				<div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
					<button
						type='button'
						className='button'
						onClick={historyActions.undo}
						disabled={!historyState.canUndo}
						title='Undo last change'
					>
						← Undo
					</button>
					<button
						type='button'
						className='button'
						onClick={historyActions.redo}
						disabled={!historyState.canRedo}
						title='Redo last undone change'
					>
						Redo →
					</button>
					<button
						type='button'
						className='button'
						onClick={historyActions.initial}
						title='Clear history'
					>
						Clear History
					</button>
				</div>
				<div style={{ fontSize: '14px', color: '#666' }}>
					Can undo: {historyState.canUndo ? 'Yes' : 'No'} | Can redo: {historyState.canRedo ? 'Yes' : 'No'}
				</div>
			</div>
		</div>
	);
};

const Demo = () => {
	const [activeTab, setActiveTab] = useState('basic');

	return (
		<Layout title='Form Demo'>
			<div
				id='basic'
				className={`tab-content ${activeTab === 'basic' ? '' : 'hidden'}`}
			>
				<BasicForm />
			</div>

			<div
				id='validation'
				className={`tab-content ${activeTab === 'validation' ? '' : 'hidden'}`}
			>
				<ValidationForm />
			</div>

			<div
				id='dynamic'
				className={`tab-content ${activeTab === 'dynamic' ? '' : 'hidden'}`}
			>
				<DynamicForm />
			</div>

			<div
				id='formlist'
				className={`tab-content ${activeTab === 'formlist' ? '' : 'hidden'}`}
			>
				<FormListExample />
			</div>

			<div
				id='advanced'
				className={`tab-content ${activeTab === 'advanced' ? '' : 'hidden'}`}
			>
				<AdvancedForm />
			</div>

			<div
				id='history'
				className={`tab-content ${activeTab === 'history' ? '' : 'hidden'}`}
			>
				<FormHistoryDemo />
			</div>

			<div className='actions tab-buttons'>
				<button
					className={`button tab-button ${activeTab === 'basic' ? 'active' : 'inactive'}`}
					onClick={() => setActiveTab('basic')}
				>
					Basic Form
				</button>

				<button
					className={`button tab-button ${activeTab === 'validation' ? 'active' : 'inactive'}`}
					onClick={() => setActiveTab('validation')}
				>
					Validation
				</button>

				<button
					className={`button tab-button ${activeTab === 'dynamic' ? 'active' : 'inactive'}`}
					onClick={() => setActiveTab('dynamic')}
				>
					Dynamic Fields
				</button>

				<button
					className={`button tab-button ${activeTab === 'formlist' ? 'active' : 'inactive'}`}
					onClick={() => setActiveTab('formlist')}
				>
					Form Lists
				</button>

				<button
					className={`button tab-button ${activeTab === 'advanced' ? 'active' : 'inactive'}`}
					onClick={() => setActiveTab('advanced')}
				>
					Advanced
				</button>

				<button
					className={`button tab-button ${activeTab === 'history' ? 'active' : 'inactive'}`}
					onClick={() => setActiveTab('history')}
				>
					History (Undo/Redo)
				</button>
			</div>
		</Layout>
	);
};

export default Demo;
