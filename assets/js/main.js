

(() => {
  'use strict';

  if (window.__SALUD_AGROAMBIENTAL_MAIN__) {
    return;
  }

  window.__SALUD_AGROAMBIENTAL_MAIN__ = true;

  const root = document.documentElement;
  const STORAGE_KEY = 'sa-theme';

  const getTheme = () => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  };

  const saveTheme = (theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
    }
  };

  const applyTheme = (theme, save = false) => {

    const normalized =
      theme === 'dark'
        ? 'dark'
        : 'light';
    root.classList.add('theme-transition');
    window.setTimeout(() => root.classList.remove('theme-transition'), 380);

    root.setAttribute(
      'data-theme',
      normalized
    );

    if (save) {
      saveTheme(normalized);
    }

    const button =
      document.querySelector('.theme-toggle');

    if (button) {

      const dark =
        normalized === 'dark';

      button.setAttribute(
        'aria-pressed',
        String(dark)
      );

      button.setAttribute(
        'aria-label',
        dark
          ? 'Cambiar a modo claro'
          : 'Cambiar a modo oscuro'
      );

      button.setAttribute(
        'title',
        dark
          ? 'Cambiar a modo claro'
          : 'Cambiar a modo oscuro'
      );
    }

    const meta =
      document.querySelector(
        'meta[name="theme-color"]'
      );

    if (meta) {

      meta.setAttribute(
        'content',
        normalized === 'dark'
          ? '#0d1511'
          : '#183b2a'
      );
    }

  };

  const storedTheme = getTheme();

  if (
    storedTheme === 'dark' ||
    storedTheme === 'light'
  ) {

    applyTheme(
      storedTheme,
      false
    );

  } else {

    const prefersDark =
      window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;

    applyTheme(
      prefersDark
        ? 'dark'
        : 'light',
      false
    );
  }

  document.addEventListener(
    'click',
    (event) => {

      const button =
        event.target.closest(
          '.theme-toggle'
        );

      if (!button) {
        return;
      }

      event.preventDefault();

      const current =
        root.getAttribute(
          'data-theme'
        );

      const next =
        current === 'dark'
          ? 'light'
          : 'dark';

      applyTheme(
        next,
        true
      );
    }
  );

  const systemTheme =
    window.matchMedia(
      '(prefers-color-scheme: dark)'
    );

  const handleSystemTheme = (event) => {

    if (getTheme()) {
      return;
    }

    applyTheme(
      event.matches
        ? 'dark'
        : 'light',
      false
    );
  };

  if (systemTheme.addEventListener) {

    systemTheme.addEventListener(
      'change',
      handleSystemTheme
    );

  } else {

    systemTheme.addListener(
      handleSystemTheme
    );
  }

  const header =
    document.querySelector(
      '.site-header'
    );

  if (header) {

    const updateHeader = () => {

      header.classList.toggle(
        'scrolled',
        window.scrollY > 20
      );
    };

    window.addEventListener(
      'scroll',
      updateHeader,
      {
        passive: true
      }
    );

    updateHeader();
  }

  const navToggle =
    document.querySelector(
      '.nav-toggle'
    );

  const nav =
    document.querySelector(
      '.site-nav'
    );

  if (navToggle && nav) {

    const closeMenu = () => {

      navToggle.setAttribute(
        'aria-expanded',
        'false'
      );

      navToggle.setAttribute(
        'aria-label',
        'Abrir menú'
      );

      nav.classList.remove(
        'open'
      );

      document.body.classList.remove(
        'menu-open'
      );
    };

    navToggle.addEventListener(
      'click',
      () => {

        const expanded =
          navToggle.getAttribute(
            'aria-expanded'
          ) === 'true';

        navToggle.setAttribute(
          'aria-expanded',
          String(!expanded)
        );

        navToggle.setAttribute(
          'aria-label',
          expanded
            ? 'Abrir menú'
            : 'Cerrar menú'
        );

        nav.classList.toggle(
          'open',
          !expanded
        );

        document.body.classList.toggle(
          'menu-open',
          !expanded
        );
      }
    );

    nav.querySelectorAll('a').forEach(
      (link) => {

        link.addEventListener(
          'click',
          closeMenu
        );
      }
    );

    window.addEventListener(
      'resize',
      () => {

        if (
          window.innerWidth > 1050
        ) {
          closeMenu();
        }
      }
    );

    document.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape') {
          closeMenu();
        }
      }
    );
  }
  const setImageHints = () => {
    try {
      const imgs = document.querySelectorAll('.post-content img, .post-card img, .blog-entry-media img, .featured-post-media img');
      imgs.forEach(img => {
        if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
        if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
      });
    } catch (e) {
    }
  };
  setImageHints();

  const revealElements =
    document.querySelectorAll(
      [
        '.post-card',
        '.blog-entry',
        '.area-card',
        '.featured-post',
        '.intro-grid',
        '.section-heading',
        '.participate-box',
        '.page-hero-inner'
      ].join(', ')
    );

  if (
    !revealElements.length
  ) {
    return;
  }

  const reducedMotion =
    window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

  if (
    reducedMotion ||
    !('IntersectionObserver' in window)
  ) {

    revealElements.forEach(
      (element) => {

        element.classList.add(
          'is-visible'
        );
      }
    );

    return;
  }

  revealElements.forEach(
    (element) => {

      element.classList.add(
        'reveal'
      );
    }
  );

  const observer =
    new IntersectionObserver(
      (entries, observer) => {

        entries.forEach(
          (entry) => {

            if (
              !entry.isIntersecting
            ) {
              return;
            }

            entry.target.classList.add(
              'is-visible'
            );

            observer.unobserve(
              entry.target
            );
          }
        );
      },
      {
        threshold: 0.08,
        rootMargin:
          '0px 0px -50px 0px'
      }
    );

  revealElements.forEach(
    (element) => {

      observer.observe(
        element
      );
    }
  );

})();
