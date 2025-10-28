const SENSITIVE_FIELDS = new Set(['password', 'confirm_password', '_csrf']);

function sanitizeValues(values = {}) {
  return Object.keys(values).reduce((acc, key) => {
    if (SENSITIVE_FIELDS.has(key)) {
      return acc;
    }
    const value = values[key];
    if (value === undefined || value === null) {
      return acc;
    }
    if (Array.isArray(value)) {
      acc[key] = value.slice();
      return acc;
    }
    if (typeof value === 'object') {
      acc[key] = { ...value };
      return acc;
    }
    acc[key] = String(value);
    return acc;
  }, {});
}

function normalizeErrors(errors) {
  if (!errors) {
    return [];
  }
  if (Array.isArray(errors)) {
    return errors.map((entry) => {
      if (!entry) {
        return { field: '', message: '' };
      }
      if (typeof entry === 'string') {
        return { field: entry, message: '' };
      }
      if (typeof entry === 'object') {
        return {
          field: entry.field || entry.param || entry.path || '',
          message: entry.message || entry.msg || ''
        };
      }
      return { field: '', message: '' };
    });
  }
  return Object.keys(errors).map((field) => ({ field, message: errors[field] }));
}

function storeFormState(req, formId, { values = {}, errors = [], message = '' } = {}) {
  if (!req || !req.session || !formId) {
    return;
  }
  const state = req.session.formState || {};
  state[formId] = {
    values: sanitizeValues(values),
    errors: normalizeErrors(errors),
    message: message || ''
  };
  req.session.formState = state;
}

function createHelper(state = {}) {
  const getEntry = (formId) => state[formId] || null;
  return {
    has(formId) {
      return Boolean(getEntry(formId));
    },
    value(formId, field, fallback = '') {
      const entry = getEntry(formId);
      if (!entry) {
        return fallback;
      }
      if (Array.isArray(entry.values?.[field])) {
        return entry.values[field];
      }
      if (entry.errors?.some((error) => error.field === field)) {
        return fallback;
      }
      return entry.values?.[field] ?? fallback;
    },
    isInvalid(formId, field) {
      const entry = getEntry(formId);
      return Boolean(entry && entry.errors && entry.errors.some((error) => error.field === field));
    },
    fieldError(formId, field) {
      const entry = getEntry(formId);
      if (!entry) {
        return '';
      }
      const match = entry.errors?.find((error) => error.field === field);
      return match?.message || '';
    },
    message(formId) {
      const entry = getEntry(formId);
      return entry?.message || '';
    },
    errors(formId) {
      const entry = getEntry(formId);
      return entry?.errors || [];
    },
    serialize() {
      return JSON.parse(JSON.stringify(state));
    }
  };
}

function consumeFormState(req) {
  const raw = (req && req.session && req.session.formState) || {};
  if (req && req.session) {
    delete req.session.formState;
  }
  return createHelper(raw);
}

module.exports = {
  storeFormState,
  consumeFormState
};
