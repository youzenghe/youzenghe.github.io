# 页面切换与 CSS 层级

## 为什么需要固定层级

此站使用 Astro/Svelte 生成样式和 Swup 替换页面内容。不同页面的组件样式可能被打包为不同的内联块；Swup合并head时会保留相同的样式节点并插入新节点，不保证最终节点顺序与完整加载目标HTML一致。

CSS层的优先级取决于第一次声明的顺序。若组件块先声明 `utilities`，后加载的全局样式再声明 `base`，基础重置可能获得更高优先级，把标题字号、导航padding、卡片内边距覆盖掉。全部CSS响应成功也可能发生这个问题。

`Layout.astro` 在所有字体和页面样式之前固定：

```css
@layer properties, theme, base, components, utilities;
```

这个声明是相同的静态节点，不随组件或路由变化。页面块继续正常拆分与切换，`base` 始终低于 `components` 和 `utilities`。不要把此声明移到某个页面或某个后加载的CSS文件中。

## 回归检查

公共布局必须显式导入 `variables.styl`，Markdown组件必须显式导入 `markdown.css` 和 `markdown-extend.styl`。不要依赖加密文章、某个首页组件或浏览器此前访问过的页面来间接加载这些样式：关于、归档等独立入口也要完整。

- `pnpm test`包含文档入口和层级顺序检查。
- 构建后运行 `pnpm check:styles`，核对每个博客布局HTML的主题变量和其使用的Markdown、GitHub卡片样式。纸页入口、独立工具、重定向片段和Live2D宿主不使用博客布局，明确列为范围外，不冒充博客页面检查。
- `tests/browser/navigation-style-parity.js`比较5类页面在5种宽度下的直接加载、真实站内导航和历史返回，禁用HTTP缓存并延迟CSS响应；同时检查颜色、圆角与GitHub卡片布局是否实际生效，避免两个加载方式都缺样式而误判通过。

该检查比较关键计算样式、水平几何及主要内容尺寸，不将整个文档/网格高度要求为相等：持久侧栏状态和懒加载媒体会影响总高度，与CSS层级错误不同。

在已运行的本地静态预览上，使用已安装的Playwright CLI：

```bash
playwright-cli -s=style-check open http://localhost:4322/
playwright-cli -s=style-check run-code --filename tests/browser/navigation-style-parity.js
playwright-cli -s=style-check close
```

这个浏览器检查以打开页面的origin为范围，不依赖本机固定绝对路径。检查结束会销毁自己的CDP会话；浏览器关闭由调用者执行。
