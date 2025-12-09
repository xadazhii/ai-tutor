"use strict";

component('header', (node, state) => {
  node.classList.add('app-header');

  createNode('img', node, img => {
    img.classList.add('burger-menu');
    img.setAttribute('src', 'img/burger.png');
    img.setAttribute('alt', 'Toggle sidebar');
    img.addEventListener("click", () => {
      select("side-bar").classList.toggle("active");
    });
  });

  const getCurrentTheme = () => document.body.classList.contains('dark-theme') ? 'dark' : 'light';

  createNode('button', node, button => {
    button.type = 'button';
    button.classList.add('theme-toggle');

    const renderButton = (theme) => {
      const normalized = theme === 'dark' ? 'dark' : 'light';
      const isDark = normalized === 'dark';
      const nextTheme = isDark ? 'light' : 'dark';

      button.innerHTML = '';

      const icon = document.createElement('span');
      icon.className = 'theme-toggle__icon';
      icon.textContent = isDark ? '🌙' : '☀️';
      button.appendChild(icon);

      const label = document.createElement('span');
      label.className = 'theme-toggle__label';
      label.textContent = isDark ? 'Dark' : 'Light';
      button.appendChild(label);

      const title = nextTheme === 'dark' ? 'Перемкнути на темну тему' : 'Перемкнути на світлу тему';
      button.setAttribute('aria-label', title);
      button.setAttribute('title', title);
      button.setAttribute('aria-pressed', isDark ? 'true' : 'false');
      button.dataset.theme = normalized;
    };

    renderButton(getCurrentTheme());

    button.addEventListener('click', () => {
      if (typeof window.toggleTheme === 'function') {
        window.toggleTheme();
      } else {
        const next = getCurrentTheme() === 'dark' ? 'light' : 'dark';
        document.body.classList.toggle('dark-theme', next === 'dark');
        document.body.classList.toggle('light-theme', next === 'light');
        document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: next } }));
      }
    });

    document.addEventListener('themechange', (event) => {
      const theme = event?.detail?.theme || getCurrentTheme();
      renderButton(theme);
    });
  });
});
