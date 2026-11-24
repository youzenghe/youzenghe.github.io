# GitHub Pages 部署

本站构建为静态文件，不需要运行后端。公开域名为 `https://yzh1019.top/`，输出目录为 `dist`。

## 构建与检查

使用 Node.js 22.12 或更高的 22.x 版本，以及 `package.json` 指定的 pnpm 版本：

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm check
pnpm build:local
pnpm check:links
pnpm check:resources
pnpm check:styles
```

`build:local` 会处理本地音乐、前端依赖和 Pagefind 搜索索引，生成 sitemap 和 RSS。不要把本机凭据、`.planning`、`.env`、`node_modules` 或旧站自动提交脚本上传到发布仓库。

## 发布来源

GitHub 仓库 Settings → Pages 的 Source 使用 **GitHub Actions**。

- `.github/workflows/deploy.yml`：推送 `main` 或手动启动后，检查、构建、上传 `dist`，然后发布 Pages artifact。
- `.github/workflows/lint.yml`：面向 `main` 的 pull request 与手动检查，只验证，不发布。
- 发布工作流使用 `pages: write` 与 `id-token: write`，不需要个人 Token，不会向 `pages` 分支提交文件。
- 部署环境为 `github-pages`；若环境限制可部署分支，需要允许 `main`。

仓库只保留一套发布工作流。替换原有站点时应移除旧的 npm/Python 发布配置，不能让它与新的 pnpm/Astro 构建同时发布。

## 域名与 Cloudflare

`public/CNAME` 保存 `yzh1019.top`。域名在 Cloudflare 托管、网站使用 GitHub Pages 时，只要仍使用同一个 Pages 仓库，通常不需要修改现有 DNS 记录。

上线后分别验证 HTTP 和 HTTPS。HTTPS 能打开不代表 HTTP 已经跳转 HTTPS；应在实际使用的 Pages/Cloudflare 层配置跳转，避免两层规则互相循环。若线上仍显示旧页面，先核对部署成功记录，再检查 Cloudflare 缓存。不要为处理网页缓存而改 nameserver 或删除域名记录。

## 地图与旧地址

- `/sitemap-index.xml`：当前地图入口。
- `/sitemap.xml`：保留的旧 XML 地图入口，指向同一内容地图 `/sitemap-0.xml`。
- `robots.txt` 允许公开内容，排除内部 API 与独立工具入口。兼容页使用 `noindex`，但不禁止抓取，方便搜索引擎发现迁移目标。地图仅列出当前可索引的规范页面，不列出关闭的主题页面、订阅展示页、工具页和兼容地址。
- `/rss.xml` 与 `/atom.xml` 保持订阅文件地址，内容来自当前文章集合。
- `/pages/blog.html` 等原首页入口，以及仍保留文章的旧数字 ID 地址，会转到当前页面。被移除的文章和项目 ID 使用 404，不会恢复旧内容。

兼容 ID 映射在 `src/utils/legacy-navigation.mjs`。GitHub Pages 没有任意服务端重写规则，这些旧 HTML 地址使用静态 JavaScript 跳转，不是 HTTP 301；禁用脚本时页面提供可用的继续链接。

## 发布后核验

检查根首页、`/blog/`、直接进入文章、手机导航、图片与音乐、旧地址跳转、`404.html`、RSS 和两种地图入口。刷新页面并测试浏览器后退，确认访问的确是最新发布产物。
