window.SiteApp.registerPage('site-health', () => {
  const report = window.SITE_HEALTH_REPORT;
  const statusOrb = document.getElementById('health-status-orb');
  const statusLabel = document.getElementById('health-status-label');
  const statusSubtitle = document.getElementById('health-status-subtitle');
  const meta = document.getElementById('health-meta');
  const checks = document.getElementById('health-check-list');
  const metrics = document.getElementById('health-metrics');
  const recommendations = document.getElementById('health-recommendations');
  const largestAssets = document.getElementById('health-largest-assets');

  if (!statusOrb || !statusLabel || !statusSubtitle || !meta || !checks || !metrics || !recommendations || !largestAssets) return null;

  function html(text) {
    return escapeHtml(text ?? '');
  }

  function formatBytes(bytes) {
    const value = Number(bytes) || 0;
    if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(2)} MB`;
    if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${value} B`;
  }

  function formatDate(value) {
    if (!value) return '未知时间';
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }

  function statusText(status) {
    return {
      healthy: '健康',
      warning: '有警告',
      error: '需处理',
      pass: 'PASS',
      warn: 'WARN',
      fail: 'FAIL',
    }[status] || '未知';
  }

  if (!report) {
    statusOrb.dataset.status = 'error';
    statusLabel.textContent = '无报告';
    statusSubtitle.textContent = '请运行 npm run check:site-health';
    checks.innerHTML = '<div class="health-list-item">没有读取到巡检数据。</div>';
    return null;
  }

  statusOrb.dataset.status = report.status;
  statusLabel.textContent = statusText(report.status);
  statusSubtitle.textContent = `${report.summary.pass} 通过 · ${report.summary.warn} 警告 · ${report.summary.fail} 错误`;

  meta.innerHTML = `
    <span class="health-chip">生成时间：${html(formatDate(report.generatedAt))}</span>
    <span class="health-chip">检查项：${html(report.checks.length)}</span>
    <span class="health-chip">内容：${html(report.metrics.posts)} 篇文章 / ${html(report.metrics.learningPlans)} 份学习计划 / ${html(report.metrics.projects)} 个项目</span>
  `;

  checks.innerHTML = report.checks.map((check) => `
    <article class="health-check-card" data-status="${html(check.status)}">
      <span class="health-dot" aria-hidden="true"></span>
      <div>
        <div class="health-check-title">
          <span>${html(check.label)}</span>
          <span>${html(statusText(check.status))}${check.durationMs ? ` · ${html(check.durationMs)}ms` : ''}</span>
        </div>
        <div class="health-check-detail">${html(check.detail)}</div>
      </div>
    </article>
  `).join('');

  const metricItems = [
    ['核心数据', formatBytes(report.metrics.coreDataBytes)],
    ['文章详情数据', formatBytes(report.metrics.postDataBytes)],
    ['学习详情数据', formatBytes(report.metrics.learningDataBytes)],
    ['资源总量', formatBytes(report.metrics.totalAssetBytes)],
    ['PC 背景视频', `${report.metrics.pcVideoCount} 个`],
    ['站点地图', formatBytes(report.metrics.sitemapBytes)],
  ];

  metrics.innerHTML = metricItems.map(([label, value]) => `
    <div class="health-metric">
      <strong>${html(value)}</strong>
      <span>${html(label)}</span>
    </div>
  `).join('');

  recommendations.innerHTML = (report.recommendations || []).map((item) => `
    <div class="health-list-item">${html(item)}</div>
  `).join('');

  largestAssets.innerHTML = (report.metrics.largestAssets || []).slice(0, 5).map((asset) => `
    <div class="health-list-item">
      <strong>${html(formatBytes(asset.bytes))}</strong>
      ${html(asset.path)}
    </div>
  `).join('');

  initReveal();
  return null;
});
