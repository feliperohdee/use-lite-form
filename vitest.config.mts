import { defineConfig } from 'vite';
import path from 'path';
import reactPlugin from '@vitejs/plugin-react';

const viteConfig = defineConfig(() => {
	return {
		plugins: [reactPlugin()],
		resolve: {
			alias: {
				'@': path.resolve(__dirname, './src')
			}
		},
		test: {
			coverage: {
				include: ['src/form/**/*.ts', 'src/form/**/*.tsx']
			},
			environment: 'jsdom',
			include: ['**/*.spec.*'],
			setupFiles: [path.resolve('vitest.setup.ts')]
		}
	};
});

export default viteConfig;
