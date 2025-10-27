document.addEventListener('DOMContentLoaded', () => {
  const navToggle = document.querySelector('.nav-toggle');
  const navPanel = document.querySelector('.nav-panel');
  const navBackdrop = document.querySelector('.nav-backdrop');
  const siteHeader = document.querySelector('.site-header');

  if (navToggle && navPanel) {
    const closeNav = () => {
      navPanel.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
      siteHeader && siteHeader.classList.remove('nav-open');
      navBackdrop && navBackdrop.classList.remove('is-visible');
    };

    navToggle.addEventListener('click', () => {
      const isOpen = navPanel.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      siteHeader && siteHeader.classList.toggle('nav-open', isOpen);
      navBackdrop && navBackdrop.classList.toggle('is-visible', isOpen);
    });

    navPanel.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        closeNav();
      });
    });

    navPanel.querySelectorAll('form').forEach((form) => {
      form.addEventListener('submit', () => {
        closeNav();
      });
    });

    navBackdrop && navBackdrop.addEventListener('click', () => {
      closeNav();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeNav();
      }
    });

    const mq = window.matchMedia('(min-width: 992px)');
    const handleViewportChange = (event) => {
      if (event.matches) {
        closeNav();
      }
    };

    if (mq.addEventListener) {
      mq.addEventListener('change', handleViewportChange);
    } else if (mq.addListener) {
      mq.addListener(handleViewportChange);
    }
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

  const adminNav = document.querySelector('.admin-nav');
  if (adminNav) {
    const adminLinks = Array.from(adminNav.querySelectorAll('a[href^="#"]'));
    const adminSections = adminLinks
      .map((link) => {
        const id = link.getAttribute('href')?.slice(1);
        return id ? document.getElementById(id) : null;
      })
      .filter(Boolean);

    const setActiveLink = (id) => {
      adminLinks.forEach((link) => {
        const targetId = link.getAttribute('href');
        link.classList.toggle('is-active', targetId === `#${id}`);
      });
    };

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveLink(entry.target.id);
            }
          });
        },
        {
          rootMargin: '-45% 0px -45% 0px',
          threshold: 0.15
        }
      );

      adminSections.forEach((section) => observer.observe(section));
    }

    adminLinks.forEach((link) => {
      link.addEventListener('click', (event) => {
        const targetId = link.getAttribute('href');
        if (!targetId || !targetId.startsWith('#')) return;
        const target = document.querySelector(targetId);
        if (!target) return;
        event.preventDefault();

        const accordion = target.querySelector('.admin-accordion');
        if (accordion && !accordion.open) {
          accordion.open = true;
        }

        const targetOffset = target.getBoundingClientRect().top + window.scrollY - 110;
        window.scrollTo({ top: targetOffset, behavior: 'smooth' });
        setActiveLink(targetId.slice(1));
      });
    });
  }
});
