const NAV_LINKS = [
  { href: 'index.html',           icon: 'home',          label: 'Home' },
  { href: 'life-audit.html',      icon: 'user',          label: 'Profile' },
  { href: 'deep-profile.html',    icon: 'brain',         label: 'Deep Profile' },
  { href: 'goals.html',           icon: 'target',        label: 'Goals' },
  { href: 'dashboard.html',       icon: 'bar-chart-2',   label: 'Dashboard' },
  { href: 'calendar.html',        icon: 'calendar',      label: 'Calendar' },
  { href: 'timeline.html',        icon: 'clock',         label: 'Timeline' },
  { href: 'achievements.html',    icon: 'trophy',        label: 'Achievements' },
  { href: 'recommendations.html', icon: 'lightbulb',     label: 'Recommendations' },
  { href: 'export.html',          icon: 'file-text',     label: 'Export' },
];

function loadLucide(callback) {
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/lucide@latest/dist/umd/lucide.min.js';
  script.onload = callback;
  document.head.appendChild(script);
}

function injectNav() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  const nav = document.createElement('nav');
  nav.className = 'global-nav';

  nav.innerHTML = `
    <div class="global-nav-inner">
      ${NAV_LINKS.map(link => `
        <a href="${link.href}"
           class="global-nav-link ${currentPage === link.href ? 'active' : ''}">
          <i data-lucide="${link.icon}" class="nav-icon"></i>
          <span class="nav-label">${link.label}</span>
        </a>
      `).join('')}
    </div>
  `;

  document.body.insertBefore(nav, document.body.firstChild);

  lucide.createIcons();
}

document.addEventListener('DOMContentLoaded', function() {
  loadLucide(injectNav);
});