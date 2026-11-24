function qqMailUrl(email: string): string {
	return `https://mail.qq.com/cgi-bin/qm_share?t=qm_mailme&email=${encodeURIComponent(email)}`;
}

function gmailUrl(email: string): string {
	return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent("友链交换 / 站点留言")}&body=`;
}

export const friendContacts = [
	{
		label: "主邮箱",
		email: "2442616509@qq.com",
		href: qqMailUrl("2442616509@qq.com"),
	},
	{
		label: "备用邮箱",
		email: "A5075073344@163.com",
		href: "https://mail.163.com/",
	},
	{
		label: "备用邮箱",
		email: "skyberggrenzmb3391@gmail.com",
		href: gmailUrl("skyberggrenzmb3391@gmail.com"),
	},
];

export const friendContactActions = [
	{ label: "QQ 邮箱网页版", href: friendContacts[0].href },
	{ label: "163 邮箱", href: friendContacts[1].href },
	{ label: "Gmail 编写", href: friendContacts[2].href },
	{
		label: "GitHub 留言",
		href: "https://github.com/youzenghe/youzenghe.github.io/issues",
	},
];
