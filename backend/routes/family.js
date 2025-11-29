// backend/routes/family.js
// CRUD for family members and all related data (documents, accounts, etc.)

const express = require('express');
const { run, get, all } = require('../db');
const { encrypt, decrypt } = require('../cryptoUtil');

const router = express.Router();

// Fields to encrypt per table
const encryptionConfig = {
  documents: ['number'],
  accounts: ['account_number'],
  insurances_loans: ['policy_loan_number'],
  lockers: ['locker_number'],
  properties: ['address']
};

function encryptRow(table, row) {
  const fields = encryptionConfig[table];
  if (!fields || !row) return row;
  const copy = { ...row };
  for (const f of fields) {
    if (copy[f]) {
      copy[f] = encrypt(copy[f]);
    }
  }
  return copy;
}

function decryptRow(table, row) {
  const fields = encryptionConfig[table];
  if (!fields || !row) return row;
  const copy = { ...row };
  for (const f of fields) {
    if (copy[f]) {
      copy[f] = decrypt(copy[f]);
    }
  }
  return copy;
}

// Auth middleware – local-only, session-based
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  next();
}

router.use(requireAuth);

/**
 * FAMILY MEMBERS
 */

// Get all family members for current user
router.get('/family-members', async (req, res) => {
  try {
    const members = await all(
      'SELECT * FROM family_members WHERE user_id = ? ORDER BY id',
      [req.session.userId]
    );
    res.json({ members });
  } catch (err) {
    console.error('Error fetching family members:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Create family member
router.post('/family-members', async (req, res) => {
  const { name, relationship, dob, notes } = req.body || {};
  if (!name) {
    return res.status(400).json({ error: 'Name is required.' });
  }

  try {
    const result = await run(
      `INSERT INTO family_members (user_id, name, relationship, dob, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [req.session.userId, name, relationship || '', dob || '', notes || '']
    );
    const member = await get('SELECT * FROM family_members WHERE id = ?', [result.lastID]);
    res.json({ member });
  } catch (err) {
    console.error('Error creating family member:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Get one family member
router.get('/family-members/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const member = await get(
      'SELECT * FROM family_members WHERE id = ? AND user_id = ?',
      [id, req.session.userId]
    );
    if (!member) {
      return res.status(404).json({ error: 'Family member not found.' });
    }
    res.json({ member });
  } catch (err) {
    console.error('Error fetching family member:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Update family member (basic info)
router.put('/family-members/:id', async (req, res) => {
  const id = req.params.id;
  const { name, relationship, dob, notes } = req.body || {};

  try {
    const member = await get(
      'SELECT * FROM family_members WHERE id = ? AND user_id = ?',
      [id, req.session.userId]
    );
    if (!member) {
      return res.status(404).json({ error: 'Family member not found.' });
    }

    await run(
      `UPDATE family_members
       SET name = ?, relationship = ?, dob = ?, notes = ?
       WHERE id = ?`,
      [
        name || member.name,
        relationship || member.relationship,
        dob || member.dob,
        notes || member.notes,
        id
      ]
    );
    const updated = await get('SELECT * FROM family_members WHERE id = ?', [id]);
    res.json({ member: updated });
  } catch (err) {
    console.error('Error updating family member:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Delete family member
router.delete('/family-members/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const member = await get(
      'SELECT * FROM family_members WHERE id = ? AND user_id = ?',
      [id, req.session.userId]
    );
    if (!member) {
      return res.status(404).json({ error: 'Family member not found.' });
    }
    await run('DELETE FROM family_members WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting family member:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * Helper: generic list & create for child tables
 */

function listChild(table, extraWhere = '') {
  return async (req, res) => {
    const memberId = req.params.memberId;
    try {
      const member = await get(
        'SELECT * FROM family_members WHERE id = ? AND user_id = ?',
        [memberId, req.session.userId]
      );
      if (!member) {
        return res.status(404).json({ error: 'Family member not found.' });
      }
      let rows = await all(
        `SELECT * FROM ${table} WHERE family_member_id = ? ${extraWhere}`,
        [memberId]
      );
      rows = rows.map((r) => decryptRow(table, r));
      res.json({ items: rows });
    } catch (err) {
      console.error(`Error fetching ${table}:`, err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  };
}

function createChild(table, columns) {
  return async (req, res) => {
    const memberId = req.params.memberId;
    try {
      const member = await get(
        'SELECT * FROM family_members WHERE id = ? AND user_id = ?',
        [memberId, req.session.userId]
      );
      if (!member) {
        return res.status(404).json({ error: 'Family member not found.' });
      }

      let payload = {};
      columns.forEach((c) => {
        payload[c] = req.body[c] || '';
      });

      payload = encryptRow(table, payload);

      const values = columns.map((c) => payload[c]);
      const placeholders = columns.map(() => '?').join(',');
      const sql = `
        INSERT INTO ${table} (family_member_id, ${columns.join(',')})
        VALUES (?, ${placeholders})
      `;
      const result = await run(sql, [memberId, ...values]);
      let item = await get(`SELECT * FROM ${table} WHERE id = ?`, [result.lastID]);
      item = decryptRow(table, item);
      res.json({ item });
    } catch (err) {
      console.error(`Error creating ${table} record:`, err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  };
}

function updateChild(table, columns) {
  return async (req, res) => {
    const memberId = req.params.memberId;
    const id = req.params.id;

    try {
      const member = await get(
        'SELECT * FROM family_members WHERE id = ? AND user_id = ?',
        [memberId, req.session.userId]
      );
      if (!member) {
        return res.status(404).json({ error: 'Family member not found.' });
      }

      let existing = await get(
        `SELECT * FROM ${table} WHERE id = ? AND family_member_id = ?`,
        [id, memberId]
      );
      if (!existing) {
        return res.status(404).json({ error: 'Item not found.' });
      }

      existing = decryptRow(table, existing);

      let next = { ...existing };
      columns.forEach((c) => {
        if (req.body[c] !== undefined) {
          next[c] = req.body[c];
        }
      });

      const toStore = encryptRow(table, next);
      const sets = columns.map((c) => `${c} = ?`).join(', ');
      const values = columns.map((c) => toStore[c]);

      await run(`UPDATE ${table} SET ${sets} WHERE id = ?`, [...values, id]);
      let item = await get(`SELECT * FROM ${table} WHERE id = ?`, [id]);
      item = decryptRow(table, item);
      res.json({ item });
    } catch (err) {
      console.error(`Error updating ${table} record:`, err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  };
}

function deleteChild(table) {
  return async (req, res) => {
    const memberId = req.params.memberId;
    const id = req.params.id;

    try {
      const member = await get(
        'SELECT * FROM family_members WHERE id = ? AND user_id = ?',
        [memberId, req.session.userId]
      );
      if (!member) {
        return res.status(404).json({ error: 'Family member not found.' });
      }
      const existing = await get(
        `SELECT * FROM ${table} WHERE id = ? AND family_member_id = ?`,
        [id, memberId]
      );
      if (!existing) {
        return res.status(404).json({ error: 'Item not found.' });
      }

      await run(`DELETE FROM ${table} WHERE id = ?`, [id]);
      res.json({ success: true });
    } catch (err) {
      console.error(`Error deleting from ${table}:`, err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  };
}

/**
 * DOCUMENTS
 */
router.get('/family-members/:memberId/documents', listChild('documents'));
router.post(
  '/family-members/:memberId/documents',
  createChild('documents', [
    'type',
    'number',
    'issue_date',
    'expiry_date',
    'authority',
    'file_ref',
    'notes'
  ])
);
router.put(
  '/family-members/:memberId/documents/:id',
  updateChild('documents', [
    'type',
    'number',
    'issue_date',
    'expiry_date',
    'authority',
    'file_ref',
    'notes'
  ])
);
router.delete('/family-members/:memberId/documents/:id', deleteChild('documents'));

/**
 * ACCOUNTS & INVESTMENTS
 */
router.get('/family-members/:memberId/accounts', listChild('accounts'));
router.post(
  '/family-members/:memberId/accounts',
  createChild('accounts', [
    'type',
    'institution',
    'branch',
    'account_number',
    'nickname',
    'holder_type',
    'joint_holders',
    'ifsc',
    'open_date',
    'maturity_date',
    'value',
    'nominee',
    'notes'
  ])
);
router.put(
  '/family-members/:memberId/accounts/:id',
  updateChild('accounts', [
    'type',
    'institution',
    'branch',
    'account_number',
    'nickname',
    'holder_type',
    'joint_holders',
    'ifsc',
    'open_date',
    'maturity_date',
    'value',
    'nominee',
    'notes'
  ])
);
router.delete('/family-members/:memberId/accounts/:id', deleteChild('accounts'));

/**
 * INSURANCES & LOANS
 */
router.get('/family-members/:memberId/insurances-loans', listChild('insurances_loans'));
router.post(
  '/family-members/:memberId/insurances-loans',
  createChild('insurances_loans', [
    'category',
    'company',
    'policy_loan_number',
    'product_name',
    'amount',
    'premium_emi',
    'frequency',
    'start_date',
    'end_date',
    'nominee',
    'linked_asset',
    'status',
    'notes'
  ])
);
router.put(
  '/family-members/:memberId/insurances-loans/:id',
  updateChild('insurances_loans', [
    'category',
    'company',
    'policy_loan_number',
    'product_name',
    'amount',
    'premium_emi',
    'frequency',
    'start_date',
    'end_date',
    'nominee',
    'linked_asset',
    'status',
    'notes'
  ])
);
router.delete(
  '/family-members/:memberId/insurances-loans/:id',
  deleteChild('insurances_loans')
);

/**
 * LOCKERS
 */
router.get('/family-members/:memberId/lockers', listChild('lockers'));
router.post(
  '/family-members/:memberId/lockers',
  createChild('lockers', [
    'bank_name',
    'branch',
    'locker_number',
    'joint_holders',
    'nominee',
    'notes'
  ])
);
router.put(
  '/family-members/:memberId/lockers/:id',
  updateChild('lockers', [
    'bank_name',
    'branch',
    'locker_number',
    'joint_holders',
    'nominee',
    'notes'
  ])
);
router.delete('/family-members/:memberId/lockers/:id', deleteChild('lockers'));

/**
 * PROPERTIES
 */
router.get('/family-members/:memberId/properties', listChild('properties'));
router.post(
  '/family-members/:memberId/properties',
  createChild('properties', [
    'title',
    'address',
    'city',
    'state',
    'property_type',
    'linked_docs',
    'ownership_type',
    'co_owners',
    'notes'
  ])
);
router.put(
  '/family-members/:memberId/properties/:id',
  updateChild('properties', [
    'title',
    'address',
    'city',
    'state',
    'property_type',
    'linked_docs',
    'ownership_type',
    'co_owners',
    'notes'
  ])
);
router.delete('/family-members/:memberId/properties/:id', deleteChild('properties'));

module.exports = router;
