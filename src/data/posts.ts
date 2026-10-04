export type Post = {
	title: string;
	slug: string;
	excerpt: string;
	content: string[];
	date: string;
	readTime: string;
	category: string;
	tags: string[];
	accent: string;
};

export type Category = {
	name: string;
	slug: string;
	accent: string;
};

export const categories: Category[] = [
	{ name: '기록', slug: 'record', accent: 'violet' },
	{ name: '개발', slug: 'development', accent: 'cyan' },
	{ name: '관측일지', slug: 'observation', accent: 'amber' },
];

export const posts: Post[] = [
	{
		title: '밤의 항로를 기록하는 법',
		slug: 'mapping-the-night-route',
		excerpt: '생각이 흩어지기 전에 작은 좌표 하나로 붙잡아 두는 개인적인 기록법.',
		content: ['좋은 기록은 모든 것을 설명하려 하지 않는다. 오늘의 내가 다시 찾아올 수 있도록, 기억의 표면에 좌표 하나를 남기는 일에 가깝다.', '나는 하루가 끝나면 가장 선명했던 장면 하나를 고른다. 그 장면의 온도와 망설임을 적고, 나중의 내가 이어서 생각할 수 있는 질문을 하나 남긴다.', '이 블로그는 그렇게 모인 작은 좌표들의 지도다. 완성된 결론보다 이동 중인 생각을 오래 보관하는 곳으로 만들고 싶다.'],
		date: '2026.09.28', readTime: '4 min read', category: 'record', tags: ['생각'], accent: 'violet',
	},
	{
		title: '느린 도구가 오래 남는 이유',
		slug: 'why-slow-tools-last',
		excerpt: '속도보다 반복할 수 있는 리듬을 고르는 일에 대하여.',
		content: ['도구를 고를 때 우리는 자주 가장 빠른 경로를 찾는다. 하지만 매일 손이 가는 도구는 속도보다 마찰의 모양이 더 중요하다.', '조금 느려도 현재의 생각을 방해하지 않는 도구, 다음 날 다시 열었을 때 낯설지 않은 도구가 결국 더 많은 것을 남긴다.', '그래서 이 작은 블로그의 기술 스택도 단순함을 기준으로 고르고 있다. 복잡성을 줄이면 기록 자체에 더 오래 머물 수 있다.'],
		date: '2026.09.16', readTime: '6 min read', category: 'development', tags: ['도구'], accent: 'cyan',
	},
	{
		title: '관측일지 001: 새벽의 색',
		slug: 'observation-log-001',
		excerpt: '잠들기 전 창문에 남아 있던 가장 짙은 파랑을 채집했다.',
		content: ['새벽 네 시의 하늘은 검정이 아니라 여러 겹의 파랑이었다. 도시의 불빛이 사라지는 순서까지 천천히 보였다.', '관측일지를 쓰는 동안에는 해석을 미룬다. 무엇을 느꼈는지보다 무엇이 있었는지를 먼저 적는다. 감정은 나중에 돌아와도 늦지 않다.', '오늘의 표본: 희미한 구름, 빈 도로, 멀리서 한 번 울린 새벽 배송 차량.'],
		date: '2026.09.04', readTime: '3 min read', category: 'observation', tags: ['일상'], accent: 'amber',
	},
];

export const getCategory = (slug: string) => categories.find((category) => category.slug === slug);
export const allTags = [...new Set(posts.flatMap((post) => post.tags))];