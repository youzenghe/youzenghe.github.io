# 管理后台说明

这个目录是 Decap CMS 后台入口，访问路径是：

```text
https://yzh1019.top/admin/
```

上线前必须确保 `admin/config.yml` 里的 OAuth 代理地址与 Cloudflare Worker 部署地址一致：

```yml
base_url: https://yzh-decap-auth.yzh1019.workers.dev
auth_endpoint: /auth
```

不要把 GitHub OAuth Client Secret、Personal Access Token 或任何密码写进前端仓库。

后台登录成功后，Decap CMS 会把内容提交到 GitHub 仓库。GitHub Actions 会运行：

```text
python scripts/build_content.py
```

然后把 `content/` 里的 Markdown / JSON 生成到 `js/data.js`，再部署到 GitHub Pages。

文章正文默认使用 Markdown 源码模式。复制图片后在正文里按 `Ctrl + V`，后台会自动上传到 `assets/uploads` 并插入类似下面的 Markdown 内容：

```md
![说明](/assets/uploads/cmd-bg.jpg)
```

也可以用工具栏 `+ -> IMAGE` 作为兜底。如果后台编辑区短暂显示图片占位符，不影响发布效果；前台会按 Markdown 图片语法正常渲染。
