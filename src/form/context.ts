import { createContext, FormEvent, KeyboardEvent } from 'react';

import Instance from '@/form/instance';

type Context = {
	instance: Instance;
	locked: boolean;
	submit: (e: FormEvent<HTMLFormElement> | KeyboardEvent<HTMLElement>) => void;
};

const context = createContext<Context>({
	instance: null!,
	locked: false,
	submit: () => {}
});

export default context;
