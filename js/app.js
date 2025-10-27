const STORAGE_KEYS = {
  donations: 'volunteer_donations',
  reviews: 'volunteer_reviews',
  card: 'volunteer_card',
  goal: 'volunteer_goal',
  payouts: 'volunteer_payouts',
  messages: 'volunteer_messages',
  user: 'volunteer_current_user'
};

const ADMIN_CREDENTIALS = {
  email: 'admin@volunteer.ua',
  password: 'secureAdmin123'
};

const STATUS_LABELS = {
  pending: 'На розгляді',
  approved: 'Підтверджено',
  rejected: 'Відхилено',
  banned: 'Заблоковано'
};

const STATUS_PRIORITY = {
  pending: 0,
  approved: 1,
  rejected: 2,
  banned: 3
};

const state = {
  donations: [],
  reviews: [],
  card: null,
  goal: null,
  payouts: [],
  messages: [],
  currentUser: null
};

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn('Не вдалося прочитати дані з localStorage', error);
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('Не вдалося зберегти дані до localStorage', error);
  }
}

function loadCurrentUser() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.user);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Не вдалося прочитати користувача з sessionStorage', error);
    return null;
  }
}

function saveCurrentUser(user) {
  try {
    if (user) {
      sessionStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.user);
    }
  } catch (error) {
    console.warn('Не вдалося оновити дані користувача', error);
  }
}

function formatCurrency(amount) {
  const value = Number(amount || 0);
  return `${value.toLocaleString('uk-UA')} ₴`;
}

function normalizePhone(phone) {
  return (phone || '').replace(/\D/g, '');
}

function formatPhone(phone) {
  const digits = normalizePhone(phone);
  if (!digits) return '';
  if (digits.startsWith('0')) {
    return `+38 ${digits.replace(/(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4')}`;
  }
  if (digits.length === 12 && digits.startsWith('38')) {
    return `+${digits.replace(/(\d{2})(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5')}`;
  }
  return `+${digits}`;
}

function setFormFeedback(elementId, message, type = 'info') {
  const block = document.getElementById(elementId);
  if (!block) return;
  block.textContent = message || '';
  block.classList.remove('error', 'success', 'info');
  if (message) {
    block.classList.add(type);
  }
}

function clearElement(element) {
  while (element && element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

function toggleHidden(element, hidden) {
  if (!element) return;
  element.hidden = hidden;
}

function computeTotals() {
  const totalApproved = state.donations
    .filter(item => item.status === 'approved')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const totalWithdrawn = state.payouts
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const balance = Math.max(totalApproved - totalWithdrawn, 0);

  return { totalApproved, totalWithdrawn, balance };
}

function renderCardDetails() {
  const defaults = {
    recipient: 'Roleders Aleksandrs',
    iban: 'UA443077700000026204016710032',
    edrpou: '—',
    purpose: 'Для поповнення картки 4323347377472482, Roleders Aleksandrs',
    updatedAt: new Date().toISOString()
  };

  state.card = readStorage(STORAGE_KEYS.card, defaults);

  const { recipient, iban, edrpou, purpose, updatedAt } = state.card;
  const updatedLabel = updatedAt ? new Date(updatedAt).toLocaleString('uk-UA') : '—';

  const cardRecipient = document.getElementById('cardRecipient');
  const cardIban = document.getElementById('cardIban');
  const cardEdrpou = document.getElementById('cardEdrpou');
  const cardPurpose = document.getElementById('cardPurpose');
  const cardUpdated = document.getElementById('cardUpdated');

  if (cardRecipient) cardRecipient.textContent = recipient;
  if (cardIban) cardIban.textContent = iban;
  if (cardEdrpou) cardEdrpou.textContent = edrpou || '—';
  if (cardPurpose) cardPurpose.textContent = purpose;
  if (cardUpdated) cardUpdated.textContent = updatedLabel;

  document.querySelectorAll('.card-recipient').forEach(el => (el.textContent = recipient));
  document.querySelectorAll('.card-iban').forEach(el => (el.textContent = iban));
  document.querySelectorAll('.card-edrpou').forEach(el => (el.textContent = edrpou || '—'));
  document.querySelectorAll('.card-purpose').forEach(el => (el.textContent = purpose));

  const cardFormRecipient = document.getElementById('cardFormRecipient');
  const cardFormIban = document.getElementById('cardFormIban');
  const cardFormEdrpou = document.getElementById('cardFormEdrpou');
  const cardFormPurpose = document.getElementById('cardFormPurpose');
  if (cardFormRecipient) cardFormRecipient.value = recipient;
  if (cardFormIban) cardFormIban.value = iban;
  if (cardFormEdrpou) cardFormEdrpou.value = edrpou || '';
  if (cardFormPurpose) cardFormPurpose.value = purpose;
}

function renderGoalAndTotals() {
  const defaults = {
    title: 'Позашляховик для волонтерів',
    target: 250000
  };
  state.goal = readStorage(STORAGE_KEYS.goal, defaults);

  const goalTitle = document.getElementById('goalTitle');
  const goalTarget = document.getElementById('goalTarget');
  const goalProgress = document.getElementById('goalProgress');
  const totalRaised = document.getElementById('totalRaised');
  const totalWithdrawn = document.getElementById('totalWithdrawn');
  const balance = document.getElementById('balance');
  const goalFormTitle = document.getElementById('goalFormTitle');
  const goalFormTarget = document.getElementById('goalFormTarget');

  const totals = computeTotals();
  const target = Number(state.goal.target || 0);
  const progress = target > 0 ? Math.min(100, Math.round((totals.totalApproved / target) * 100)) : 0;

  if (goalTitle) goalTitle.textContent = state.goal.title;
  if (goalTarget) goalTarget.textContent = formatCurrency(target);
  if (totalRaised) totalRaised.textContent = formatCurrency(totals.totalApproved);
  if (totalWithdrawn) totalWithdrawn.textContent = formatCurrency(totals.totalWithdrawn);
  if (balance) balance.textContent = formatCurrency(totals.balance);
  if (goalProgress) {
    goalProgress.style.width = `${progress}%`;
    goalProgress.setAttribute('aria-valuenow', String(progress));
    goalProgress.textContent = `${progress}%`;
  }

  if (goalFormTitle) goalFormTitle.value = state.goal.title;
  if (goalFormTarget) goalFormTarget.value = target;
}

function renderAdminRequests() {
  const tableBody = document.getElementById('adminRequests');
  if (!tableBody) return;

  clearElement(tableBody);
  if (!state.donations.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 7;
    cell.textContent = 'Поки що немає заявок.';
    row.appendChild(cell);
    tableBody.appendChild(row);
    return;
  }

  const sorted = [...state.donations].sort((a, b) => {
    const diff = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
    if (diff !== 0) return diff;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  sorted.forEach((donation, index) => {
    const row = document.createElement('tr');
    row.dataset.id = String(donation.id);

    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${donation.fullName}</td>
      <td>${formatPhone(donation.phoneRaw)}</td>
      <td>${formatCurrency(donation.amount)}</td>
      <td><button type="button" class="link-btn" data-action="preview">Переглянути</button></td>
      <td><span class="status-badge status-${donation.status}">${STATUS_LABELS[donation.status] || donation.status}</span></td>
      <td class="admin-actions">
        <button type="button" class="ghost-btn approve" data-action="approve">Прийняти</button>
        <button type="button" class="ghost-btn reject" data-action="reject">Відхилити</button>
        <button type="button" class="ghost-btn ban" data-action="ban">Забанити</button>
      </td>
    `;

    tableBody.appendChild(row);
  });
}

function renderUserDonations() {
  const tableBody = document.getElementById('userDonations');
  const card = document.getElementById('userDonationsCard');
  if (!tableBody || !card) return;

  if (!state.currentUser || state.currentUser.role === 'admin') {
    toggleHidden(card, true);
    return;
  }

  const userPhone = normalizePhone(state.currentUser.phone);
  const donations = state.donations
    .filter(item => normalizePhone(item.phone) === userPhone)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  toggleHidden(card, false);
  clearElement(tableBody);

  if (!donations.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.textContent = 'У вас поки що немає заявок. Заповніть форму вище.';
    row.appendChild(cell);
    tableBody.appendChild(row);
    return;
  }

  donations.forEach((item, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${new Date(item.createdAt).toLocaleString('uk-UA')}</td>
      <td>${formatCurrency(item.amount)}</td>
      <td><span class="status-badge status-${item.status}">${STATUS_LABELS[item.status] || item.status}</span></td>
      <td>${item.comment || '—'}</td>
    `;
    tableBody.appendChild(row);
  });
}

function renderReviews() {
  const list = document.getElementById('reviewsList');
  if (!list) return;

  clearElement(list);

  if (!state.reviews.length) {
    const placeholder = document.createElement('div');
    placeholder.className = 'review-placeholder';
    placeholder.innerHTML = '<p>Відгуків поки немає. Станьте першим, хто поділиться досвідом!</p>';
    list.appendChild(placeholder);
    return;
  }

  const sorted = [...state.reviews].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  sorted.forEach(review => {
    const card = document.createElement('div');
    card.className = 'review-card';
    card.innerHTML = `
      <div class="review-header">
        <div class="review-author">${review.author}</div>
        <div class="review-rating" aria-label="Оцінка">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
      </div>
      <p class="review-text">${review.text}</p>
      <div class="review-date">${new Date(review.createdAt).toLocaleString('uk-UA')}</div>
    `;
    list.appendChild(card);
  });
}

function renderPayouts() {
  const table = document.getElementById('payoutTable');
  if (!table) return;

  clearElement(table);
  if (!state.payouts.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 3;
    cell.textContent = 'Записів про виведення коштів поки що немає.';
    row.appendChild(cell);
    table.appendChild(row);
    return;
  }

  const sorted = [...state.payouts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  sorted.forEach(entry => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${new Date(entry.createdAt).toLocaleString('uk-UA')}</td>
      <td>${formatCurrency(entry.amount)}</td>
      <td>${entry.note}</td>
    `;
    table.appendChild(row);
  });
}

function renderMessages() {
  const table = document.getElementById('messagesTable');
  if (!table) return;

  clearElement(table);
  if (!state.messages.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 4;
    cell.textContent = 'Звернень поки що немає.';
    row.appendChild(cell);
    table.appendChild(row);
    return;
  }

  const sorted = [...state.messages].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  sorted.forEach(message => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${new Date(message.createdAt).toLocaleString('uk-UA')}</td>
      <td>${message.name}</td>
      <td>${message.contact}</td>
      <td>${message.text}</td>
    `;
    table.appendChild(row);
  });
}

function updateAuthUI() {
  const statusBlock = document.getElementById('accountStatus');
  const badgesBlock = document.getElementById('roleBadges');
  const logoutBtn = document.getElementById('logoutBtn');
  const reviewFormWrapper = document.getElementById('reviewFormWrapper');
  const reviewRestriction = document.getElementById('reviewRestriction');
  const adminPanel = document.getElementById('adminPanel');
  const livePlayer = document.getElementById('livePlayer');
  const livePlaceholder = document.getElementById('livePlaceholder');

  clearElement(badgesBlock);

  if (!state.currentUser) {
    if (statusBlock) {
      statusBlock.innerHTML = '<p>Увійдіть, щоб відстежувати стан заявок та отримати доступ до прямого ефіру.</p>';
    }
    if (logoutBtn) logoutBtn.hidden = true;
    if (reviewFormWrapper) reviewFormWrapper.classList.add('disabled');
    if (reviewRestriction) reviewRestriction.hidden = false;
    if (adminPanel) adminPanel.hidden = true;
    if (livePlayer) livePlayer.hidden = true;
    if (livePlaceholder) livePlaceholder.hidden = false;
    renderUserDonations();
    return;
  }

  if (logoutBtn) logoutBtn.hidden = false;

  const badge = document.createElement('span');
  badge.className = `status-badge role-badge role-${state.currentUser.role}`;
  badge.textContent = state.currentUser.role === 'admin' ? 'Адміністратор' : state.currentUser.role === 'donor' ? 'Донатор' : state.currentUser.role === 'banned' ? 'Заблоковано' : 'Підтримка';
  badgesBlock.appendChild(badge);

  let message = '';
  switch (state.currentUser.role) {
    case 'admin':
      message = 'Ви увійшли як адміністратор. Доступні всі керуючі функції.';
      if (adminPanel) adminPanel.hidden = false;
      if (livePlayer) livePlayer.hidden = false;
      if (livePlaceholder) livePlaceholder.hidden = true;
      if (reviewFormWrapper) reviewFormWrapper.classList.remove('disabled');
      if (reviewRestriction) reviewRestriction.hidden = true;
      break;
    case 'donor':
      message = 'Дякуємо за вашу підтримку! Доступ до прямого ефіру відкрито.';
      if (livePlayer) livePlayer.hidden = false;
      if (livePlaceholder) livePlaceholder.hidden = true;
      if (reviewFormWrapper) reviewFormWrapper.classList.remove('disabled');
      if (reviewRestriction) reviewRestriction.hidden = true;
      if (adminPanel) adminPanel.hidden = true;
      break;
    case 'banned':
      message = 'Ваш акаунт заблокований. Зверніться до адміністратора для уточнення деталей.';
      if (livePlayer) livePlayer.hidden = true;
      if (livePlaceholder) livePlaceholder.hidden = false;
      if (reviewFormWrapper) reviewFormWrapper.classList.add('disabled');
      if (reviewRestriction) reviewRestriction.hidden = false;
      if (adminPanel) adminPanel.hidden = true;
      break;
    default: {
      const hasDonations = Boolean(state.currentUser.hasDonations);
      message = hasDonations
        ? 'Ваша заявка очікує на підтвердження. Доступ до прямого ефіру буде відкрито після перевірки.'
        : 'Заповніть форму підтвердження донату, щоб отримати доступ до прямого ефіру.';
      if (livePlayer) livePlayer.hidden = true;
      if (livePlaceholder) livePlaceholder.hidden = false;
      if (reviewFormWrapper) reviewFormWrapper.classList.add('disabled');
      if (reviewRestriction) reviewRestriction.hidden = false;
      if (adminPanel) adminPanel.hidden = true;
      break;
    }
  }

  if (statusBlock) {
    statusBlock.innerHTML = `<p><strong>${state.currentUser.name}</strong></p><p>${message}</p>`;
  }

  renderUserDonations();
}

function handleRoleFields(role) {
  document.querySelectorAll('.donor-field').forEach(el => el.hidden = role === 'admin');
  document.querySelectorAll('.admin-field').forEach(el => el.hidden = role !== 'admin');
}

async function handleDonationSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;

  try {
    const nameInput = document.getElementById('donationName');
    const phoneInput = document.getElementById('donationPhone');
    const amountInput = document.getElementById('donationAmount');
    const commentInput = document.getElementById('donationComment');
    const receiptInput = document.getElementById('donationReceipt');

    const fullName = nameInput ? nameInput.value.trim() : '';
    const phoneRaw = phoneInput ? phoneInput.value.trim() : '';
    const amount = amountInput ? Number(amountInput.value) : 0;
    const comment = commentInput ? commentInput.value.trim() : '';
    const receiptFile = receiptInput?.files?.[0];

    if (!fullName || !phoneRaw || !amount || amount <= 0) {
      setFormFeedback('donationMessage', 'Заповніть усі обов’язкові поля та вкажіть суму донату.', 'error');
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    if (!receiptFile) {
      setFormFeedback('donationMessage', 'Будь ласка, додайте файл із підтвердженням донату.', 'error');
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    const receiptData = await readFileAsDataUrl(receiptFile);

    const donation = {
      id: Date.now(),
      fullName,
      phone: normalizePhone(phoneRaw),
      phoneRaw,
      amount,
      comment,
      receipt: receiptData,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    state.donations = readStorage(STORAGE_KEYS.donations, []);
    state.donations.push(donation);
    writeStorage(STORAGE_KEYS.donations, state.donations);

    setFormFeedback('donationMessage', 'Заявку надіслано. Очікуйте підтвердження від адміністратора.', 'success');
    form.reset();
    renderAdminRequests();
    renderGoalAndTotals();
    renderUserDonations();
    if (state.currentUser && normalizePhone(state.currentUser.phone) === donation.phone) {
      state.currentUser.hasDonations = true;
      saveCurrentUser(state.currentUser);
      updateAuthUI();
    }
  } catch (error) {
    console.error(error);
    setFormFeedback('donationMessage', 'Сталася помилка під час відправки. Спробуйте ще раз.', 'error');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function handleAdminAction(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const action = target.dataset.action;
  if (!action) return;

  const row = target.closest('tr');
  if (!row) return;

  const id = Number(row.dataset.id);
  const donation = state.donations.find(item => item.id === id);
  if (!donation) return;

  if (action === 'preview') {
    openReceiptModal(donation.receipt);
    return;
  }

  switch (action) {
    case 'approve':
      donation.status = 'approved';
      donation.approvedAt = new Date().toISOString();
      break;
    case 'reject':
      donation.status = 'rejected';
      donation.handledAt = new Date().toISOString();
      break;
    case 'ban':
      donation.status = 'banned';
      donation.handledAt = new Date().toISOString();
      break;
    default:
      return;
  }

  writeStorage(STORAGE_KEYS.donations, state.donations);
  renderAdminRequests();
  renderGoalAndTotals();
  renderUserDonations();

  if (state.currentUser && normalizePhone(state.currentUser.phone) === normalizePhone(donation.phone)) {
    state.currentUser.hasDonations = true;
    if (donation.status === 'approved') {
      state.currentUser.role = 'donor';
    } else if (donation.status === 'banned') {
      state.currentUser.role = 'banned';
    } else {
      state.currentUser.role = 'supporter';
    }
    saveCurrentUser(state.currentUser);
    updateAuthUI();
  }
}

function openReceiptModal(imageSrc) {
  const modal = document.getElementById('checkModal');
  const image = document.getElementById('checkImage');
  const download = document.getElementById('checkDownload');
  if (!modal || !image || !download) return;
  image.src = imageSrc;
  download.href = imageSrc;
  modal.style.display = 'block';
}

function closeModal(modal) {
  if (modal) {
    modal.style.display = 'none';
  }
}

function handleCardForm(event) {
  event.preventDefault();

  const recipientInput = document.getElementById('cardFormRecipient');
  const ibanInput = document.getElementById('cardFormIban');
  const edrpouInput = document.getElementById('cardFormEdrpou');
  const purposeInput = document.getElementById('cardFormPurpose');

  state.card = {
    recipient: recipientInput ? recipientInput.value.trim() : '',
    iban: ibanInput ? ibanInput.value.trim() : '',
    edrpou: edrpouInput ? edrpouInput.value.trim() : '',
    purpose: purposeInput ? purposeInput.value.trim() : '',
    updatedAt: new Date().toISOString()
  };

  writeStorage(STORAGE_KEYS.card, state.card);
  renderCardDetails();
  setFormFeedback('cardMessage', 'Реквізити успішно оновлено.', 'success');
}

function handleGoalForm(event) {
  event.preventDefault();

  const titleInput = document.getElementById('goalFormTitle');
  const targetInput = document.getElementById('goalFormTarget');

  state.goal = {
    title: titleInput ? titleInput.value.trim() : '',
    target: targetInput ? Number(targetInput.value) : 0
  };

  writeStorage(STORAGE_KEYS.goal, state.goal);
  renderGoalAndTotals();
  setFormFeedback('goalMessage', 'Ціль оновлено.', 'success');
}

function handlePayoutForm(event) {
  event.preventDefault();

  const amountInput = document.getElementById('payoutAmount');
  const noteInput = document.getElementById('payoutNote');
  const form = document.getElementById('payoutForm');
  const messageId = 'payoutMessage';

  const amountValue = amountInput ? Number(amountInput.value) : 0;
  const noteValue = noteInput ? noteInput.value.trim() : '';

  if (!amountValue || amountValue <= 0 || !noteValue) {
    setFormFeedback(messageId, 'Вкажіть суму та коментар для виведення коштів.', 'error');
    return;
  }

  const entry = {
    id: Date.now(),
    amount: amountValue,
    note: noteValue,
    createdAt: new Date().toISOString()
  };

  state.payouts = readStorage(STORAGE_KEYS.payouts, []);
  state.payouts.push(entry);
  writeStorage(STORAGE_KEYS.payouts, state.payouts);
  if (form) form.reset();
  renderPayouts();
  renderGoalAndTotals();
  setFormFeedback(messageId, 'Інформацію про виведення збережено.', 'success');
}

function handleReviewSubmit(event) {
  event.preventDefault();

  if (!state.currentUser || (state.currentUser.role !== 'donor' && state.currentUser.role !== 'admin')) {
    setFormFeedback('reviewMessage', 'Відгук можуть залишити лише підтверджені донатори.', 'error');
    return;
  }

  const ratingInput = document.getElementById('reviewRating');
  const textInput = document.getElementById('reviewText');
  const form = document.getElementById('reviewForm');

  const review = {
    id: Date.now(),
    author: state.currentUser.name,
    rating: ratingInput ? Number(ratingInput.value) : 5,
    text: textInput ? textInput.value.trim() : '',
    createdAt: new Date().toISOString()
  };

  if (!review.text) {
    setFormFeedback('reviewMessage', 'Напишіть короткий коментар для відгуку.', 'error');
    return;
  }

  state.reviews = readStorage(STORAGE_KEYS.reviews, []);
  state.reviews.push(review);
  writeStorage(STORAGE_KEYS.reviews, state.reviews);
  if (form) form.reset();
  renderReviews();
  setFormFeedback('reviewMessage', 'Дякуємо за ваш відгук!', 'success');
}

function handleContactForm(event) {
  event.preventDefault();

  const nameInput = document.getElementById('contactName');
  const detailsInput = document.getElementById('contactDetails');
  const messageInput = document.getElementById('contactMessage');
  const form = document.getElementById('contactForm');

  const message = {
    id: Date.now(),
    name: nameInput ? nameInput.value.trim() : '',
    contact: detailsInput ? detailsInput.value.trim() : '',
    text: messageInput ? messageInput.value.trim() : '',
    createdAt: new Date().toISOString()
  };

  state.messages = readStorage(STORAGE_KEYS.messages, []);
  state.messages.push(message);
  writeStorage(STORAGE_KEYS.messages, state.messages);
  if (form) form.reset();
  renderMessages();
  setFormFeedback('contactMessageFeedback', 'Повідомлення передано волонтерам. Ми з вами зв\'яжемося!', 'success');
}

function handleLogin(event) {
  event.preventDefault();

  const roleSelect = document.getElementById('loginRole');
  const emailInput = document.getElementById('loginEmail');
  const passwordInput = document.getElementById('loginPassword');
  const nameInput = document.getElementById('loginName');
  const phoneInput = document.getElementById('loginPhone');

  const role = roleSelect ? roleSelect.value : 'donor';
  if (role === 'admin') {
    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value.trim() : '';
    if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
      state.currentUser = {
        role: 'admin',
        name: 'Адміністратор',
        email,
        hasDonations: false
      };
      saveCurrentUser(state.currentUser);
      setFormFeedback('loginMessage', 'Ви успішно увійшли як адміністратор.', 'success');
      updateAuthUI();
      renderMessages();
      renderAdminRequests();
      renderPayouts();
      return;
    }
    setFormFeedback('loginMessage', 'Невірний email або пароль.', 'error');
    return;
  }

  const name = nameInput ? nameInput.value.trim() || 'Донор' : 'Донор';
  const phone = phoneInput ? phoneInput.value.trim() : '';
  const normalized = normalizePhone(phone);

  if (!normalized) {
    setFormFeedback('loginMessage', 'Введіть коректний номер телефону.', 'error');
    return;
  }

  const donations = state.donations.filter(item => normalizePhone(item.phone) === normalized);

  let roleStatus = 'supporter';
  if (donations.some(item => item.status === 'banned')) {
    roleStatus = 'banned';
  } else if (donations.some(item => item.status === 'approved')) {
    roleStatus = 'donor';
  }

  const donorName = donations.length ? donations[0].fullName : name;

  state.currentUser = {
    role: roleStatus,
    name: donorName,
    phone,
    hasDonations: donations.length > 0
  };

  saveCurrentUser(state.currentUser);
  setFormFeedback('loginMessage', 'Вхід виконано. Перевірте статус заявок у таблиці нижче.', 'success');
  updateAuthUI();
}

function handleLogout() {
  state.currentUser = null;
  saveCurrentUser(null);
  updateAuthUI();
}

function initCarFiltering() {
  const tabs = document.querySelectorAll('.tab');
  const carCards = document.querySelectorAll('.car-card');
  if (!tabs.length || !carCards.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const category = tab.getAttribute('data-category');
      carCards.forEach(card => {
        const matches = category === 'all' || card.getAttribute('data-category') === category;
        card.style.display = matches ? 'block' : 'none';
      });
    });
  });
}

function initDocumentTabs() {
  const docTabs = document.querySelectorAll('.documents .doc-tab');
  const items = document.querySelectorAll('.documents .document-item');
  if (!docTabs.length) return;

  docTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const category = tab.getAttribute('data-category');
      docTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      items.forEach(item => {
        const matches = category === 'all' || item.getAttribute('data-category') === category;
        item.style.display = matches ? 'block' : 'none';
      });
    });
  });
}

function initOrganizationTabs() {
  const tabs = document.querySelectorAll('#nkppk .doc-tab');
  const panes = document.querySelectorAll('#org-panes .pane');
  if (!tabs.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const key = tab.getAttribute('data-pane');
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      panes.forEach(pane => {
        pane.style.display = pane.getAttribute('data-pane') === key ? 'block' : 'none';
      });
    });
  });
}

function initModals() {
  window.openModal = function (button) {
    const modal = document.getElementById('docModal');
    const modalImg = document.getElementById('modalImage');
    const downloadBtn = document.querySelector('#docModal .modal-download-btn');
    const docImage = button.closest('.document-preview')?.querySelector('.doc-image');
    if (!modal || !modalImg || !downloadBtn || !docImage) return;
    modal.style.display = 'block';
    modalImg.src = docImage.src;
    downloadBtn.href = docImage.src;
  };

  document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.modalTarget;
      if (modalId) {
        closeModal(document.getElementById(modalId));
      } else {
        closeModal(btn.closest('.modal'));
      }
    });
  });

  window.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      document.querySelectorAll('.modal').forEach(modal => closeModal(modal));
    }
  });

  window.addEventListener('click', event => {
    if (event.target instanceof HTMLElement && event.target.classList.contains('modal')) {
      closeModal(event.target);
    }
  });
}

function restoreState() {
  state.donations = readStorage(STORAGE_KEYS.donations, []);
  state.reviews = readStorage(STORAGE_KEYS.reviews, []);
  state.payouts = readStorage(STORAGE_KEYS.payouts, []);
  state.messages = readStorage(STORAGE_KEYS.messages, []);
  renderCardDetails();
  renderGoalAndTotals();
  renderAdminRequests();
  renderReviews();
  renderPayouts();
  renderMessages();
}

document.addEventListener('DOMContentLoaded', () => {
  initCarFiltering();
  initDocumentTabs();
  initOrganizationTabs();
  initModals();

  restoreState();
  state.currentUser = loadCurrentUser();
  updateAuthUI();

  const roleSelect = document.getElementById('loginRole');
  if (roleSelect) {
    handleRoleFields(roleSelect.value);
    roleSelect.addEventListener('change', event => handleRoleFields(event.target.value));
  }

  const loginFormEl = document.getElementById('loginForm');
  if (loginFormEl) loginFormEl.addEventListener('submit', handleLogin);

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

  const donationFormEl = document.getElementById('donationForm');
  if (donationFormEl) donationFormEl.addEventListener('submit', handleDonationSubmit);

  const requestsTable = document.getElementById('requestsTable');
  if (requestsTable) requestsTable.addEventListener('click', handleAdminAction);

  const cardFormEl = document.getElementById('cardForm');
  if (cardFormEl) cardFormEl.addEventListener('submit', handleCardForm);

  const goalFormEl = document.getElementById('goalForm');
  if (goalFormEl) goalFormEl.addEventListener('submit', handleGoalForm);

  const payoutFormEl = document.getElementById('payoutForm');
  if (payoutFormEl) payoutFormEl.addEventListener('submit', handlePayoutForm);

  const reviewFormEl = document.getElementById('reviewForm');
  if (reviewFormEl) reviewFormEl.addEventListener('submit', handleReviewSubmit);

  const contactFormEl = document.getElementById('contactForm');
  if (contactFormEl) contactFormEl.addEventListener('submit', handleContactForm);
});
