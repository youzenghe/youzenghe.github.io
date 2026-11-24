# 入口首页与博客路径

## 页面结构

- `/`：纸页入口，源码为 `src/entry/landing.html`，由 `src/pages/index.astro` 输出。
- `/blog/`：博客首页，文章列表与分页源码为 `src/pages/blog/[...page].astro`。
- `/archive/`、`/games/`、`/albums/`、`/friends/`、`/about/`、`/about-me/`：现有博客页面，路径不变。
- `/services/index.html`：独立资源索引，保留分类与搜索，不依赖旧博客的路由脚本。
- `/games/chat.html`：保留的独立聊天工具。加载时不请求模型服务；只有使用者填写自己的接口配置并发送请求时才连接所选API。它不属于博客播放器或共享后端。

纸页与博客是不同的页面壳，进入博客会完整加载；博客内部仍使用Swup导航。博客的“主页”和标题链接返回 `/blog/`，不会把入口纸页插入博客布局。

## 旧链接兼容

| 原路径 | 目标 |
| --- | --- |
| `/pages/blog.html` | `/blog/` |
| `/pages/posts.html` | `/archive/` |
| `/pages/about.html` | `/about-me/` |
| `/pages/projects.html` | `/archive/?category=项目` |
| `/pages/archive.html`、`/pages/tags.html`、`/pages/categories.html` | `/archive/` |
| `/pages/games.html`、`/pages/acg.html` | `/games/` |
| `/pages/links.html` | `/friends/` |
| `/pages/post.html?id=…`（1、2、5、6、7、8） | 对应的六篇保留文章 |
| `/pages/learning.html?id=24` | `/posts/muyuan-java-interview/` |

旧地址使用静态兼容页衔接，保留传入的查询参数和片段。入口原有按钮、纸页、GitHub链接与终端命令不需要依赖旧文章集合。服务中的绝对站内地址继续使用 `https://yzh1019.top`；在本地预览中点击它会访问该域名，而不是自动改到localhost。

## 资源与音乐

纸页依赖 `public/css/landing.css`、`public/js/landing.js`、`public/assets/landing/`、`public/assets/data/landing-lines.json` 和入口头像/图标。纸页音乐使用 `public/assets/audio/bg.mp3`；与原配本地音频字节一致，没有新增歌曲。钢琴按钮和纸页音乐按钮共用这一个音频，隐藏终端也不再加载在线音乐播放器。

进入博客后使用独立的五首本地歌单；离开纸页会暂停纸页音频，避免两套播放器同时播放。聊天工具的接口配置与音乐无关，不要将私人API密钥写入仓库。

## 域名与部署准备

`src/config/siteConfig.ts` 的 `siteURL` 已设为 `https://yzh1019.top/`，供订阅、站点地图和页面元数据使用。`public/CNAME` 保存域名，构建复制到 `dist/CNAME`。

这些只是源码配置，不会自动改DNS、重定向域名、上传GitHub或删除线上文件。迁移上线前先备份原仓库和部署分支，确认GitHub Pages发布来源、当前DNS记录以及是否需要HTTP重定向；自定义域名的DNS指向与网页URL重定向不是同一件事。完成后需验证根入口、`/blog/`、旧地址和静态资源的实际公网访问。
