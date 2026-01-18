import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'

export default defineConfig({
	plugins: [
		dts({
			tsconfigPath: './configs/tsconfig.build.json',
			rollupTypes: true,
		}),
	],
	build: {
		lib: {
			entry: resolve(__dirname, 'src/index.ts'),
			name: 'adapters',
			fileName: 'index',
			formats: ['es'],
		},
		outDir: 'dist',
		emptyOutDir: true,
		sourcemap: true,
	},
	resolve: {
		alias: {
			'@mikesaintsg/vectorstore': resolve(__dirname, 'src', 'index.ts'),
		},
	},
})
