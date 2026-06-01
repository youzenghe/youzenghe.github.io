window.SiteApp.registerPage('about', () => {
  const skills = document.getElementById('skills-list');

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
