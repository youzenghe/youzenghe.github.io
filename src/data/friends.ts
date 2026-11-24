// Selected friend links; avatars are served with the site's static assets.
export interface FriendItem {
	id: number;
	title: string;
	imgurl: string;
	desc: string;
	siteurl: string;
	tags: string[];
}

export const friendsData: FriendItem[] = [
	{
		id: 1,
		title: "Mako",
		imgurl: "/assets/friends/mako.webp",
		desc: "朋友的个人博客，记录技术与生活。",
		siteurl: "https://blog.hitachi-mako.com",
		tags: ["友链"],
	},
	{
		id: 2,
		title: "veyliss",
		imgurl: "/assets/friends/veyliss.webp",
		desc: "探索技术，记录成长，分享所学。",
		siteurl: "https://blog.veyliss.top/",
		tags: ["友链"],
	},
	{
		id: 3,
		title: "cosine",
		imgurl: "/assets/friends/cosine.webp",
		desc: "记录算法、开发和一点点生活碎片。",
		siteurl: "https://ysx.cosine.ren/",
		tags: ["友链"],
	},
];

export function getFriendsList(): FriendItem[] {
	return friendsData;
}
