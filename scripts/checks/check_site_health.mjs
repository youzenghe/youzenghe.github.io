import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const outFile = path.join(root, 'js/data-site-health.js');
const largeAssetLimit = 4 * 1024 * 1024;
const warningAssetLimit = 2 * 1024 * 1024;

function fromRoot(...parts) {
  return path.join(root, ...parts);
}

function read(relativePath) {
  return readFileSync(fromRoot(relativePath), 'utf8');
}

function fileSize(relativePath) {
  return statSync(fromRoot(relativePath)).size;
}

function walkFiles(dir, prefix = dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkFiles(fullPath, prefix);
    return [path.relative(prefix, fullPath)];
  });
}

function runNodeCheck(id, label, script) {
  const started = Date.now();
  const result = spawnSync(process.execPath, [script], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const output = `${result.stdout || ''}${result.stderr || ''}`.trim();

  return {
    id,
    label,
    status: result.status === 0 ? 'pass' : 'fail',
    durationMs: Date.now() - started,
    detail: output.split('\n').slice(-3).join(' / ') || '检查完成',
  };
}

function pageMetaCheck() {
  const pages = [
    'pages/blog.html',
    'pages/posts.html',
    'pages/learning.html',
    'pages/projects.html',
    'pages/changelog.html',
    'pages/site-health.html',
    'pages/about.html',
  ];
  const missing = [];

  pages.forEach((page) => {
    if (!existsSync(fromRoot(page))) {
      missing.push(`${page}: file missing`);
      return;
    }
    const html = read(page);
    if (!/<title>[^<]+<\/title>/i.test(html)) missing.push(`${page}: title missing`);
    if (!/<meta\s+name=["']description["']/i.test(html)) missing.push(`${page}: description missing`);
    if (!/<link\s+rel=["']canonical["']/i.test(html)) missing.push(`${page}: canonical missing`);
    if (!/<meta\s+property=["']og:title["']/i.test(html)) missing.push(`${page}: og:title missing`);
  });

  return {
    id: 'page-metadata',
    label: '页面元信息',
    status: missing.length ? 'fail' : 'pass',
    detail: missing.length ? missing.join('；') : `${pages.length} 个关键页面具备基础 SEO 元信息`,
  };
}

function requiredFileCheck() {
  const required = ['CNAME', '.nojekyll', 'robots.txt', 'rss.xml', 'sitemap.xml', 'assets/favicon.png'];
  const missing = required.filter((file) => !existsSync(fromRoot(file)));
  return {
    id: 'publishing-files',
    label: '发布基础文件',
    status: missing.length ? 'fail' : 'pass',
    detail: missing.length ? `缺少 ${missing.join(', ')}` : 'CNAME、robots、RSS、sitemap 和 favicon 都存在',
  };
}

function loadCoreData() {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(`${read('js/data-core.js')}\nglobalThis.__data = { POSTS, PROJECTS, LEARNING_PLANS };`, context);
  return context.__data;
}

function resolveDataAsset(assetPath) {
  if (!assetPath || /^https?:\/\//i.test(assetPath)) return null;
  return path.normalize(assetPath.replace(/^\.\.\//, ''));
}

function dataAssetCheck(data) {
  const refs = [
    ...data.POSTS.flatMap((post) => [post.cover, post.thumb]),
    ...data.PROJECTS.flatMap((project) => [project.img]),
    ...data.LEARNING_PLANS.flatMap((plan) => [plan.cover]),
  ].map(resolveDataAsset).filter(Boolean);
  const missing = refs.filter((asset) => !existsSync(fromRoot(asset)));

  return {
    id: 'data-assets',
    label: '内容资源引用',
    status: missing.length ? 'fail' : 'pass',
    detail: missing.length ? `缺失 ${missing.slice(0, 6).join(', ')}` : `${refs.length} 个核心内容资源引用可访问`,
  };
}

function collectAssetMetrics() {
  const files = walkFiles(fromRoot('assets'))
    .filter((relative) => !relative.split(path.sep).some((part) => part.startsWith('__')))
    .map((relative) => {
      const absolute = fromRoot('assets', relative);
      return {
        path: `assets/${relative.split(path.sep).join('/')}`,
        bytes: statSync(absolute).size,
      };
    });
  const total = files.reduce((sum, file) => sum + file.bytes, 0);
  const largest = [...files].sort((a, b) => b.bytes - a.bytes).slice(0, 8);
  const oversized = files.filter((file) => file.bytes >= largeAssetLimit);
  const warnings = files.filter((file) => file.bytes >= warningAssetLimit && file.bytes < largeAssetLimit);

  return { files, total, largest, oversized, warnings };
}

function assetWeightCheck(assetMetrics) {
  if (assetMetrics.oversized.length) {
    return {
      id: 'asset-weight',
      label: '大资源体积',
      status: 'fail',
      detail: `${assetMetrics.oversized.length} 个资源超过 4MB：${assetMetrics.oversized.slice(0, 4).map((file) => file.path).join(', ')}`,
    };
  }
  if (assetMetrics.warnings.length) {
    return {
      id: 'asset-weight',
      label: '大资源体积',
      status: 'warn',
      detail: `${assetMetrics.warnings.length} 个资源超过 2MB，建议持续观察`,
    };
  }
  return {
    id: 'asset-weight',
    label: '大资源体积',
    status: 'pass',
    detail: '未发现超过 2MB 的单体资源',
  };
}

function backgroundPoolCheck() {
  const dir = fromRoot('assets/bg-pool/pc-video');
  if (!existsSync(dir)) {
    return {
      id: 'background-pool',
      label: '背景池完整性',
      status: 'fail',
      detail: '缺少 assets/bg-pool/pc-video',
    };
  }
  const files = readdirSync(dir);
  const webm = files.filter((file) => /^bg\d+\.webm$/.test(file)).length;
  const poster = files.filter((file) => /^bg\d+\.webp$/.test(file)).length;
  return {
    id: 'background-pool',
    label: '背景池完整性',
    status: webm === 120 && poster === 120 ? 'pass' : 'fail',
    detail: `PC 背景池：${webm} 个 WebM，${poster} 张 WebP 海报`,
  };
}

function buildMetrics(data, assetMetrics) {
  const pcVideoDir = fromRoot('assets/bg-pool/pc-video');
  const bgFiles = existsSync(pcVideoDir) ? readdirSync(pcVideoDir) : [];
  return {
    posts: data.POSTS.length,
    projects: data.PROJECTS.length,
    learningPlans: data.LEARNING_PLANS.length,
    pages: walkFiles(fromRoot('pages')).filter((file) => file.endsWith('.html')).length + 1,
    coreDataBytes: fileSize('js/data-core.js'),
    legacyDataBytes: fileSize('js/data.js'),
    postDataBytes: fileSize('js/data-posts.js'),
    learningDataBytes: fileSize('js/data-learning.js'),
    totalAssetBytes: assetMetrics.total,
    rssBytes: fileSize('rss.xml'),
    sitemapBytes: fileSize('sitemap.xml'),
    pcVideoCount: bgFiles.filter((file) => /^bg\d+\.webm$/.test(file)).length,
    pcPosterCount: bgFiles.filter((file) => /^bg\d+\.webp$/.test(file)).length,
    largestAssets: assetMetrics.largest,
  };
}

function statusOf(checks) {
  if (checks.some((check) => check.status === 'fail')) return 'error';
  if (checks.some((check) => check.status === 'warn')) return 'warning';
  return 'healthy';
}

function buildIssues(checks) {
  return checks
    .filter((check) => check.status !== 'pass')
    .map((check) => ({
      severity: check.status === 'fail' ? 'high' : 'medium',
      title: check.label,
      detail: check.detail,
    }));
}

function buildRecommendations(reportStatus, assetMetrics) {
  const recommendations = [];
  if (reportStatus === 'healthy') {
    recommendations.push('当前质量门全部通过，下一步重点放在内容结构和发布前复查即可。');
  }
  if (assetMetrics.warnings.length || assetMetrics.oversized.length) {
    recommendations.push('持续关注大体积媒体，新增图片或视频优先压缩为 WebP/WebM，并避免首屏同步加载。');
  }
  recommendations.push('每次大改导航、搜索、背景池或内容生成脚本后，运行 npm run check:site-health。');
  recommendations.push('发布前保留一次 node scripts/build_dist.mjs 构建验证，防止静态打包遗漏脚本。');
  return recommendations;
}

const data = loadCoreData();
const assetMetrics = collectAssetMetrics();
const checks = [
  runNodeCheck('data-split', '数据拆分规则', 'scripts/checks/check_data_split.mjs'),
  runNodeCheck('video-background', '视频背景规则', 'scripts/checks/check_video_background.mjs'),
  runNodeCheck('lazy-card-media', '卡片媒体懒加载', 'scripts/checks/check_lazy_card_media.mjs'),
  runNodeCheck('site-search', '站内搜索覆盖', 'scripts/checks/check_site_search.mjs'),
  pageMetaCheck(),
  requiredFileCheck(),
  dataAssetCheck(data),
  assetWeightCheck(assetMetrics),
  backgroundPoolCheck(),
];
const status = statusOf(checks);
const report = {
  generatedAt: new Date().toISOString(),
  status,
  summary: {
    pass: checks.filter((check) => check.status === 'pass').length,
    warn: checks.filter((check) => check.status === 'warn').length,
    fail: checks.filter((check) => check.status === 'fail').length,
  },
  checks,
  metrics: buildMetrics(data, assetMetrics),
  issues: buildIssues(checks),
  recommendations: buildRecommendations(status, assetMetrics),
};

writeFileSync(outFile, `window.SITE_HEALTH_REPORT = ${JSON.stringify(report, null, 2)};\n`, 'utf8');
console.log(`site_health_${status} checks=${checks.length} output=js/data-site-health.js`);

if (status === 'error') {
  process.exit(1);
}
