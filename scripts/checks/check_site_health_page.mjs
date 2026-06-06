import { readFileSync } from 'node:fs';

const files = {
  packageJson: readFileSync('package.json', 'utf8'),
  healthPage: readFileSync('pages/site-health.html', 'utf8'),
  healthJs: readFileSync('js/pages/site-health.js', 'utf8'),
  healthData: readFileSync('js/data-site-health.js', 'utf8'),
  changelogPage: readFileSync('pages/changelog.html', 'utf8'),
  shell: readFileSync('js/site-shell.js', 'utf8'),
};

const errors = [];

if (!files.packageJson.includes('"check:site-health"')) {
  errors.push('package.json should expose npm run check:site-health');
}

if (!files.healthPage.includes('站点健康报告') || !files.healthPage.includes('../js/pages/site-health.js')) {
  errors.push('pages/site-health.html should render a site health report page');
}

if (!files.healthJs.includes('window.SiteApp.registerPage') || !files.healthJs.includes('site-health')) {
  errors.push('js/pages/site-health.js should register the site health page');
}

if (!files.healthPage.includes('../js/data-site-health.js')) {
  errors.push('pages/site-health.html should load the generated health data bundle');
}

if (!files.changelogPage.includes('site-health.html')) {
  errors.push('changelog page should link to the site health report');
}

if (files.shell.includes("key: 'site-health'") || files.shell.includes('site-health.html')) {
  errors.push('site health should stay out of the public main navigation');
}

const dataMatch = files.healthData.match(/window\.SITE_HEALTH_REPORT\s*=\s*(\{[\s\S]*\});?\s*$/);
if (!dataMatch) {
  errors.push('js/data-site-health.js should assign window.SITE_HEALTH_REPORT');
}

const report = dataMatch ? JSON.parse(dataMatch[1]) : {};
const requiredTopLevel = ['generatedAt', 'status', 'summary', 'checks', 'metrics', 'issues', 'recommendations'];
for (const key of requiredTopLevel) {
  if (!(key in report)) errors.push(`site health report missing ${key}`);
}

if (!Array.isArray(report.checks) || report.checks.length < 5) {
  errors.push('site health report should contain multiple quality checks');
}

if (!report.metrics || typeof report.metrics.coreDataBytes !== 'number' || typeof report.metrics.totalAssetBytes !== 'number') {
  errors.push('site health metrics should include coreDataBytes and totalAssetBytes');
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('site_health_page_ok');
