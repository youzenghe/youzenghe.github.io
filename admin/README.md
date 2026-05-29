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

文章正文使用 Markdown 源码模式，后台仍然支持直接插入图片或 GIF：点击编辑器工具栏里的 `+`，选择 `IMAGE`，再上传或选择图片即可。Decap 会自动插入类似下面的 Markdown 内容：

```md
![说明](/assets/uploads/cmd-bg.jpg)
```

不要切回富文本图片组件；Decap 的富文本图片块在当前站点路径下容易显示破损占位符，但 Markdown 源码发布到前台是稳定的。
