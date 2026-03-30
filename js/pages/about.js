window.SiteApp.registerPage('about', () => {
  const skills = document.getElementById('skills-list');
  const friendLinksContainer = document.getElementById('friend-links-list');
  const friendLinks = window.SITE_DATA?.friendLinks || [];

  if (friendLinksContainer) {
    friendLinksContainer.innerHTML = friendLinks.map((item) => `
      <a class="friend-link-card" href="${item.url}" target="_blank" rel="noreferrer">
        <div class="friend-link-main">
          <div class="friend-link-name">${item.name}</div>
          <div class="friend-link-url">${item.displayUrl || item.url.replace(/^https?:\/\//, '')}</div>
        </div>
        <span class="friend-link-badge">${item.badge || 'Friend Link'}</span>
      </a>
    `).join('');
  }

  if (!skills) {
    initReveal();
    return null;
  }

  const skillObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.querySelectorAll('.skill-fill').forEach((bar) => {
        bar.style.transform = `scaleX(${bar.dataset.width})`;
      });
      skillObserver.unobserve(entry.target);
    });
  }, { threshold: 0.3 });

  skillObserver.observe(skills);
  initReveal();

  return () => {
    skillObserver.disconnect();
  };
});
