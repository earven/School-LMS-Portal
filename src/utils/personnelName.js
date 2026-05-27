const EXTENSION_PATTERN = /^(Jr\.?|Sr\.?|III|IV|II)$/i;

export function buildFullName({ lastName = '', firstName = '', middleName = '', nameExtension = '' } = {}) {
  const last = (lastName || '').trim();
  const first = (firstName || '').trim();
  const middle = (middleName || '').trim();
  const ext = (nameExtension || '').trim();

  const middlePart = middle ? ` ${middle.replace(/\.$/, '')}` : '';
  const extPart = ext ? ` ${ext}` : '';

  if (!last && !first) return '';

  if (last && first) {
    return `${last}, ${first}${middlePart}${extPart}`.trim();
  }

  return `${last || first}${middlePart}${extPart}`.trim();
}

export function parseLegacyFullName(fullName = '') {
  const trimmed = (fullName || '').trim();
  if (!trimmed) {
    return { lastName: '', firstName: '', middleInitial: '', nameExtension: '' };
  }

  if (trimmed.includes(',')) {
    const [lastPart, restPart] = trimmed.split(',').map((s) => s.trim());
    const tokens = (restPart || '').split(/\s+/).filter(Boolean);
    let nameExtension = '';

    if (tokens.length > 0 && EXTENSION_PATTERN.test(tokens[tokens.length - 1])) {
      nameExtension = tokens.pop();
    }

    const firstName = tokens[0] || '';
    const middleName = tokens.slice(1).join(' ').replace(/\.$/, '');

    return {
      lastName: lastPart || '',
      firstName,
      middleName,
      nameExtension,
    };
  }

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 1) {
    return { lastName: '', firstName: tokens[0], middleName: '', nameExtension: '' };
  }

  let nameExtension = '';
  if (EXTENSION_PATTERN.test(tokens[tokens.length - 1])) {
    nameExtension = tokens.pop();
  }

  const lastName = tokens.pop() || '';
  const firstName = tokens[0] || '';
  const middleName = tokens.slice(1).join(' ').replace(/\.$/, '');

  return { lastName, firstName, middleName, nameExtension };
}

export function normalizePersonnelRecord(person = {}) {
  const hasNameParts = person.lastName || person.firstName || person.middleName || person.middleInitial || person.nameExtension;

  if (hasNameParts) {
    const middleName = (person.middleName || person.middleInitial || '').trim();
    const nameFields = {
      lastName: (person.lastName || '').trim(),
      firstName: (person.firstName || '').trim(),
      middleName,
      middleInitial: middleName ? middleName.charAt(0) : '',
      nameExtension: (person.nameExtension || '').trim(),
    };
    return {
      ...person,
      ...nameFields,
      fullName: buildFullName(nameFields),
    };
  }

  const parsed = parseLegacyFullName(person.fullName);
  // Ensure parsed includes middleName for compatibility
  const middleName = parsed.middleName || '';
  return {
    ...person,
    ...parsed,
    middleName,
    middleInitial: middleName ? middleName.charAt(0) : '',
    fullName: person.fullName || buildFullName({ ...parsed, middleName }),
  };
}

export function preparePersonnelForSave(data = {}) {
  const hasNameParts =
    (data.lastName || '').trim() ||
    (data.firstName || '').trim() ||
    (data.middleInitial || '').trim() ||
    (data.nameExtension || '').trim();

  const nameFields = hasNameParts
    ? {
        lastName: (data.lastName || '').trim(),
        firstName: (data.firstName || '').trim(),
        middleInitial: (data.middleInitial || '').trim(),
        nameExtension: (data.nameExtension || '').trim(),
      }
    : parseLegacyFullName(data.fullName);

  return {
    ...data,
    ...nameFields,
    fullName: buildFullName(nameFields),
  };
}

export function getDisplayName(person) {
  return normalizePersonnelRecord(person).fullName;
}

export function personMatchesSearch(person, searchTerm = '') {
  const query = searchTerm.trim().toLowerCase();
  if (!query) return true;

  const normalized = normalizePersonnelRecord(person);
  const haystack = [
    normalized.fullName,
    normalized.lastName,
    normalized.firstName,
    normalized.middleInitial,
    normalized.nameExtension,
    person.email,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

export function comparePersonnel(a, b, sortField = 'lastName', sortDirection = 'asc') {
  const dir = sortDirection === 'desc' ? -1 : 1;
  const normA = normalizePersonnelRecord(a);
  const normB = normalizePersonnelRecord(b);

  const getValue = (person, field) => {
    switch (field) {
      case 'email':
        return (person.email || '').toLowerCase();
      case 'firstName':
        return (person.firstName || '').toLowerCase();
      case 'middleInitial':
        return (person.middleInitial || '').toLowerCase();
      case 'nameExtension':
        return (person.nameExtension || '').toLowerCase();
      case 'position':
        return (person.position || '').toLowerCase();
      case 'role':
        return (person.role || '').toLowerCase();
      case 'lastName':
      default:
        return (person.lastName || '').toLowerCase();
    }
  };

  const valueA = getValue(normA, sortField);
  const valueB = getValue(normB, sortField);

  if (valueA < valueB) return -1 * dir;
  if (valueA > valueB) return 1 * dir;

  const lastA = (normA.lastName || '').toLowerCase();
  const lastB = (normB.lastName || '').toLowerCase();
  if (lastA !== lastB) return lastA < lastB ? -1 * dir : 1 * dir;

  const firstA = (normA.firstName || '').toLowerCase();
  const firstB = (normB.firstName || '').toLowerCase();
  if (firstA < firstB) return -1 * dir;
  if (firstA > firstB) return 1 * dir;

  return 0;
}

export function hasRequiredNameFields(data = {}) {
  return Boolean((data.lastName || '').trim() && (data.firstName || '').trim());
}
