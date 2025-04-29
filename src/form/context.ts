import { createContext, FormEvent, KeyboardEvent } from 'react';

import Instance from '@/form/instance';

type Context = {
	form: Instance;
	locked: boolean;
	submit: (e: FormEvent<HTMLFormElement> | KeyboardEvent<HTMLElement>) => void;
};

const context = createContext<Context>({
	form: null as unknown as Instance,
	locked: false,
	submit: () => {}
});

export default context;
