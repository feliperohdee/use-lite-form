import { createContext } from 'react';

import Instance from '@/form/instance';

type Context = {
	form: Instance;
	locked: boolean;
};

const context = createContext<Context>({
	form: null as unknown as Instance,
	locked: false
});

export default context;
