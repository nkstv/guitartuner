(() => {
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.getElementById('mobile-site-menu');
  if (!header || !toggle || !menu) return;

  const openLabel = toggle.dataset.openLabel || 'Open menu';
  const closeLabel = toggle.dataset.closeLabel || 'Close menu';

  const closeMenu = () => {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', openLabel);
    menu.hidden = true;
    document.body.classList.remove('menu-open');
  };

  const openMenu = () => {
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', closeLabel);
    menu.hidden = false;
    document.body.classList.add('menu-open');
  };

  toggle.addEventListener('click', () => {
    toggle.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu();
  });

  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu();
  });
  document.addEventListener('click', event => {
    if (!header.contains(event.target) && toggle.getAttribute('aria-expanded') === 'true') closeMenu();
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 1080) closeMenu();
  });
})();
