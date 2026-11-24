import type { ProfileConfig } from "../types/config";

// 个人资料配置
export const profileConfig: ProfileConfig = {
	avatar: "/static/profile-avatar-chibi.png", // 本地透明头像
	name: "AAA乔瓮批发宝哥",
	bio: "天天开心，亲爱的陌生人",
	typewriter: {
		enable: true, // 启用个人简介打字机效果
		speed: 80, // 打字速度（毫秒）
	},
	links: [
		{
			name: "GitHub",
			url: "https://github.com/youzenghe",
			icon: "fa7-brands:github",
		},
		{
			name: "Bilibili",
			url: "https://space.bilibili.com/220928497",
			icon: "fa7-brands:bilibili",
		},
	],
};
