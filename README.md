# 🚀 use-lite-form

![React](https://img.shields.io/badge/React-19.0.0+-61DAFB?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.2.0+-646CFF?style=flat-square&logo=vite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)
[![Vitest](https://img.shields.io/badge/-Vitest-729B1B?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev/)

A lightweight, type-safe form management library for React with a powerful and intuitive API.

## ✨ Features

- 🪶 **Lightweight** - Less than 3KB gzipped
- 🧩 **Simple API** - Intuitive component-based interface
- 🔄 **Controlled Forms** - Seamless state management
- 💾 **Nested Data** - Support for complex, nested form structures
- 🧪 **Validation** - Flexible validation with custom error messages
- 🔀 **Dynamic Fields** - Add, remove, reorder form items
- ⚡ **Value Transformations** - Transform inputs and outputs
- 🧠 **Type-Safe** - Full TypeScript support
- 🗄️ **Lists Support** - Arrays of objects with CRUD operations
- ↩️ **Undo/Redo** - Built-in support for form state history

## 📦 Installation

```bash
npm install use-lite-form

# or with yarn
yarn add use-lite-form

# or with pnpm
pnpm add use-lite-form
```

## 🚦 Quick Start

```jsx
import { useState } from 'react';
import Form from 'use-lite-form';

const BasicForm = () => {
	const [formResult, setFormResult] = useState(null);

	const handleSubmit = payload => {
		setFormResult(payload.value);
	};

	return (
		<div>
			<Form onSubmit={handleSubmit}>
				<div>
					<label>Full Name</label>
					<Form.Item
						path={['name']}
						required
					>
						<input type='text' />
					</Form.Item>
				</div>

				<div>
					<label>Email</label>
					<Form.Item
						path={['email']}
						required
					>
						<input type='email' />
					</Form.Item>
				</div>

				<button type='submit'>Submit</button>
			</Form>

			{formResult && <pre>{JSON.stringify(formResult, null, 2)}</pre>}
		</div>
	);
};
```

## 📖 API Reference

### `<Form>`

The main component that provides the form context.

```jsx
<Form
	onSubmit={payload => console.log(payload.value)}
	onChange={payload => console.log(payload.value, payload.errors)}
	value={initialValues}
>
	{/* Form content */}
</Form>
```

#### Props

- `onSubmit`: Function called when the form is submitted
- `onChange`: Function called when any form field changes
- `value`: Initial form values
- `form`: Custom form instance (advanced usage)
- `locked`: Whether the form is locked for editing
- `as`: HTML element to render the form as (default: 'form')

### `<Form.Item>`

Component for individual form fields.

```jsx
<Form.Item
	path={['user', 'name']}
	required
	defaultValue=''
>
	<input type='text' />
</Form.Item>
```

#### Props

- `childTransform`: Transforms the value for the child component only, without affecting the form state
- `path`: Array path specifying the location of this field's value within the form state
- `required`: Boolean or validation function that determines if the field is required and returns error messages
- `defaultValue`: Initial value used when the field has no value in the form state
- `debounce`: Delay in milliseconds before reporting value changes to the form (default: 250ms)
- `transformIn`: Transforms the value when reading from form state
- `transformOut`: Transforms the value when writing to form state
- `effect`: Side effect function executed whenever the field value changes in the form state

### `<Form.List>`

Component for managing arrays of form items.

```jsx
<Form.List path={['items']}>
	<Form.List.Items>
		{props => (
			<div>
				<Form.Item path={[...props.path, 'name']}>
					<input type='text' />
				</Form.Item>
				<button onClick={() => props.remove()}>Remove</button>
			</div>
		)}
	</Form.List.Items>

	<Form.List.Add>{props => <button onClick={() => props.add({ name: '' })}>Add Item</button>}</Form.List.Add>
</Form.List>
```

### `<Form.Value>`

Component to display or use form values in your UI.

```jsx
<Form.Value path={['user', 'type']}>
	{({ value }) => {
		if (value === 'admin') {
			return <div>Admin Fields...</div>;
		}
		return <div>User Fields...</div>;
	}}
</Form.Value>
```

### `Form.useForm()`

Hook to access the form instance and values.

```jsx
const MyComponent = () => {
	const { instance, value } = Form.useForm(['user']);

	// Access specific path value
	console.log(value.name);

	// Call form methods
	instance.set(['user', 'name'], 'New Value');

	return <div>...</div>;
};
```

### `Form.useNewForm(initialValue?: object)`

Hook to create a new form instance.

```jsx
const MyComponent = () => {
	const { instance, value } = Form.useNewForm({ name: 'Felipe' });

	// Access specific path value
	console.log(value.name);

	// Call form methods
	instance.set(['user', 'name'], 'New Value');

	return <div>...</div>;
};
```

### `Form.useFormHistory(options?: object)`

A hook to manage the form's value history, enabling undo and redo functionality. It must be used within a `<Form>` component.

```jsx
const HistoryControls = () => {
	const { canRedo, canUndo, redo, undo, clear } = Form.useFormHistory({
		maxCapacity: 20 // Optional: defaults to 10
	});

	return (
		<div>
			<button
				onClick={undo}
				disabled={!canUndo}
			>
				Undo
			</button>
			<button
				onClick={redo}
				disabled={!canRedo}
			>
				Redo
			</button>
			<button onClick={clear}>Clear History</button>
		</div>
	);
};

const MyForm = () => {
	return (
		<Form>
			<HistoryControls />
			{/* Form.Item fields go here */}
		</Form>
	);
};
```

#### Options

- `maxCapacity` (optional, `number`): The maximum number of history states to store. Defaults to `10`.
- `debounceTime` (optional, `number`): Time in milliseconds to debounce history updates.

#### Returns

- `canUndo` (`boolean`): True if there is a past state to revert to.
- `canRedo` (`boolean`): True if there is a future state to restore.
- `undo()` (`function`): Reverts the form to the previous state.
- `redo()` (`function`): Restores the next state in the history.
- `clear()` (`function`): Clears the entire history.

## 🎯 Advanced Usage

### Custom Validation

```jsx
<Form.Item
	path={['password']}
	required={({ value }) => {
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
	}}
>
	<input type='password' />
</Form.Item>
```

### Value Transformations

```jsx
<Form.Item
	path={['tags']}
	defaultValue={[]}
	transformIn={({ value }) => (Array.isArray(value) ? value.join(', ') : '')}
	transformOut={({ value }) =>
		value
			.split(',')
			.map(tag => tag.trim())
			.filter(Boolean)
	}
>
	<input
		type='text'
		placeholder='tag1, tag2, tag3'
	/>
</Form.Item>
```

### Conditional Rendering

```jsx
<Form.Item
  path={['contactMethod']}
  defaultValue="email"
>
  {/* Radio buttons for contact method */}
</Form.Item>

<Form.Value path={['contactMethod']}>
  {({ value }) => {
    if (value === 'email') {
      return (
        <Form.Item path={['emailAddress']} required>
          <input type="email" />
        </Form.Item>
      );
    }
    if (value === 'phone') {
      return (
        <Form.Item path={['phoneNumber']} required>
          <input type="tel" />
        </Form.Item>
      );
    }
    return null;
  }}
</Form.Value>
```

### Dynamic Lists

```jsx
<Form.List path={['items']}>
	<Form.List.Items>
		{props => (
			<div>
				<Form.Item
					path={[...props.path, 'name']}
					required
				>
					<input type='text' />
				</Form.Item>
				<Form.Item
					path={[...props.path, 'quantity']}
					defaultValue={1}
				>
					<input
						type='number'
						min='1'
					/>
				</Form.Item>
				<div>
					<button
						onClick={() => props.moveUp()}
						disabled={props.first}
					>
						Move Up
					</button>
					<button
						onClick={() => props.moveDown()}
						disabled={props.last}
					>
						Move Down
					</button>
					<button onClick={() => props.remove()}>Remove</button>
				</div>
			</div>
		)}
	</Form.List.Items>

	<Form.List.Add>{props => <button onClick={() => props.add({ name: '', quantity: 1 })}>Add Item</button>}</Form.List.Add>
</Form.List>
```

### Undo/Redo with `useFormHistory`

Implement undo/redo functionality by creating a control component that uses the `Form.useFormHistory` hook.

```jsx
import Form from 'use-lite-form';

// A component to manage history controls
const HistoryControls = () => {
	const { canRedo, canUndo, redo, undo } = Form.useFormHistory();

	return (
		<div>
			<button
				type='button'
				onClick={undo}
				disabled={!canUndo}
			>
				Undo
			</button>
			<button
				type='button'
				onClick={redo}
				disabled={!canRedo}
			>
				Redo
			</button>
		</div>
	);
};

// The main form component
const EditorForm = () => (
	<Form>
		<HistoryControls />

		<Form.Item
			path={['title']}
			debounce={500}
		>
			<input
				type='text'
				placeholder='Title'
			/>
		</Form.Item>

		<Form.Item
			path={['content']}
			debounce={500}
		>
			<textarea placeholder='Start writing...' />
		</Form.Item>

		<button type='submit'>Save</button>
	</Form>
);
```

## 🧠 How It Works

`use-lite-form` is built around React's Context API to provide a seamless form management experience:

1. **Form Instance**: Manages the form state, including values and errors
2. **Path-based Access**: Uses array paths to access nested form data
3. **Component Architecture**: Uses a component-based approach for form elements
4. **Validation System**: Flexible validation with custom error messages
5. **List Management**: Special handling for arrays of form items
6. **Transformations**: Support for transforming data between the view and the model
7. **History Management**: A dedicated hook `useFormHistory` listens for form changes and manages a history stack for undo/redo operations.

## 🧪 Running Tests

```bash
yarn test
```

## 📝 License

MIT © [Felipe Rohde](mailto:feliperohdee@gmail.com)

## 👨‍💻 Author

**Felipe Rohde**

- Twitter: [@felipe_rohde](https://twitter.com/felipe_rohde)
- Github: [@feliperohdee](https://github.com/feliperohdee)
- Email: feliperohdee@gmail.com
