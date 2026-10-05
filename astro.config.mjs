// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
	output: 'server',
	site: process.env.PUBLIC_SITE_URL ?? 'http://localhost:4321',
	adapter: node({ mode: 'standalone' }),
});
