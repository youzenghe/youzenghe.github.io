window.SITE_HEALTH_REPORT = {
  "generatedAt": "2026-06-07T00:18:58.748Z",
  "status": "warning",
  "summary": {
    "pass": 8,
    "warn": 1,
    "fail": 0
  },
  "checks": [
    {
      "id": "data-split",
      "label": "数据拆分规则",
      "status": "pass",
      "durationMs": 71,
      "detail": "data_split_ok legacy=814741 core=41776 learning=2993"
    },
    {
      "id": "video-background",
      "label": "视频背景规则",
      "status": "pass",
      "durationMs": 44,
      "detail": "video_background_rules_ok"
    },
    {
      "id": "lazy-card-media",
      "label": "卡片媒体懒加载",
      "status": "pass",
      "durationMs": 40,
      "detail": "lazy_card_media_ok"
    },
    {
      "id": "site-search",
      "label": "站内搜索覆盖",
      "status": "pass",
      "durationMs": 36,
      "detail": "site_search_ok"
    },
    {
      "id": "page-metadata",
      "label": "页面元信息",
      "status": "pass",
      "detail": "7 个关键页面具备基础 SEO 元信息"
    },
    {
      "id": "publishing-files",
      "label": "发布基础文件",
      "status": "pass",
      "detail": "CNAME、robots、RSS、sitemap 和 favicon 都存在"
    },
    {
      "id": "data-assets",
      "label": "内容资源引用",
      "status": "pass",
      "detail": "37 个核心内容资源引用可访问"
    },
    {
      "id": "asset-weight",
      "label": "大资源体积",
      "status": "warn",
      "detail": "2 个资源超过 2MB，建议持续观察"
    },
    {
      "id": "background-pool",
      "label": "背景池完整性",
      "status": "pass",
      "detail": "PC 背景池：120 个 WebM，120 张 WebP 海报"
    }
  ],
  "metrics": {
    "posts": 8,
    "projects": 8,
    "learningPlans": 21,
    "pages": 19,
    "coreDataBytes": 41776,
    "legacyDataBytes": 814741,
    "postDataBytes": 11696,
    "learningDataBytes": 2993,
    "totalAssetBytes": 48932077,
    "rssBytes": 21808,
    "sitemapBytes": 4213,
    "pcVideoCount": 120,
    "pcPosterCount": 120
  },
  "issues": [
    {
      "severity": "medium",
      "title": "大资源体积",
      "detail": "2 个资源超过 2MB，建议持续观察"
    }
  ],
  "recommendations": [
    "持续关注大体积媒体，新增图片或视频优先压缩为 WebP/WebM，并避免首屏同步加载。",
    "每次大改导航、搜索、背景池或内容生成流程后，重新跑一遍站点健康巡检。",
    "发布前保留一次静态构建验证，防止打包遗漏脚本或资源。"
  ]
};
