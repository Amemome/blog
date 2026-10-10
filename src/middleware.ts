import { defineMiddleware } from 'astro:middleware';
import { getSession } from './lib/server/auth';

export const onRequest = defineMiddleware((context, next) => {
	if (context.url.pathname === '/admin' || context.url.pathname.startsWith('/admin/')) {
		if (context.url.pathname !== '/admin/login' && !getSession(context)) return context.redirect('/admin/login');
	}
	return next();
});
