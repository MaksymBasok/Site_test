document.addEventListener('DOMContentLoaded', () => {
  const navToggle = document.querySelector('.nav-toggle');
  const navList = document.querySelector('.main-nav ul');

  if (navToggle && navList) {
    navToggle.addEventListener('click', () => {
      navList.classList.toggle('open');
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
