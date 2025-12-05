const archiver = require('archiver');
const path = require('path');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, HeadingLevel, Table, TableCell, TableRow, TextRun } = require('docx');
const donationService = require('./donationService');
const withdrawalService = require('./withdrawalService');
const volunteerService = require('./volunteerService');
const reviewService = require('./reviewService');
const feedbackService = require('./feedbackService');
const fundraisingService = require('./fundraisingService');
const vehicleService = require('./vehicleService');
const contentService = require('./contentService');
const userService = require('./userService');

const DATASET_ORDER = [
  'overview',
  'donations',
  'withdrawals',
  'users',
  'volunteers',
  'vehicles',
  'fundraising',
  'content',
  'community'
];

const DATASET_META = {
  overview: {
    label: 'Фінансовий огляд',
    description: 'Зведені показники фонду станом на момент вивантаження.'
  },
  donations: {
    label: 'Донати',
    description: 'Усі зафіксовані донати з інформацією про публічність та повідомлення.'
  },
  withdrawals: {
    label: 'Витрати',
    description: 'Всі витрати із зазначенням автора та описом.'
  },
  users: {
    label: 'Користувачі',
    description: 'Адміністратори, підтверджені донатори та заявки, що очікують модерації.'
  },
  volunteers: {
    label: 'Волонтери',
    description: 'Заявки від волонтерів з контактними даними та регіоном.'
  },
  vehicles: {
    label: 'Автопарк',
    description: 'Стан автівок фонду зі статусами та категоріями.'
  },
  fundraising: {
    label: 'Фандрейзинг',
    description: 'Цілі зборів та банківські реквізити.'
  },
  content: {
    label: 'Контент',
    description: 'Публікації, медіа-згадки та документи.'
  },
  community: {
    label: 'Відгуки та фідбек',
    description: 'Коментарі донаторів і волонтерів.'
  }
};

const datasetBuilders = {
  overview: () => {
    const totals = fundraisingService.getTotals();
    const goals = fundraisingService.listGoals();
    const activeGoal = goals.find((goal) => goal.status === 'active') || null;
    return {
      key: 'overview',
      label: DATASET_META.overview.label,
      description: DATASET_META.overview.description,
      columns: [
        { key: 'totalRaised', label: 'Зібрано (₴)' },
        { key: 'totalWithdrawn', label: 'Використано (₴)' },
        { key: 'balance', label: 'Баланс (₴)' },
        { key: 'activeGoalTitle', label: 'Активна ціль' },
        { key: 'activeGoalTarget', label: 'Мета (₴)' }
      ],
      rows: [
        {
          totalRaised: totals.totalRaised,
          totalWithdrawn: totals.totalWithdrawn,
          balance: totals.balance,
          activeGoalTitle: activeGoal ? activeGoal.title : null,
          activeGoalTarget: activeGoal ? activeGoal.target_amount : null
        }
      ],
      meta: {
        totals,
        activeGoal
      }
    };
  },
  donations: () => {
    const donations = donationService.listAll();
    return {
      key: 'donations',
      label: DATASET_META.donations.label,
      description: DATASET_META.donations.description,
      columns: [
        { key: 'id', label: 'ID' },
        { key: 'donor_name', label: 'Ім\'я донатора' },
        { key: 'amount', label: 'Сума' },
        { key: 'currency', label: 'Валюта' },
        { key: 'public', label: 'Публічний' },
        { key: 'message', label: 'Повідомлення' },
        { key: 'created_at', label: 'Створено' }
      ],
      rows: donations.map((item) => ({
        ...item,
        public: item.public ? 'так' : 'ні'
      })),
      meta: {
        count: donations.length,
        totalAmount: donations.reduce((sum, donation) => sum + Number(donation.amount || 0), 0)
      }
    };
  },
  withdrawals: () => {
    const withdrawals = withdrawalService.listAll();
    return {
      key: 'withdrawals',
      label: DATASET_META.withdrawals.label,
      description: DATASET_META.withdrawals.description,
      columns: [
        { key: 'id', label: 'ID' },
        { key: 'amount', label: 'Сума' },
        { key: 'description', label: 'Призначення' },
        { key: 'created_by', label: 'ID автора' },
        { key: 'created_at', label: 'Створено' }
      ],
      rows: withdrawals,
      meta: {
        count: withdrawals.length,
        totalAmount: withdrawals.reduce((sum, record) => sum + Number(record.amount || 0), 0)
      }
    };
  },
  users: () => {
    const applicants = userService.listApplicants();
    const donors = userService.listApprovedDonors();
    const admins = userService.listAdministrators();
    return {
      key: 'users',
      label: DATASET_META.users.label,
      description: DATASET_META.users.description,
      columns: [
        { key: 'id', label: 'ID' },
        { key: 'email', label: 'Email' },
        { key: 'full_name', label: 'Ім\'я' },
        { key: 'phone', label: 'Телефон' },
        { key: 'role', label: 'Роль' },
        { key: 'status', label: 'Статус' },
        { key: 'approved_at', label: 'Підтверджено' },
        { key: 'last_login_at', label: 'Останній вхід' }
      ],
      rows: [
        ...admins.map((admin) => ({ ...admin, role: 'admin' })),
        ...donors.map((donor) => ({ ...donor, role: 'donor', status: 'approved' })),
        ...applicants.map((applicant) => ({ ...applicant, role: 'donor' }))
      ],
      meta: {
        admins: admins.length,
        donors: donors.length,
        applicants: applicants.length
      }
    };
  },
  volunteers: () => {
    const volunteers = volunteerService.listAll();
    return {
      key: 'volunteers',
      label: DATASET_META.volunteers.label,
      description: DATASET_META.volunteers.description,
      columns: [
        { key: 'id', label: 'ID' },
        { key: 'full_name', label: 'ПІБ' },
        { key: 'phone', label: 'Телефон' },
        { key: 'email', label: 'Email' },
        { key: 'region', label: 'Регіон' },
        { key: 'skills', label: 'Навички' },
        { key: 'comment', label: 'Коментар' },
        { key: 'created_at', label: 'Створено' }
      ],
      rows: volunteers,
      meta: { count: volunteers.length }
    };
  },
  vehicles: () => {
    const vehicles = vehicleService.listVehicles();
    return {
      key: 'vehicles',
      label: DATASET_META.vehicles.label,
      description: DATASET_META.vehicles.description,
      columns: [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Назва' },
        { key: 'status', label: 'Статус' },
        { key: 'category', label: 'Категорія' },
        { key: 'description', label: 'Опис' },
        { key: 'image_path', label: 'Зображення' }
      ],
      rows: vehicles,
      meta: { count: vehicles.length }
    };
  },
  fundraising: () => {
    const goals = fundraisingService.listGoals();
    const bankAccounts = fundraisingService.listBankAccounts();
    return {
      key: 'fundraising',
      label: DATASET_META.fundraising.label,
      description: DATASET_META.fundraising.description,
      columns: [
        { key: 'entity', label: 'Тип' },
        { key: 'title', label: 'Назва/Отримувач' },
        { key: 'details', label: 'Деталі' },
        { key: 'status', label: 'Статус' },
        { key: 'updated_at', label: 'Оновлено' }
      ],
      rows: [
        ...goals.map((goal) => ({
          entity: 'goal',
          title: goal.title,
          details: `target: ${goal.target_amount}₴ | ${goal.description || ''}`.trim(),
          status: goal.status,
          updated_at: goal.updated_at
        })),
        ...bankAccounts.map((account) => ({
          entity: 'bank_account',
          title: account.label,
          details: [`recipient: ${account.recipient}`, `iban: ${account.iban}`, account.purpose ? `purpose: ${account.purpose}` : null]
            .filter(Boolean)
            .join(' | '),
          status: account.edrpou || '',
          updated_at: account.updated_at
        }))
      ],
      meta: {
        goals: goals.length,
        bankAccounts: bankAccounts.length
      }
    };
  },
  content: () => {
    const articles = contentService.listArticles();
    const media = contentService.listMedia();
    const documents = contentService.listDocuments();
    return {
      key: 'content',
      label: DATASET_META.content.label,
      description: DATASET_META.content.description,
      columns: [
        { key: 'entity', label: 'Тип' },
        { key: 'title', label: 'Заголовок' },
        { key: 'summary', label: 'Опис' },
        { key: 'url', label: 'Посилання/Файл' },
        { key: 'status', label: 'Статус/Тип' },
        { key: 'published_at', label: 'Опубліковано' }
      ],
      rows: [
        ...articles.map((article) => ({
          entity: 'article',
          title: article.title,
          summary: article.excerpt || '',
          url: article.cover_image || '',
          status: article.body ? 'готово' : 'чернетка',
          published_at: article.published_at || ''
        })),
        ...media.map((item) => ({
          entity: 'media',
          title: item.title,
          summary: item.summary || '',
          url: item.url,
          status: item.image_path || '',
          published_at: ''
        })),
        ...documents.map((doc) => ({
          entity: 'document',
          title: doc.title,
          summary: doc.description || '',
          url: doc.file_path,
          status: doc.file_type,
          published_at: ''
        }))
      ],
      meta: {
        articles: articles.length,
        media: media.length,
        documents: documents.length
      }
    };
  },
  community: () => {
    const reviews = reviewService.listAll();
    const feedback = feedbackService.listAll();
    return {
      key: 'community',
      label: DATASET_META.community.label,
      description: DATASET_META.community.description,
      columns: [
        { key: 'entity', label: 'Тип' },
        { key: 'author', label: 'Автор' },
        { key: 'rating', label: 'Оцінка' },
        { key: 'message', label: 'Повідомлення' },
        { key: 'public', label: 'Публічний' },
        { key: 'created_at', label: 'Створено' }
      ],
      rows: [
        ...reviews.map((review) => ({
          entity: 'review',
          author: review.author_name,
          rating: review.rating || '',
          message: review.message,
          public: review.public ? 'так' : 'ні',
          created_at: review.created_at
        })),
        ...feedback.map((item) => ({
          entity: 'feedback',
          author: item.sender_name,
          rating: '',
          message: item.message,
          public: item.channel || '',
          created_at: item.created_at
        }))
      ],
      meta: {
        reviews: reviews.length,
        feedback: feedback.length
      }
    };
  }
};

function normalizeSelection(selection) {
  if (!selection) {
    return [];
  }
  const items = Array.isArray(selection) ? selection : String(selection).split(',');
  const normalized = items
    .map((item) => String(item).trim().toLowerCase())
    .filter(Boolean);
  if (normalized.includes('all')) {
    return [...DATASET_ORDER];
  }
  return normalized.filter((item) => DATASET_ORDER.includes(item));
}

function buildDatasets(selection) {
  const uniqueKeys = Array.from(new Set(selection.length ? selection : DATASET_ORDER));
  return uniqueKeys
    .map((key) => {
      const builder = datasetBuilders[key];
      return builder ? builder() : null;
    })
    .filter(Boolean)
    .sort((a, b) => DATASET_ORDER.indexOf(a.key) - DATASET_ORDER.indexOf(b.key));
}

function toCsv(rows, columns, options = {}) {
  const header = columns.map((column) => escapeCsvValue(column.label)).join(',');
  const lines = rows.map((row) => columns.map((column) => escapeCsvValue(row[column.key])).join(','));
  const csv = [header, ...lines].join('\n');
  return options.withBom ? `\uFEFF${csv}` : csv;
}

function escapeCsvValue(value) {
  if (value === null || value === undefined) {
    return '';
  }
  const stringValue = String(value);
  if ([',', '\"', '\n', '\r'].some((char) => stringValue.includes(char))) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function createArchive(datasets, options = {}) {
  const archive = archiver('zip', { zlib: { level: 9 } });
  const generatedAt = new Date().toISOString();
  const summary = datasets.map((dataset) => ({
    key: dataset.key,
    label: dataset.label,
    rows: dataset.rows.length,
    meta: dataset.meta || {}
  }));

  archive.append(JSON.stringify({ generatedAt, datasets: summary }, null, 2), { name: 'summary.json' });

  datasets.forEach((dataset) => {
    const directory = options.prefix ? `${options.prefix}/${dataset.key}` : dataset.key;
    const jsonPayload = {
      generatedAt,
      label: dataset.label,
      description: dataset.description,
      columns: dataset.columns,
      rows: dataset.rows,
      meta: dataset.meta || {}
    };
    archive.append(JSON.stringify(jsonPayload, null, 2), { name: `${directory}/data.json` });
    archive.append(toCsv(dataset.rows, dataset.columns, { withBom: true }), { name: `${directory}/data.csv` });
  });

  return archive;
}

function createCsvArchive(datasets, options = {}) {
  const archive = archiver('zip', { zlib: { level: 9 } });
  const generatedAt = new Date().toISOString();
  archive.append(JSON.stringify({ generatedAt, datasets: datasets.map((d) => d.key) }, null, 2), {
    name: options.prefix ? `${options.prefix}/summary.json` : 'summary.json'
  });

  datasets.forEach((dataset) => {
    const directory = options.prefix ? `${options.prefix}/${dataset.key}` : dataset.key;
    archive.append(toCsv(dataset.rows, dataset.columns, { withBom: true }), { name: `${directory}.csv` });
  });

  return archive;
}

async function generateExcelBuffer(datasets) {
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  workbook.modified = new Date();

  datasets.forEach((dataset) => {
    const worksheet = workbook.addWorksheet((dataset.label || dataset.key).substring(0, 31));
    worksheet.addRow([dataset.label || dataset.key]);
    worksheet.getRow(1).font = { bold: true, size: 14 };
    if (dataset.description) {
      worksheet.addRow([dataset.description]);
    }
    worksheet.addRow([]);
    const headerRow = worksheet.addRow(dataset.columns.map((column) => column.label));
    headerRow.font = { bold: true };

    dataset.rows.forEach((row) => {
      worksheet.addRow(dataset.columns.map((column) => normalizeCellValue(row[column.key])));
    });

    worksheet.columns.forEach((column, index) => {
      const headerLength = dataset.columns[index] ? dataset.columns[index].label.length : 10;
      column.width = Math.min(Math.max(headerLength + 4, 14), 40);
    });
    worksheet.autoFilter = `A${headerRow.number}:` + String.fromCharCode(64 + dataset.columns.length) + headerRow.number;
  });

  return workbook.xlsx.writeBuffer();
}

async function generateDocxBuffer(datasets) {
  const sections = datasets.map((dataset) => ({
    properties: {},
    children: buildDocxSection(dataset)
  }));

  const doc = new Document({
    creator: 'Volonterka Export',
    title: 'Вивантаження даних фонду',
    description: 'Згенеровано з адмін-панелі',
    sections
  });

  return Packer.toBuffer(doc);
}

async function generatePdfBuffer(datasets) {
  return new Promise((resolve, reject) => {
    const buffers = [];
    const doc = new PDFDocument({ size: 'A4', margin: 40 });

    let fontPath = path.join(__dirname, '..', 'public', 'fonts', 'Montserrat-Regular.ttf');
    let boldFontPath = path.join(__dirname, '..', 'public', 'fonts', 'Montserrat-SemiBold.ttf');
    try {
      doc.font(fontPath);
    } catch (error) {
      fontPath = 'Helvetica';
      doc.font(fontPath);
    }

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(buffers)));

    doc.fontSize(18).text('Вивантаження даних фонду', { align: 'center' });
    doc.moveDown();

    datasets.forEach((dataset, index) => {
      doc.addPage();
      try {
        doc.font(boldFontPath);
      } catch (error) {
        boldFontPath = 'Helvetica-Bold';
        doc.font(boldFontPath);
      }
      doc.fontSize(14).text(dataset.label || dataset.key);
      doc.moveDown(0.5);
      doc.fontSize(10).font(fontPath).text(dataset.description || '', { align: 'left' });
      doc.moveDown();

      const headers = dataset.columns.map((column) => column.label).join(' | ');
      doc.fontSize(11).font(boldFontPath).text(headers);
      doc.moveDown(0.25);
      doc.fontSize(10).font(fontPath);
      dataset.rows.forEach((row) => {
        const line = dataset.columns.map((column) => normalizeCellValue(row[column.key])).join(' | ');
        doc.text(line);
      });

      if (index < datasets.length - 1) {
        doc.moveDown(1.5);
      }
    });

    doc.end();
  });
}

function normalizeCellValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'так' : 'ні';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function buildDocxSection(dataset) {
  const title = new Paragraph({
    text: dataset.label || dataset.key,
    heading: HeadingLevel.HEADING_2
  });

  const description = dataset.description
    ? new Paragraph({ text: dataset.description })
    : null;

  const headerRow = new TableRow({
    children: dataset.columns.map((column) =>
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: column.label, bold: true })] })]
      })
    )
  });

  const dataRows = dataset.rows.map((row) =>
    new TableRow({
      children: dataset.columns.map((column) =>
        new TableCell({
          children: [new Paragraph({ text: normalizeCellValue(row[column.key]) })]
        })
      )
    })
  );

  const table = new Table({ rows: [headerRow, ...dataRows] });

  return description ? [title, description, table] : [title, table];
}

function generateFilename(suffix = 'report', extension = 'zip') {
  const stamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
  return `volonterka-${suffix}-${stamp}.${extension}`;
}

module.exports = {
  buildDatasets,
  createArchive,
  createCsvArchive,
  generateDocxBuffer,
  generateExcelBuffer,
  generatePdfBuffer,
  generateFilename,
  normalizeSelection,
  datasets: DATASET_ORDER,
  meta: DATASET_META
};
