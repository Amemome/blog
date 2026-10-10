import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

export const renderMarkdown = (source: string) => sanitizeHtml(String(marked.parse(source, { gfm: true, breaks: false })), {
	allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img', 'h1', 'h2', 'h3', 'h4', 'pre', 'code'],
	allowedAttributes: {
		...sanitizeHtml.defaults.allowedAttributes,
		a: ['href', 'name', 'target', 'rel'],
		img: ['src', 'srcset', 'sizes', 'alt', 'width', 'height', 'loading'],
		code: ['class'],
	},
	allowedSchemes: ['http', 'https', 'mailto'],
});