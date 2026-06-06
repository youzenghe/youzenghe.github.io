window.SITE_HEALTH_REPORT = {
  "generatedAt": "2026-06-06T22:41:54.327Z",
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
      "durationMs": 68,
      "detail": "data_split_ok legacy=810840 core=41099"
    },
    {
      "id": "video-background",
      "label": "视频背景规则",
      "status": "pass",
      "durationMs": 41,
      "detail": "video_background_rules_ok"
    },
    {
      "id": "lazy-card-media",
      "label": "卡片媒体懒加载",
      "status": "pass",
      "durationMs": 34,
      "detail": "lazy_card_media_ok"
    },
    {
      "id": "site-search",
      "label": "站内搜索覆盖",
      "status": "pass",
      "durationMs": 32,
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
      "detail": "36 个核心内容资源引用可访问"
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
    "posts": 7,
    "projects": 8,
    "learningPlans": 21,
    "pages": 19,
    "coreDataBytes": 41099,
    "legacyDataBytes": 810840,
    "postDataBytes": 8470,
    "learningDataBytes": 760358,
    "totalAssetBytes": 48786929,
    "rssBytes": 21311,
    "sitemapBytes": 4140,
    "pcVideoCount": 120,
    "pcPosterCount": 120,
    "largestAssets": [
      {
        "path": "assets/audio/bg.mp3",
        "bytes": 2528175
      },
      {
        "path": "assets/uploads/paste-20260530060511-kaqjhz.png",
        "bytes": 2381391
      },
      {
        "path": "assets/motion/projects/project-moment-henan.webp",
        "bytes": 875818
      },
      {
        "path": "assets/bg-pool/pc-video/bg31.webm",
        "bytes": 648275
      },
      {
        "path": "assets/bg-pool/pc-video/bg66.webm",
        "bytes": 571851
      },
      {
        "path": "assets/bg-pool/pc-video/bg32.webm",
        "bytes": 545494
      },
      {
        "path": "assets/motion/projects/project-law-contract.webp",
        "bytes": 515978
      },
      {
        "path": "assets/bg-pool/pc-video/bg26.webm",
        "bytes": 514748
      }
    ]
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
    "每次大改导航、搜索、背景池或内容生成脚本后，运行 npm run check:site-health。",
    "发布前保留一次 node scripts/build_dist.mjs 构建验证，防止静态打包遗漏脚本。"
  ]
};
