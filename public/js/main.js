document.addEventListener('DOMContentLoaded', () => {
  const navToggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.main-nav');
  const siteHeader = document.querySelector('.site-header');

  if (navToggle && nav) {
    const closeNav = () => {
      nav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
      siteHeader && siteHeader.classList.remove('nav-open');
    };

    navToggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      siteHeader && siteHeader.classList.toggle('nav-open', isOpen);
    });

    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        closeNav();
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeNav();
      }
    });
  }

  document.querySelectorAll('.copy-to-clipboard').forEach((button) => {
    button.addEventListener('click', async () => {
      const value = button.dataset.value;
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        button.classList.add('copied');
        setTimeout(() => button.classList.remove('copied'), 1500);
      } catch (error) {
        console.warn('Clipboard copy failed', error);
      }
    });
  });
});
