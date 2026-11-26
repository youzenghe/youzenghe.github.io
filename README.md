# 次元日记

基于站主公开仓库 [aicorein/astro-blog](https://github.com/aicorein/astro-blog) 的固定提交 `ce80e692bff14ce04a68d2aa2e492f2a385def68`，保留 Astro、Svelte、Swup 和 Mizuki 的页面结构，并修正布局、导航和交互问题。原站：<https://miku.top/>；主题上游：[LyraVoid/Mizuki](https://github.com/LyraVoid/Mizuki)。

本站是 AAA乔瓮批发宝哥的个人博客，使用本地文章和媒体构建，运行时不需要应用后端。

## 直接预览

本地交付目录包含已经构建的 `dist/`；从 GitHub 下载源码后，需要先按下一节构建。安装 Node.js 22.12 或更新版本后：

```bash
node scripts/preview-static.mjs
```

打开 <http://localhost:4322/> 查看「小识书桌」，博客位于 <http://localhost:4322/blog/>。Windows 也可双击 `Start-Preview.cmd`。预览不需要安装项目依赖，不运行内容同步、发布或第三方数据更新。服务器默认仅监听本机，按 Ctrl+C 停止。

## 开发与重新构建

Node.js >=22.12，pnpm 版本由 `package.json` 声明。新装环境使用：

```bash
pnpm install --frozen-lockfile
pnpm dev:local
```

生产构建和检查：

```bash
pnpm test
pnpm exec astro check
pnpm build:local
pnpm check:links
pnpm check:resources
pnpm preview:static
```

测试使用独立临时数据，不依赖已有构建产物。`build:local` 会生成 Pagefind 搜索索引；开发服务器不能替代生产搜索索引验证。

`dev` / `build` 与 `*:local` 都只处理本地内容。原内容同步、番剧接口更新和索引提交脚本已移除；构建不会从远端同步文章。依赖安装仍需要包管理器网络，网站上线运行不需要应用后端。

## 内容与配置

- `src/config/`：导航、主题、侧栏和本地音乐配置。
- `src/config/sidebarTags.ts`：侧栏快捷标签及显示顺序；不改变文章自己的标签。
- `src/content/posts/`：文章源文件。
- `src/content/archived-projects/`：仅在归档列出的项目记录，不进入首页文章列表。
- `src/data/games.ts`：游戏名称、封面与可选跳转地址；维护说明见 [GAMES.md](GAMES.md)。
- `src/content/spec/`：关于页等内容。
- `src/data/friends.ts`：友链数据。
- `src/data/friend-contact.ts`：交换友链的邮箱和网页联系入口。
- `src/components/` / `src/styles/`：页面组件和样式。
- `tests/`：回归测试。
- [REPAIR-NOTES.md](REPAIR-NOTES.md)：修复分类、验证范围和剩余限制。
- [STYLE-NAVIGATION.md](STYLE-NAVIGATION.md)：CSS层级与站内导航样式回归检查。
- [CONTENT.md](CONTENT.md)：文章头部、正文图片和内容索引维护。
- [DEPLOYMENT.md](DEPLOYMENT.md)：GitHub Actions 发布、Cloudflare 域名连接、抓取规则与旧地址兼容。

## 纯前端功能边界

根路径 `/` 为纸页入口，博客首页位于 `/blog/`；旧 `/pages/blog.html` 有兼容跳转。入口依赖、音乐、辅助工具和 `yzh1019.top` 部署准备见 [ENTRY.md](ENTRY.md)。

- 已移除在线评论、访客/访问统计、在线歌单接口、实时仓库API和图片代理。保留文章数、字数、分类/标签数；“最新文章”显示内容中的最新发布日期，不代表登录或访客活动。没有可核实的建站日期，因此不显示运行天数。
- 音乐文件在 `public/assets/music/`。构建时读取音频标题元数据，缺失时采用文件名；`src/data/music-library.json` 可设置顺序和标题覆盖。播放器封面统一采用个人资料头像，详细维护方法见 [MEDIA.md](MEDIA.md)。
- 仓库星数、fork数和介绍来自 `src/data/repository-snapshots.json` 的2026-11-22快照。页面明确标注日期，不代表实时数值。
- 背景、文章封面、相册、友链头像和图标只使用本站资源。失效头像使用本地占位。新增内容不要引用外部图片/脚本/字体。
- 导航背景按PC/手机图片池随机切换，仅加载选中的WebP，连续不重复且没有定时轮播；维护说明见 [MEDIA.md](MEDIA.md)。
- 图标使用选定的本地SVG数据；Mermaid图表库由已安装包复制到静态资源目录，不访问CDN。
- Pagefind和日历只读取本站静态文件，浏览器保存主题/音量等个人偏好；这些数据不在用户之间共享。
- 日历的当天高亮采用访客设备的本地日期，打开页面、切回页面和每分钟检查时更新；跟随当天浏览时跨月、跨年自动切换，手动选择的历史月份或日期保持不变。文章标记来自构建生成的静态JSON，修改文章后需重新构建。
- 页面内容安全策略限制资源和连接为本站来源。普通外链仍可由访客主动点击打开，这不属于运行时数据接口。
- 保留的独立聊天工具 `/games/chat.html` 是例外：只有使用者配置自己的接口并主动发送时才请求所选API，不提供本站后端，也不使用仓库预设密钥。

验证命令：`pnpm check:resources` 检查生成HTML/CSS外部资源，`pnpm check:links` 检查本地目标，`pnpm check:styles` 检查各页面必需的公共样式。浏览器网络验证结果保存在 `verification/static-only-summary.json`。本地音乐仍受浏览器自动播放限制，应由用户点击播放。

## 授权边界

保留原代码许可证。个人文章、第三方图片和音乐不自动适用代码许可证；复用这些内容前需分别确认授权。中文字体采用 [LXGW WenKai](https://github.com/lxgw/LxgwWenKai) v1.530，按 SIL OFL 1.1 使用；Zen Maru Gothic 也使用 SIL OFL，许可证在 `src/assets/fonts/licenses/`。JetBrains Mono 来自对应 Fontsource 包。原先授权未确认的 `loli` 字体不随本站发布。
