// frontend/main.js
// Simple SPA logic using fetch to local backend (http://localhost:3000)

// Helper for JSON fetch with error handling
async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'same-origin',
    ...options
  });

  let body = null;
  try {
    body = await res.json();
  } catch (e) {
    // ignore
  }

  if (!res.ok) {
    const errMsg = (body && body.error) || res.statusText || 'Request failed';
    throw new Error(errMsg);
  }
  return body;
}

const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
const headerUser = document.getElementById('header-user');
const authMessage = document.getElementById('auth-message');
const appMessage = document.getElementById('app-message');

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

const familyListEl = document.getElementById('family-list');
const addMemberBtn = document.getElementById('add-member-btn');

const selectedMemberNameEl = document.getElementById('selected-member-name');
const basicForm = document.getElementById('basic-form');
const deleteMemberBtn = document.getElementById('delete-member-btn');

const tabsEl = document.getElementById('tabs');
const tabButtons = tabsEl.querySelectorAll('.tab');
const memberBasicInfoCard = document.getElementById('member-basic-info');

const logoutBtn = document.getElementById('logout-btn');

const documentsTbody = document.getElementById('documents-tbody');
const accountsTbody = document.getElementById('accounts-tbody');
const insurancesTbody = document.getElementById('insurances-tbody');
const lockersTbody = document.getElementById('lockers-tbody');
const propertiesTbody = document.getElementById('properties-tbody');

const addDocumentBtn = document.getElementById('add-document-btn');
const addAccountBtn = document.getElementById('add-account-btn');
const addInsuranceBtn = document.getElementById('add-insurance-btn');
const addLockerBtn = document.getElementById('add-locker-btn');
const addPropertyBtn = document.getElementById('add-property-btn');

const importExportCard = document.getElementById('import-export');
const exportBtn = document.getElementById('export-btn');
const importFileInput = document.getElementById('import-file-input');
const importExportMessage = document.getElementById('import-export-message');

const printBtn = document.getElementById('print-summary-btn');
const printArea = document.getElementById('print-area');

// Modal elements
const modalOverlay = document.getElementById('modal-overlay');
const modalTitleEl = document.getElementById('modal-title');
const modalBodyEl = document.getElementById('modal-body');
const modalCloseBtn = document.getElementById('modal-close-btn');

let currentUser = null;
let familyMembers = [];
let selectedMemberId = null;
let currentModalOnSubmit = null;

/* ---------- Modal helpers ---------- */

function openModal(title, bodyNode, onSubmit) {
  modalTitleEl.textContent = title;
  modalBodyEl.innerHTML = '';
  if (bodyNode) modalBodyEl.appendChild(bodyNode);
  currentModalOnSubmit = onSubmit || null;
  modalOverlay.classList.remove('hidden');
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  modalBodyEl.innerHTML = '';
  currentModalOnSubmit = null;
}

modalCloseBtn.addEventListener('click', closeModal);

modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) {
    closeModal();
  }
});

/* ---------- Auth ---------- */

async function fetchCurrentUser() {
  try {
    const data = await apiFetch('/api/auth/me');
    currentUser = data.user;
    if (currentUser) {
      headerUser.textContent = `Logged in as: ${currentUser.username}`;
      authSection.classList.add('hidden');
      appSection.classList.remove('hidden');
      importExportCard.classList.remove('hidden');
      await loadFamilyMembers();
    } else {
      headerUser.textContent = '';
      authSection.classList.remove('hidden');
      appSection.classList.add('hidden');
    }
  } catch (err) {
    console.error(err);
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authMessage.textContent = '';
  const formData = new FormData(loginForm);
  const payload = {
    username: formData.get('username').trim(),
    password: formData.get('password')
  };

  try {
    await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    loginForm.reset();
    authMessage.textContent = '';
    await fetchCurrentUser();
  } catch (err) {
    authMessage.textContent = 'Login failed: ' + err.message;
  }
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authMessage.textContent = '';
  const formData = new FormData(registerForm);
  const payload = {
    username: formData.get('username').trim(),
    password: formData.get('password')
  };

  try {
    await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    registerForm.reset();
    authMessage.textContent = 'Account created and logged in.';
    await fetchCurrentUser();
  } catch (err) {
    authMessage.textContent = 'Registration failed: ' + err.message;
  }
});

logoutBtn.addEventListener('click', async () => {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' });
  } catch (err) {
    console.error(err);
  }
  currentUser = null;
  selectedMemberId = null;
  familyMembers = [];
  resetMemberView();
  await fetchCurrentUser();
});

/* ---------- Family Members ---------- */

async function loadFamilyMembers() {
  try {
    const data = await apiFetch('/api/family-members');
    familyMembers = data.members || [];
    renderFamilyList();
    appMessage.textContent = '';
  } catch (err) {
    appMessage.textContent = 'Failed to load family members: ' + err.message;
  }
}

function renderFamilyList() {
  familyListEl.innerHTML = '';
  if (!familyMembers.length) {
    const li = document.createElement('li');
    li.textContent = 'No members yet. Add one!';
    li.style.cursor = 'default';
    familyListEl.appendChild(li);
    return;
  }

  for (const member of familyMembers) {
    const li = document.createElement('li');
    li.dataset.id = member.id;
    if (member.id === selectedMemberId) {
      li.classList.add('active');
    }

    const span = document.createElement('span');
    span.textContent = member.name || '(Unnamed)';
    const rel = document.createElement('small');
    rel.textContent = member.relationship || '';

    li.appendChild(span);
    li.appendChild(rel);

    li.addEventListener('click', () => selectMember(member.id));

    familyListEl.appendChild(li);
  }
}

async function selectMember(memberId) {
  selectedMemberId = memberId;
  const member = familyMembers.find((m) => m.id === memberId);
  if (!member) return;

  selectedMemberNameEl.textContent = member.name || '(Unnamed)';
  memberBasicInfoCard.classList.remove('hidden');
  tabsEl.classList.remove('hidden');

  basicForm.name.value = member.name || '';
  basicForm.relationship.value = member.relationship || '';
  basicForm.dob.value = member.dob || '';
  basicForm.notes.value = member.notes || '';

  renderFamilyList();
  // Load all tab data
  await Promise.all([
    loadDocuments(),
    loadAccounts(),
    loadInsurances(),
    loadLockers(),
    loadProperties()
  ]);

  showTab('documents');
}

function resetMemberView() {
  selectedMemberNameEl.textContent = 'Select a family member';
  memberBasicInfoCard.classList.add('hidden');
  tabsEl.classList.add('hidden');
  hideAllPanels();
  documentsTbody.innerHTML = '';
  accountsTbody.innerHTML = '';
  insurancesTbody.innerHTML = '';
  lockersTbody.innerHTML = '';
  propertiesTbody.innerHTML = '';
}

addMemberBtn.addEventListener('click', async () => {
  const defaultMembers = ['Me', 'Mom', 'Dad', 'Sister', 'Grandfather', 'Grandmother'];
  const name = prompt('Enter full name (or choose from: Me, Mom, Dad, Sister, Grandfather, Grandmother):');
  if (!name) return;

  let relationship = '';
  if (defaultMembers.includes(name)) {
    relationship = name;
  }

  try {
    const data = await apiFetch('/api/family-members', {
      method: 'POST',
      body: JSON.stringify({ name, relationship })
    });
    familyMembers.push(data.member);
    renderFamilyList();
  } catch (err) {
    appMessage.textContent = 'Failed to add member: ' + err.message;
  }
});

basicForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!selectedMemberId) return;
  const formData = new FormData(basicForm);
  const payload = {
    name: formData.get('name').trim(),
    relationship: formData.get('relationship').trim(),
    dob: formData.get('dob'),
    notes: formData.get('notes')
  };
  if (!payload.name) {
    alert('Name is required');
    return;
  }

  try {
    const data = await apiFetch(`/api/family-members/${selectedMemberId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    const idx = familyMembers.findIndex((m) => m.id === selectedMemberId);
    if (idx >= 0) familyMembers[idx] = data.member;
    renderFamilyList();
    selectedMemberNameEl.textContent = data.member.name;
    appMessage.textContent = 'Basic info saved.';
  } catch (err) {
    appMessage.textContent = 'Failed to save basic info: ' + err.message;
  }
});

deleteMemberBtn.addEventListener('click', async () => {
  if (!selectedMemberId) return;
  if (!confirm('Delete this family member and all their data? This cannot be undone.')) {
    return;
  }
  try {
    await apiFetch(`/api/family-members/${selectedMemberId}`, {
      method: 'DELETE'
    });
    familyMembers = familyMembers.filter((m) => m.id !== selectedMemberId);
    selectedMemberId = null;
    resetMemberView();
    renderFamilyList();
  } catch (err) {
    appMessage.textContent = 'Failed to delete member: ' + err.message;
  }
});

/* ---------- Tabs ---------- */

function hideAllPanels() {
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.add('hidden'));
}

function showTab(tabName) {
  hideAllPanels();
  tabButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  document.getElementById(`tab-${tabName}`).classList.remove('hidden');
}

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    showTab(btn.dataset.tab);
  });
});

/* ---------- Documents (with modals) ---------- */

async function loadDocuments() {
  documentsTbody.innerHTML = '';
  if (!selectedMemberId) return;
  try {
    const data = await apiFetch(`/api/family-members/${selectedMemberId}/documents`);
    for (const doc of data.items) {
      addDocumentRow(doc);
    }
  } catch (err) {
    appMessage.textContent = 'Failed to load documents: ' + err.message;
  }
}

function addDocumentRow(doc) {
  const tr = document.createElement('tr');
  tr.dataset.id = doc.id;

  const cols = [
    'type',
    'number',
    'issue_date',
    'expiry_date',
    'authority',
    'file_ref',
    'notes'
  ];

  for (const field of cols) {
    const td = document.createElement('td');
    td.textContent = doc[field] || '';
    td.title = doc[field] || '';
    tr.appendChild(td);
  }

  const actionsTd = document.createElement('td');
  const actionsDiv = document.createElement('div');
  actionsDiv.classList.add('row-actions');

  const editBtn = document.createElement('button');
  editBtn.textContent = 'Edit';
  editBtn.classList.add('btn-small');

  const delBtn = document.createElement('button');
  delBtn.textContent = 'Delete';
  delBtn.classList.add('btn-small', 'btn-danger');

  editBtn.addEventListener('click', () => openDocumentModal(doc));
  delBtn.addEventListener('click', async () => {
    if (!confirm('Delete this document?')) return;
    try {
      await apiFetch(`/api/family-members/${selectedMemberId}/documents/${doc.id}`, {
        method: 'DELETE'
      });
      tr.remove();
    } catch (err) {
      appMessage.textContent = 'Failed to delete document: ' + err.message;
    }
  });

  actionsDiv.appendChild(editBtn);
  actionsDiv.appendChild(delBtn);
  actionsTd.appendChild(actionsDiv);
  tr.appendChild(actionsTd);

  documentsTbody.appendChild(tr);
}

function openDocumentModal(doc) {
  const isNew = !doc || !doc.id;
  const data = doc || {
    type: '',
    number: '',
    issue_date: '',
    expiry_date: '',
    authority: '',
    file_ref: '',
    notes: ''
  };

  const form = document.createElement('form');
  form.classList.add('modal-form');

  const fields = [
    { name: 'type', label: 'Document Type', type: 'text' },
    { name: 'number', label: 'Document Number / ID', type: 'text' },
    { name: 'issue_date', label: 'Issue Date', type: 'date' },
    { name: 'expiry_date', label: 'Expiry Date', type: 'date' },
    { name: 'authority', label: 'Issuing Authority', type: 'text' },
    { name: 'file_ref', label: 'File Reference (path/folder)', type: 'text' }
  ];

  fields.forEach((f) => {
    const label = document.createElement('label');
    label.textContent = f.label;
    const input = document.createElement('input');
    input.type = f.type;
    input.name = f.name;
    if (f.type === 'date' && data[f.name]) {
      input.value = data[f.name];
    } else {
      input.value = data[f.name] || '';
    }
    label.appendChild(input);
    form.appendChild(label);
  });

  const notesLabel = document.createElement('label');
  notesLabel.classList.add('full-width');
  notesLabel.textContent = 'Notes';
  const notesArea = document.createElement('textarea');
  notesArea.name = 'notes';
  notesArea.rows = 3;
  notesArea.value = data.notes || '';
  notesLabel.appendChild(notesArea);
  form.appendChild(notesLabel);

  const footer = document.createElement('div');
  footer.classList.add('modal-footer');

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.classList.add('btn-small', 'btn-secondary');
  cancelBtn.addEventListener('click', closeModal);

  const saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.textContent = isNew ? 'Add Document' : 'Save Changes';
  saveBtn.classList.add('btn-small');

  footer.appendChild(cancelBtn);
  footer.appendChild(saveBtn);
  form.appendChild(footer);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const payload = {};
    for (const [key, value] of formData.entries()) {
      payload[key] = value;
    }

    try {
      if (isNew) {
        const res = await apiFetch(`/api/family-members/${selectedMemberId}/documents`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        await loadDocuments();
      } else {
        await apiFetch(`/api/family-members/${selectedMemberId}/documents/${doc.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        await loadDocuments();
      }
      closeModal();
      appMessage.textContent = 'Document saved.';
    } catch (err) {
      appMessage.textContent = 'Failed to save document: ' + err.message;
    }
  });

  openModal(isNew ? 'Add Document' : 'Edit Document', form);
}

addDocumentBtn.addEventListener('click', async () => {
  if (!selectedMemberId) return;
  openDocumentModal(null);
});

/* ---------- Accounts & Investments (still inline) ---------- */

async function loadAccounts() {
  accountsTbody.innerHTML = '';
  if (!selectedMemberId) return;
  try {
    const data = await apiFetch(`/api/family-members/${selectedMemberId}/accounts`);
    for (const item of data.items) {
      addAccountRow(item);
    }
  } catch (err) {
    appMessage.textContent = 'Failed to load accounts: ' + err.message;
  }
}

function addAccountRow(acc) {
  const tr = document.createElement('tr');
  tr.dataset.id = acc.id;

  const fields = [
    'type',
    'institution',
    'account_number',
    'nickname',
    'holder_type',
    'ifsc',
    'value',
    'nominee'
  ];

  for (const f of fields) {
    const td = document.createElement('td');
    const input = document.createElement('input');
    input.value = acc[f] || '';
    input.dataset.field = f;
    td.appendChild(input);
    tr.appendChild(td);
  }

  const actionsTd = document.createElement('td');
  const rowActions = document.createElement('div');
  rowActions.classList.add('row-actions');

  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.classList.add('btn-small');

  const delBtn = document.createElement('button');
  delBtn.textContent = 'Delete';
  delBtn.classList.add('btn-small', 'btn-danger');

  saveBtn.addEventListener('click', async () => {
    const payload = {};
    tr.querySelectorAll('input').forEach((inp) => {
      payload[inp.dataset.field] = inp.value;
    });

    payload.branch = acc.branch || '';
    payload.joint_holders = acc.joint_holders || '';
    payload.open_date = acc.open_date || '';
    payload.maturity_date = acc.maturity_date || '';
    payload.notes = acc.notes || '';

    try {
      await apiFetch(`/api/family-members/${selectedMemberId}/accounts/${acc.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      appMessage.textContent = 'Account updated.';
    } catch (err) {
      appMessage.textContent = 'Failed to update account: ' + err.message;
    }
  });

  delBtn.addEventListener('click', async () => {
    if (!confirm('Delete this account/investment?')) return;
    try {
      await apiFetch(`/api/family-members/${selectedMemberId}/accounts/${acc.id}`, {
        method: 'DELETE'
      });
      tr.remove();
    } catch (err) {
      appMessage.textContent = 'Failed to delete account: ' + err.message;
    }
  });

  rowActions.appendChild(saveBtn);
  rowActions.appendChild(delBtn);
  actionsTd.appendChild(rowActions);
  tr.appendChild(actionsTd);
  accountsTbody.appendChild(tr);
}

addAccountBtn.addEventListener('click', async () => {
  if (!selectedMemberId) return;
  const type =
    prompt('Type (Bank Account, Demat Account, PPF, NPS, SSY, SGB, Other Investment):') ||
    'Bank Account';
  try {
    const data = await apiFetch(`/api/family-members/${selectedMemberId}/accounts`, {
      method: 'POST',
      body: JSON.stringify({
        type,
        holder_type: 'Single'
      })
    });
    addAccountRow(data.item);
  } catch (err) {
    appMessage.textContent = 'Failed to add account/investment: ' + err.message;
  }
});

/* ---------- Insurances & Loans (inline) ---------- */

async function loadInsurances() {
  insurancesTbody.innerHTML = '';
  if (!selectedMemberId) return;
  try {
    const data = await apiFetch(
      `/api/family-members/${selectedMemberId}/insurances-loans`
    );
    for (const item of data.items) {
      addInsuranceRow(item);
    }
  } catch (err) {
    appMessage.textContent = 'Failed to load insurances/loans: ' + err.message;
  }
}

function addInsuranceRow(it) {
  const tr = document.createElement('tr');
  tr.dataset.id = it.id;

  const fields = [
    'category',
    'company',
    'policy_loan_number',
    'product_name',
    'amount',
    'premium_emi',
    'frequency',
    'status'
  ];

  for (const f of fields) {
    const td = document.createElement('td');
    const input = document.createElement('input');
    input.value = it[f] || '';
    input.dataset.field = f;
    td.appendChild(input);
    tr.appendChild(td);
  }

  const actionsTd = document.createElement('td');
  const rowActions = document.createElement('div');
  rowActions.classList.add('row-actions');

  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.classList.add('btn-small');

  const delBtn = document.createElement('button');
  delBtn.textContent = 'Delete';
  delBtn.classList.add('btn-small', 'btn-danger');

  saveBtn.addEventListener('click', async () => {
    const payload = {};
    tr.querySelectorAll('input').forEach((inp) => {
      payload[inp.dataset.field] = inp.value;
    });

    payload.start_date = it.start_date || '';
    payload.end_date = it.end_date || '';
    payload.nominee = it.nominee || '';
    payload.linked_asset = it.linked_asset || '';
    payload.notes = it.notes || '';

    try {
      await apiFetch(`/api/family-members/${selectedMemberId}/insurances-loans/${it.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      appMessage.textContent = 'Insurance/loan updated.';
    } catch (err) {
      appMessage.textContent = 'Failed to update insurance/loan: ' + err.message;
    }
  });

  delBtn.addEventListener('click', async () => {
    if (!confirm('Delete this insurance/loan?')) return;
    try {
      await apiFetch(`/api/family-members/${selectedMemberId}/insurances-loans/${it.id}`, {
        method: 'DELETE'
      });
      tr.remove();
    } catch (err) {
      appMessage.textContent = 'Failed to delete insurance/loan: ' + err.message;
    }
  });

  rowActions.appendChild(saveBtn);
  rowActions.appendChild(delBtn);
  actionsTd.appendChild(rowActions);
  tr.appendChild(actionsTd);

  insurancesTbody.appendChild(tr);
}

addInsuranceBtn.addEventListener('click', async () => {
  if (!selectedMemberId) return;
  const category =
    prompt(
      'Category (Medical Insurance, Term Insurance, Car Insurance, LIC, Home Loan, Personal Loan, etc.):'
    ) || 'Medical Insurance';

  try {
    const data = await apiFetch(
      `/api/family-members/${selectedMemberId}/insurances-loans`,
      {
        method: 'POST',
        body: JSON.stringify({ category, status: 'Active' })
      }
    );
    addInsuranceRow(data.item);
  } catch (err) {
    appMessage.textContent = 'Failed to add insurance/loan: ' + err.message;
  }
});

/* ---------- Lockers (inline) ---------- */

async function loadLockers() {
  lockersTbody.innerHTML = '';
  if (!selectedMemberId) return;
  try {
    const data = await apiFetch(`/api/family-members/${selectedMemberId}/lockers`);
    for (const item of data.items) {
      addLockerRow(item);
    }
  } catch (err) {
    appMessage.textContent = 'Failed to load lockers: ' + err.message;
  }
}

function addLockerRow(lk) {
  const tr = document.createElement('tr');
  tr.dataset.id = lk.id;

  const fields = ['bank_name', 'branch', 'locker_number', 'joint_holders', 'nominee'];

  for (const f of fields) {
    const td = document.createElement('td');
    const input = document.createElement('input');
    input.value = lk[f] || '';
    input.dataset.field = f;
    td.appendChild(input);
    tr.appendChild(td);
  }

  const actionsTd = document.createElement('td');
  const rowActions = document.createElement('div');
  rowActions.classList.add('row-actions');

  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.classList.add('btn-small');

  const delBtn = document.createElement('button');
  delBtn.textContent = 'Delete';
  delBtn.classList.add('btn-small', 'btn-danger');

  saveBtn.addEventListener('click', async () => {
    const payload = {};
    tr.querySelectorAll('input').forEach((inp) => {
      payload[inp.dataset.field] = inp.value;
    });
    payload.notes = lk.notes || '';

    try {
      await apiFetch(`/api/family-members/${selectedMemberId}/lockers/${lk.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      appMessage.textContent = 'Locker updated.';
    } catch (err) {
      appMessage.textContent = 'Failed to update locker: ' + err.message;
    }
  });

  delBtn.addEventListener('click', async () => {
    if (!confirm('Delete this locker?')) return;
    try {
      await apiFetch(`/api/family-members/${selectedMemberId}/lockers/${lk.id}`, {
        method: 'DELETE'
      });
      tr.remove();
    } catch (err) {
      appMessage.textContent = 'Failed to delete locker: ' + err.message;
    }
  });

  rowActions.appendChild(saveBtn);
  rowActions.appendChild(delBtn);
  actionsTd.appendChild(rowActions);
  tr.appendChild(actionsTd);

  lockersTbody.appendChild(tr);
}

addLockerBtn.addEventListener('click', async () => {
  if (!selectedMemberId) return;
  try {
    const data = await apiFetch(`/api/family-members/${selectedMemberId}/lockers`, {
      method: 'POST',
      body: JSON.stringify({})
    });
    addLockerRow(data.item);
  } catch (err) {
    appMessage.textContent = 'Failed to add locker: ' + err.message;
  }
});

/* ---------- Properties (inline) ---------- */

async function loadProperties() {
  propertiesTbody.innerHTML = '';
  if (!selectedMemberId) return;
  try {
    const data = await apiFetch(`/api/family-members/${selectedMemberId}/properties`);
    for (const item of data.items) {
      addPropertyRow(item);
    }
  } catch (err) {
    appMessage.textContent = 'Failed to load properties: ' + err.message;
  }
}

function addPropertyRow(p) {
  const tr = document.createElement('tr');
  tr.dataset.id = p.id;

  const fields = ['title', 'address', 'city', 'property_type', 'ownership_type', 'co_owners'];

  for (const f of fields) {
    const td = document.createElement('td');
    const input = document.createElement('input');
    input.value = p[f] || '';
    input.dataset.field = f;
    td.appendChild(input);
    tr.appendChild(td);
  }

  const actionsTd = document.createElement('td');
  const rowActions = document.createElement('div');
  rowActions.classList.add('row-actions');

  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.classList.add('btn-small');

  const delBtn = document.createElement('button');
  delBtn.textContent = 'Delete';
  delBtn.classList.add('btn-small', 'btn-danger');

  saveBtn.addEventListener('click', async () => {
    const payload = {};
    tr.querySelectorAll('input').forEach((inp) => {
      payload[inp.dataset.field] = inp.value;
    });

    payload.state = p.state || '';
    payload.linked_docs = p.linked_docs || '';
    payload.notes = p.notes || '';

    try {
      await apiFetch(`/api/family-members/${selectedMemberId}/properties/${p.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      appMessage.textContent = 'Property updated.';
    } catch (err) {
      appMessage.textContent = 'Failed to update property: ' + err.message;
    }
  });

  delBtn.addEventListener('click', async () => {
    if (!confirm('Delete this property?')) return;
    try {
      await apiFetch(`/api/family-members/${selectedMemberId}/properties/${p.id}`, {
        method: 'DELETE'
      });
      tr.remove();
    } catch (err) {
      appMessage.textContent = 'Failed to delete property: ' + err.message;
    }
  });

  rowActions.appendChild(saveBtn);
  rowActions.appendChild(delBtn);
  actionsTd.appendChild(rowActions);
  tr.appendChild(actionsTd);

  propertiesTbody.appendChild(tr);
}

addPropertyBtn.addEventListener('click', async () => {
  if (!selectedMemberId) return;
  try {
    const data = await apiFetch(`/api/family-members/${selectedMemberId}/properties`, {
      method: 'POST',
      body: JSON.stringify({})
    });
    addPropertyRow(data.item);
  } catch (err) {
    appMessage.textContent = 'Failed to add property: ' + err.message;
  }
});

/* ---------- Import / Export ---------- */

exportBtn.addEventListener('click', async () => {
  importExportMessage.textContent = '';
  try {
    const res = await fetch('/api/export', { credentials: 'same-origin' });
    if (!res.ok) throw new Error('Export failed');

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'family_data_export.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    importExportMessage.textContent = 'Exported data as JSON.';
  } catch (err) {
    importExportMessage.textContent = 'Export failed: ' + err.message;
  }
});

importFileInput.addEventListener('change', async () => {
  importExportMessage.textContent = '';
  const file = importFileInput.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const json = JSON.parse(text);
    await apiFetch('/api/import', {
      method: 'POST',
      body: JSON.stringify(json)
    });
    importExportMessage.textContent = 'Import completed.';
    await loadFamilyMembers();
  } catch (err) {
    importExportMessage.textContent = 'Import failed: ' + err.message;
  } finally {
    importFileInput.value = '';
  }
});

/* ---------- Printable Summary per Family Member ---------- */

printBtn.addEventListener('click', async () => {
  if (!selectedMemberId) {
    alert('Please select a family member first.');
    return;
  }

  try {
    const member = familyMembers.find((m) => m.id === selectedMemberId);

    const [docs, accounts, insLoans, lockers, properties] = await Promise.all([
      apiFetch(`/api/family-members/${selectedMemberId}/documents`),
      apiFetch(`/api/family-members/${selectedMemberId}/accounts`),
      apiFetch(`/api/family-members/${selectedMemberId}/insurances-loans`),
      apiFetch(`/api/family-members/${selectedMemberId}/lockers`),
      apiFetch(`/api/family-members/${selectedMemberId}/properties`)
    ]);

    buildPrintSummary(member, docs.items || [], accounts.items || [], insLoans.items || [], lockers.items || [], properties.items || []);

    document.body.classList.add('printing');
    window.print();
    document.body.classList.remove('printing');
    printArea.innerHTML = '';
  } catch (err) {
    appMessage.textContent = 'Failed to generate summary: ' + err.message;
  }
});

function buildPrintSummary(member, docs, accounts, insLoans, lockers, properties) {
  printArea.innerHTML = '';

  const title = document.createElement('h2');
  title.textContent = `Family Summary – ${member.name || '(Unnamed)'}`;
  printArea.appendChild(title);

  const basicSection = document.createElement('div');
  basicSection.classList.add('print-section');
  basicSection.innerHTML = `
    <h3>Basic Info</h3>
    <p><strong>Name:</strong> ${member.name || ''}</p>
    <p><strong>Relationship:</strong> ${member.relationship || ''}</p>
    <p><strong>Date of Birth:</strong> ${member.dob || ''}</p>
    <p><strong>Notes:</strong> ${member.notes || ''}</p>
  `;
  printArea.appendChild(basicSection);

  const addTableSection = (titleText, items, columns) => {
    const section = document.createElement('div');
    section.classList.add('print-section');
    const h = document.createElement('h3');
    h.textContent = titleText;
    section.appendChild(h);

    if (!items.length) {
      const p = document.createElement('p');
      p.textContent = 'No records.';
      section.appendChild(p);
      printArea.appendChild(section);
      return;
    }

    const table = document.createElement('table');
    table.classList.add('print-table');

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    columns.forEach((c) => {
      const th = document.createElement('th');
      th.textContent = c.label;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    items.forEach((item) => {
      const tr = document.createElement('tr');
      columns.forEach((c) => {
        const td = document.createElement('td');
        td.textContent = item[c.field] || '';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    section.appendChild(table);
    printArea.appendChild(section);
  };

  addTableSection('Documents', docs, [
    { field: 'type', label: 'Type' },
    { field: 'number', label: 'Number' },
    { field: 'issue_date', label: 'Issue Date' },
    { field: 'expiry_date', label: 'Expiry' },
    { field: 'authority', label: 'Authority' },
    { field: 'file_ref', label: 'File Ref' }
  ]);

  addTableSection('Accounts & Investments', accounts, [
    { field: 'type', label: 'Type' },
    { field: 'institution', label: 'Institution' },
    { field: 'account_number', label: 'Account / Client ID' },
    { field: 'nickname', label: 'Nickname' },
    { field: 'holder_type', label: 'Holder Type' },
    { field: 'ifsc', label: 'IFSC' },
    { field: 'value', label: 'Value' }
  ]);

  addTableSection('Insurance & Loans', insLoans, [
    { field: 'category', label: 'Category' },
    { field: 'company', label: 'Company' },
    { field: 'policy_loan_number', label: 'Policy / Loan #' },
    { field: 'product_name', label: 'Product' },
    { field: 'amount', label: 'Amount' },
    { field: 'premium_emi', label: 'Premium / EMI' },
    { field: 'status', label: 'Status' }
  ]);

  addTableSection('Lockers', lockers, [
    { field: 'bank_name', label: 'Bank' },
    { field: 'branch', label: 'Branch' },
    { field: 'locker_number', label: 'Locker #' },
    { field: 'joint_holders', label: 'Joint Holders' },
    { field: 'nominee', label: 'Nominee' }
  ]);

  addTableSection('Properties', properties, [
    { field: 'title', label: 'Title' },
    { field: 'address', label: 'Address' },
    { field: 'city', label: 'City' },
    { field: 'property_type', label: 'Type' },
    { field: 'ownership_type', label: 'Ownership' }
  ]);
}

/* ---------- Init ---------- */

fetchCurrentUser();
