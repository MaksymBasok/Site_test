const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const initNavigation = () => {
  const navToggle = $('[data-nav-toggle]');
  const navPanel = $('[data-nav-panel]');
  const navBackdrop = $('[data-nav-backdrop]');
  if (!navToggle || !navPanel) return;

  const closeNav = () => {
    navPanel.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    navBackdrop && navBackdrop.classList.remove('is-visible');
  };

  navToggle.addEventListener('click', () => {
    const isOpen = navPanel.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    navBackdrop && navBackdrop.classList.toggle('is-visible', isOpen);
  });

  navBackdrop && navBackdrop.addEventListener('click', closeNav);
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 992) {
      closeNav();
    }
  });

  $$("[data-nav-dropdown]").forEach((dropdown) => {
    const button = $('button', dropdown);
    if (!button) return;
    const menu = $('.nav-dropdown__menu', dropdown);
    const toggleMenu = (force) => {
      const isOpen = typeof force === 'boolean' ? force : !dropdown.classList.contains('open');
      dropdown.classList.toggle('open', isOpen);
      button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      if (!isOpen) {
        button.blur();
      }
    };
    button.addEventListener('click', () => toggleMenu());
    dropdown.addEventListener('mouseleave', () => {
      if (window.innerWidth >= 992) toggleMenu(false);
    });
    dropdown.addEventListener('keyup', (event) => {
      if (event.key === 'Escape') toggleMenu(false);
    });
    menu && $$("a", menu).forEach((link) => {
      link.addEventListener('focus', () => dropdown.classList.add('open'));
      link.addEventListener('blur', () => dropdown.classList.remove('open'));
    });
  });
};

const initRevealAnimations = () => {
  const revealables = $$('[data-reveal]');
  if (!('IntersectionObserver' in window) || revealables.length === 0) {
    revealables.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -10%' });
  revealables.forEach((el) => observer.observe(el));
};

const initProgressBars = () => {
  const progressElements = $$('[data-progress]');
  if (progressElements.length === 0) return;

  const activate = (element) => {
    if (element.classList.contains('is-animated')) return;
    const value = parseFloat(element.style.getPropertyValue('--progress-value'));
    element.classList.add('is-animated');
    element.setAttribute('aria-valuenow', Math.round(value * 100));
  };

  if (!('IntersectionObserver' in window)) {
    progressElements.forEach(activate);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        activate(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.35 });

  progressElements.forEach((el) => observer.observe(el));
};

const initTicker = () => {
  const ticker = $('[data-ticker-track]');
  if (!ticker) return;
  const items = ticker.children;
  if (items.length === 0) return;
  // Duplicate items for seamless loop
  ticker.innerHTML += ticker.innerHTML;
};

const initSkeletons = () => {
  $$("[data-skeleton]").forEach((container) => {
    const removeSkeleton = () => container.classList.remove('is-loading');
    container.classList.add('is-loading');
    const media = $$('img, video', container);
    if (media.length === 0) {
      setTimeout(removeSkeleton, 400);
      return;
    }
    let loaded = 0;
    media.forEach((element) => {
      if (element.complete || element.readyState >= 2) {
        loaded += 1;
        if (loaded === media.length) removeSkeleton();
        return;
      }
      element.addEventListener('load', () => {
        loaded += 1;
        if (loaded === media.length) removeSkeleton();
      });
      element.addEventListener('error', () => {
        loaded += 1;
        if (loaded === media.length) removeSkeleton();
      });
    });
  });
};

const initWizard = (form, options = {}) => {
  if (!form) return;
  const steps = $$('[data-step]', form);
  const panels = $$('[data-step-panel]', form);
  const nextBtn = form.querySelector('[data-next-step]');
  const prevBtn = form.querySelector('[data-prev-step]');
  const submitBtn = form.querySelector('[data-submit-step]');
  let current = 0;

  const setStep = (index) => {
    current = Math.max(0, Math.min(index, panels.length - 1));
    panels.forEach((panel, idx) => panel.classList.toggle('is-active', idx === current));
    steps.forEach((step, idx) => step.classList.toggle('is-active', idx === current));
    if (prevBtn) prevBtn.toggleAttribute('disabled', current === 0);
    if (nextBtn) nextBtn.classList.toggle('d-none', current === panels.length - 1);
    if (submitBtn) submitBtn.classList.toggle('d-none', current !== panels.length - 1);
  };

  const validatePanel = () => {
    const panel = panels[current];
    if (!panel) return true;
    const fields = $$('input, textarea, select', panel);
    return fields.every((field) => {
      if (!field.hasAttribute('required')) return true;
      if (field.type === 'checkbox') return field.checked;
      if (field.pattern) {
        const regex = new RegExp(field.pattern);
        return regex.test(field.value.trim());
      }
      return field.value.trim().length > 0;
    });
  };

  nextBtn && nextBtn.addEventListener('click', () => {
    if (!validatePanel()) {
      panelError(panels[current]);
      return;
    }
    setStep(current + 1);
  });

  prevBtn && prevBtn.addEventListener('click', () => setStep(current - 1));

  const panelError = (panel) => {
    if (!panel) return;
    panel.classList.add('has-error');
    setTimeout(() => panel.classList.remove('has-error'), 1200);
  };

  form.addEventListener('submit', (event) => {
    if (!validatePanel()) {
      event.preventDefault();
      panelError(panels[current]);
    }
  });

  setStep(0);
};

const initDonationPreview = () => {
  const form = document.querySelector('[data-donation-form]');
  if (!form) return;
  const outputs = {
    name: form.querySelector('[data-preview-output="name"]'),
    amount: form.querySelector('[data-preview-output="amount"]'),
    message: form.querySelector('[data-preview-output="message"]')
  };
  const fields = $$('[data-preview-field]', form);
  const updatePreview = () => {
    const values = fields.reduce((acc, field) => {
      acc[field.dataset.previewField] = field.value;
      return acc;
    }, {});
    if (outputs.name) outputs.name.textContent = values.name && values.name.trim() ? values.name.trim() : 'Анонім';
    if (outputs.amount) {
      const amount = Number(values.amount || 0);
      outputs.amount.textContent = amount > 0 ? `${amount.toLocaleString('uk-UA')} ₴` : '0 ₴';
    }
    if (outputs.message) outputs.message.textContent = values.message && values.message.trim() ? values.message.trim() : 'Тут буде ваше повідомлення.';
  };
  fields.forEach((field) => field.addEventListener('input', updatePreview));
  updatePreview();
};

const initVehiclesFilters = () => {
  const grid = document.querySelector('[data-vehicles-grid]');
  const filterButtons = $$('[data-vehicle-filters] [data-filter-group]');
  const pagination = document.querySelector('[data-pagination]');
  if (!grid) return;

  const cards = $$('article', grid);
  const pageSize = 6;
  let currentPage = 0;
  let filters = { status: 'all', category: 'all' };
  let filteredCards = cards.slice();
  let totalPages = Math.max(1, Math.ceil(filteredCards.length / pageSize));

  const prev = pagination ? pagination.querySelector('[data-page-prev]') : null;
  const next = pagination ? pagination.querySelector('[data-page-next]') : null;
  const statusLabel = pagination ? pagination.querySelector('[data-pagination-status]') : null;

  const applyFilters = () => {
    filteredCards = cards.filter((card) => {
      const statusMatch = filters.status === 'all' || card.dataset.status === filters.status;
      const categoryMatch = filters.category === 'all' || card.dataset.category === filters.category;
      return statusMatch && categoryMatch;
    });
    totalPages = Math.max(1, Math.ceil(filteredCards.length / pageSize));
    currentPage = Math.min(currentPage, totalPages - 1);
  };

  const render = () => {
    cards.forEach((card) => card.classList.add('d-none'));
    const start = currentPage * pageSize;
    filteredCards.slice(start, start + pageSize).forEach((card) => card.classList.remove('d-none'));
    if (statusLabel) statusLabel.textContent = `${filteredCards.length === 0 ? 0 : currentPage + 1} / ${totalPages}`;
    prev && prev.toggleAttribute('disabled', currentPage === 0 || filteredCards.length === 0);
    next && next.toggleAttribute('disabled', currentPage >= totalPages - 1 || filteredCards.length === 0);
  };

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const group = button.dataset.filterGroup;
      const value = button.dataset.filterValue;
      filters[group] = value;
      $$(`[data-filter-group="${group}"]`).forEach((btn) => btn.classList.remove('is-active'));
      button.classList.add('is-active');
      currentPage = 0;
      applyFilters();
      render();
    });
  });

  prev && prev.addEventListener('click', () => {
    if (currentPage > 0) {
      currentPage -= 1;
      render();
    }
  });

  next && next.addEventListener('click', () => {
    if (currentPage < totalPages - 1) {
      currentPage += 1;
      render();
    }
  });

  applyFilters();
  render();
};

const initDocumentFilters = () => {
  const grid = document.querySelector('[data-documents-grid]');
  if (!grid) return;
  const typeButtons = $$('[data-doc-filter]');
  const tagButtons = $$('[data-doc-tag]');
  let typeFilter = 'all';
  let tagFilter = null;

  const apply = () => {
    $$('article', grid).forEach((card) => {
      const type = card.dataset.docType;
      const tags = card.dataset.docTags ? card.dataset.docTags.split(' ') : [];
      const matchesType = typeFilter === 'all' || type === typeFilter;
      const matchesTag = !tagFilter || tags.includes(tagFilter);
      card.classList.toggle('d-none', !(matchesType && matchesTag));
    });
  };

  typeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      typeFilter = button.dataset.docFilter;
      typeButtons.forEach((btn) => btn.classList.remove('is-active'));
      button.classList.add('is-active');
      apply();
    });
  });

  tagButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (tagFilter === button.dataset.docTag) {
        tagFilter = null;
        button.classList.remove('is-active');
      } else {
        tagFilter = button.dataset.docTag;
        tagButtons.forEach((btn) => btn.classList.remove('is-active'));
        button.classList.add('is-active');
      }
      apply();
    });
  });
};

const initMediaSort = () => {
  const select = $('[data-media-sort]');
  const grid = $('[data-media-grid]');
  if (!select || !grid) return;
  const cards = $$('article', grid);
  select.addEventListener('change', () => {
    const value = select.value;
    const sorted = cards.slice().sort((a, b) => {
      const dateA = new Date(a.dataset.mediaDate || 0).getTime();
      const dateB = new Date(b.dataset.mediaDate || 0).getTime();
      const titleA = (a.dataset.mediaTitle || '').toLowerCase();
      const titleB = (b.dataset.mediaTitle || '').toLowerCase();
      if (value === 'recent') return dateB - dateA;
      if (value === 'oldest') return dateA - dateB;
      return titleA.localeCompare(titleB);
    });
    sorted.forEach((card) => grid.appendChild(card));
  });
};

const initShareButtons = () => {
  $$('.btn-share').forEach((button) => {
    button.addEventListener('click', async () => {
      const shareData = {
        title: button.dataset.shareTitle || document.title,
        text: button.dataset.shareText || '',
        url: button.dataset.shareUrl || window.location.href
      };
      if (navigator.share) {
        try {
          await navigator.share(shareData);
        } catch (error) {
          console.warn('Share cancelled', error);
        }
      } else if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(shareData.url);
          button.classList.add('copied');
          setTimeout(() => button.classList.remove('copied'), 1500);
        } catch (error) {
          console.warn('Clipboard copy failed', error);
        }
      }
    });
  });
};

const initClipboardButtons = () => {
  $$('.copy-to-clipboard').forEach((button) => {
    button.addEventListener('click', async () => {
      const value = button.dataset.value;
      if (!value || !navigator.clipboard) return;
      try {
        await navigator.clipboard.writeText(value);
        button.classList.add('copied');
        setTimeout(() => button.classList.remove('copied'), 1500);
      } catch (error) {
        console.warn('Clipboard copy failed', error);
      }
    });
  });
};

const initToastAutoHide = () => {
  const container = $('[data-toast-container]');
  if (!container) return;
  setTimeout(() => {
    container.querySelectorAll('.toast-message').forEach((toast) => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => toast.remove(), 400);
    });
  }, 4000);
};

const initAdminNav = () => {
  const nav = $('[data-admin-nav]');
  if (!nav) return;
  const links = $$('a', nav);
  links.forEach((link) => {
    link.addEventListener('click', () => {
      links.forEach((item) => item.classList.remove('is-active'));
      link.classList.add('is-active');
    });
  });
};

const initSparklineCharts = () => {
  const charts = $$('[data-sparkline]');
  if (charts.length === 0) return;
  const rootStyles = getComputedStyle(document.documentElement);
  const colorMap = {
    primary: rootStyles.getPropertyValue('--color-primary').trim() || '#0057b7',
    danger: rootStyles.getPropertyValue('--color-danger').trim() || '#d64545',
    success: rootStyles.getPropertyValue('--color-success').trim() || '#2aa866',
    warning: rootStyles.getPropertyValue('--color-warning').trim() || '#f5a524'
  };

  charts.forEach((canvas) => {
    const context = canvas.getContext('2d');
    if (!context) return;
    let values = [];
    try {
      values = JSON.parse(canvas.dataset.values || '[]');
    } catch (error) {
      values = [];
    }
    if (!Array.isArray(values) || values.length === 0) return;
    values = values.map((value) => (typeof value === 'number' ? value : Number(value) || 0));
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || canvas.parentElement?.clientWidth || 200;
    const height = canvas.clientHeight || 60;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    context.scale(dpr, dpr);
    context.clearRect(0, 0, width, height);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min === 0 ? 1 : max - min;
    const stepX = values.length > 1 ? width / (values.length - 1) : width;
    const colorToken = colorMap[canvas.dataset.color] || colorMap.primary;

    context.lineWidth = 2;
    context.strokeStyle = colorToken;
    context.beginPath();
    values.forEach((value, index) => {
      const x = index * stepX;
      const normalized = (value - min) / range;
      const y = height - normalized * height;
      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    });
    context.stroke();

    context.fillStyle = `${colorToken}22`;
    context.lineTo(width, height);
    context.lineTo(0, height);
    context.closePath();
    context.fill();
  });
};

const initAdminTables = () => {
  const controls = $$('[data-table]');
  controls.forEach((control) => {
    const tableKey = control.dataset.table;
    const searchInput = control.querySelector('[data-table-search]');
    if (!tableKey || !searchInput) return;
    const table = document.querySelector(`[data-table-body="${tableKey}"] tbody`)
      || document.querySelector(`[data-table-body="${tableKey}"]`);
    if (!table) return;
    const emptyRow = table.querySelector('[data-table-empty]');
    const rows = $$('tr', table).filter((row) => !row.hasAttribute('data-table-empty'));
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.trim().toLowerCase();
      let visible = 0;
      rows.forEach((row) => {
        const text = row.textContent.toLowerCase();
        const match = text.includes(query);
        row.classList.toggle('d-none', !match);
        if (match) visible += 1;
      });
      if (emptyRow) emptyRow.classList.toggle('d-none', visible !== 0);
    });
  });
};

const parseContentDisposition = (header) => {
  if (!header) return null;
  const match = /filename="?([^";]+)"?/i.exec(header);
  return match ? match[1] : null;
};

const initAdminExportCenter = () => {
  const form = document.querySelector('[data-export-form]');
  if (!form) return;

  const csrfToken = form.dataset.csrf;
  const selectAll = form.querySelector('[data-export-select-all]');
  const checkboxes = $$('[data-export-dataset]', form);
  const status = form.querySelector('[data-export-status]');
  const submit = form.querySelector('[data-export-submit]');
  const formatSelect = form.querySelector('[data-export-format]');
  const modalElement = form.closest('.modal');
  const modalInstance = modalElement && window.bootstrap
    ? window.bootstrap.Modal.getOrCreateInstance(modalElement)
    : null;
  const exportLaunchers = $$('[data-export-launch]');

  const closeNavigationOverlay = () => {
    const navPanel = $('[data-nav-panel]');
    const navToggle = $('[data-nav-toggle]');
    const navBackdrop = $('[data-nav-backdrop]');
    if (navPanel && navPanel.classList.contains('is-open')) {
      navPanel.classList.remove('is-open');
      navToggle && navToggle.setAttribute('aria-expanded', 'false');
    }
    navBackdrop && navBackdrop.classList.remove('is-visible');
  };

  exportLaunchers.forEach((button) => {
    button.addEventListener('click', () => {
      closeNavigationOverlay();
    });
  });

  if (modalElement) {
    modalElement.addEventListener('show.bs.modal', closeNavigationOverlay);
  }

  const updateStatus = (message = '', tone = 'muted') => {
    if (!status) return;
    status.textContent = message;
    status.className = 'export-status';
    if (message) {
      status.classList.add(`export-status--${tone}`);
    }
  };

  const syncSelectAll = () => {
    if (!selectAll) return;
    const total = checkboxes.length;
    const checked = checkboxes.filter((input) => input.checked).length;
    selectAll.indeterminate = checked > 0 && checked < total;
    selectAll.checked = checked === total;
  };

  const toggleSubmitState = (isLoading) => {
    if (!submit) return;
    submit.disabled = isLoading;
    submit.classList.toggle('is-loading', isLoading);
  };

  selectAll && selectAll.addEventListener('change', () => {
    checkboxes.forEach((input) => {
      input.checked = selectAll.checked;
    });
    updateStatus('', 'muted');
  });

  checkboxes.forEach((input) => {
    input.addEventListener('change', () => {
      syncSelectAll();
    });
  });

  syncSelectAll();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const selected = checkboxes.filter((input) => input.checked).map((input) => input.value);
    if (selected.length === 0) {
      updateStatus('Оберіть хоча б один розділ для експорту.', 'danger');
      return;
    }

    const format = (formatSelect && formatSelect.value) || 'zip';
    toggleSubmitState(true);
    updateStatus('Готуємо вивантаження…', 'muted');

    try {
      const response = await fetch('/admin/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': format === 'json' ? 'application/json' : 'application/zip',
          'X-CSRF-Token': csrfToken || ''
        },
        body: JSON.stringify({ datasets: selected, format })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Не вдалося сформувати експорт.');
      }

      if (format === 'json') {
        const payload = await response.json();
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const previewWindow = window.open(url, '_blank', 'noopener');
        if (!previewWindow) {
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = `volonterka-export-${Date.now()}.json`;
          document.body.appendChild(anchor);
          anchor.click();
          document.body.removeChild(anchor);
          updateStatus('JSON-звіт збережено як файл.', 'success');
        } else {
          updateStatus('JSON-звіт відкрито у новій вкладці.', 'success');
        }
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      } else {
        const blob = await response.blob();
        const filename = parseContentDisposition(response.headers.get('Content-Disposition'))
          || `volonterka-export-${Date.now()}.zip`;
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        updateStatus('Архів готується до завантаження.', 'success');
      }

      if (modalInstance) {
        setTimeout(() => modalInstance.hide(), 600);
      }
    } catch (error) {
      updateStatus(error.message || 'Сталася помилка при експорті.', 'danger');
    } finally {
      toggleSubmitState(false);
      syncSelectAll();
    }
  });
};

const initDonationTickerHover = () => {
  const ticker = document.querySelector('[data-ticker-track]');
  if (!ticker) return;
  const parent = ticker.parentElement;
  parent.addEventListener('mouseenter', () => {
    ticker.style.animationPlayState = 'paused';
  });
  parent.addEventListener('mouseleave', () => {
    ticker.style.animationPlayState = 'running';
  });
};

const initScripts = () => {
  initNavigation();
  initRevealAnimations();
  initProgressBars();
  initTicker();
  initDonationTickerHover();
  initSkeletons();
  initWizard(document.querySelector('[data-donation-form]'));
  initWizard(document.querySelector('[data-volunteer-form]'));
  initDonationPreview();
  initVehiclesFilters();
  initDocumentFilters();
  initMediaSort();
  initShareButtons();
  initClipboardButtons();
  initToastAutoHide();
  initSparklineCharts();
  initAdminNav();
  initAdminTables();
  initAdminExportCenter();
};

document.addEventListener('DOMContentLoaded', initScripts);
