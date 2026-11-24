async(page) => {
  const origin = new URL(page.url()).origin;
  const blogHome = '/blog/';
  if (!/^https?:$/.test(new URL(origin).protocol)) throw new Error('Open the local HTTP preview before running this check');
  const metadataResponse = await page.request.get(`${origin}/api/allPostMeta.json`);
  if (!metadataResponse.ok()) throw new Error('Static post metadata is unavailable');
  const posts = await metadataResponse.json();
  const firstPost = posts[0];
  const articlePath = firstPost ? `/posts/${firstPost.id.replace(/\.(md|mdx)$/, '')}/` : null;
  const paths = ['/about/', '/archive/', '/albums/', '/friends/', ...(articlePath ? [articlePath] : [])];
  const snapshots = [];
  const differences = [];
  const errors = [];
  const outside = [];
  const cssFailures = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (!request.url().startsWith(origin+'/')) outside.push(request.url()); });
  page.on('response', response => { if (response.url().includes('.css') && response.status() >= 400) cssFailures.push({url:response.url(),status:response.status()}); });
  const session = await page.context().newCDPSession(page);
  await session.send('Network.enable');
  await session.send('Network.setCacheDisabled',{cacheDisabled:true});
  await page.context().route('**/*.css', async route => { await new Promise(resolve=>setTimeout(resolve,160)); await route.continue(); });
  const capture = async() => page.evaluate(async()=>{
    await document.fonts.ready;
    const rootStyle = getComputedStyle(document.documentElement);
    const card = document.querySelector('#content-wrapper .card-base');
    const github = document.querySelector('.card-github');
    const titlebar = document.querySelector('.gc-titlebar');
    const health = {
      radius: rootStyle.getPropertyValue('--radius-large').trim(),
      primary: rootStyle.getPropertyValue('--primary').trim(),
      cardRadius: card ? getComputedStyle(card).borderRadius : null,
      cardBackground: card ? getComputedStyle(card).backgroundColor : null,
      githubRadius: github ? getComputedStyle(github).borderRadius : null,
      githubTitleDisplay: titlebar ? getComputedStyle(titlebar).display : null,
    };
    if (!health.radius || !health.primary || (card && (parseFloat(health.cardRadius) <= 0 || health.cardBackground === 'rgba(0, 0, 0, 0)')) || (github && (parseFloat(health.githubRadius) <= 0 || health.githubTitleDisplay !== 'flex'))) {
      throw new Error(`Shared stylesheet missing on ${location.pathname}: ${JSON.stringify(health)}`);
    }
    const samples={};
    const fields=['fontSize','lineHeight','fontWeight','padding','margin','gap','display','gridTemplateColumns','width'];
    for (const [name,selector] of Object.entries({root:'html',grid:'#main-grid',nav:'#navbar-links-container > [data-dropdown] > a',card:'#content-wrapper .card-base',h1:'#content-wrapper h1',h2:'#content-wrapper h2',prose:'.custom-md',stats:'widget-layout[data-id="site-stats"] .collapse-wrapper'})){
      const element=document.querySelector(selector);if(!element){samples[name]=null;continue;}
        const style=getComputedStyle(element);samples[name]=Object.fromEntries(fields.map(name=>[name,style[name]]));
        const rect=element.getBoundingClientRect();
        samples[name].rect={x:rect.x,width:rect.width};
        // Total grid height also includes retained sidebar state and lazy media.
        if (!['root','grid'].includes(name)) samples[name].rect.height=rect.height;
    }
    return {samples,health,marker:window.__cssParityMarker??null,path:location.pathname,layerDeclaration:document.querySelector('style[data-css-layer-order]')?.textContent.trim(),overflow:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth)};
  });
  const waitVisit = async(path,click) => {
    await page.evaluate(()=>{
      window.__lastStyleVisit=null;
      window.swup.hooks.once('visit:end',()=>window.__lastStyleVisit=location.pathname);
    });
    if(click)await click();
    else await page.evaluate(path=>{window.swup.navigate(path);},path);
    await page.waitForFunction(path=>window.__lastStyleVisit===path,path,{timeout:15000});
    await page.waitForTimeout(750);
  };
  for(const width of [375,768,1280,1440,1920]){
    await page.setViewportSize({width,height:1000});
    const direct={};
    for(const path of paths){
      await page.goto(origin+path);await page.waitForTimeout(800);direct[path]=await capture();
    }
    await page.goto(origin+blogHome);await page.waitForTimeout(800);
    await page.evaluate(()=>window.__cssParityMarker='same-document');
    for(const path of paths){
      const click=path==='/about/' ? async()=>{
        if(width>=1280){await page.locator('#navbar-links-container > [data-dropdown] > button').filter({hasText:'关于'}).hover();await page.locator('#navbar-links-container a[href="/about/"]').click();}
        else {await page.locator('#nav-menu-switch').click();await page.locator('#nav-menu-panel [data-mobile-dropdown-trigger]').filter({hasText:'关于'}).click();await page.locator('#nav-menu-panel a[href="/about/"]').click();}
      }:null;
      await waitVisit(path,click);
      const actual=await capture();snapshots.push({mode:'navigate',width,path,direct:direct[path],actual});
      if(JSON.stringify(actual.samples)!==JSON.stringify(direct[path].samples))differences.push({mode:'navigate',width,path,expected:direct[path].samples,actual:actual.samples});
      if(actual.marker!=='same-document')differences.push({mode:'navigation-reloaded',width,path});
      if(actual.overflow)differences.push({mode:'overflow',width,path,overflow:actual.overflow});
    }
    for(const path of ['/friends/','/albums/','/archive/','/about/']){
      await page.goBack();await page.waitForURL('**'+path);await page.waitForTimeout(850);
      const actual=await capture();snapshots.push({mode:'history',width,path,direct:direct[path],actual});
      if(JSON.stringify(actual.samples)!==JSON.stringify(direct[path].samples))differences.push({mode:'history',width,path,expected:direct[path].samples,actual:actual.samples});
      if(actual.marker!=='same-document')differences.push({mode:'history-reloaded',width,path});
      if(actual.overflow)differences.push({mode:'history-overflow',width,path,overflow:actual.overflow});
    }

  }
  await session.detach();
  const result = { cases: snapshots.length, differences, errors, outside, cssFailures, cacheDisabled: true, stylesheetDelayMs: 160 };
  if (differences.length || errors.length || outside.length || cssFailures.length) {
    throw new Error(`Navigation stylesheet regression: ${JSON.stringify(result)}`);
  }
  return result;
}
