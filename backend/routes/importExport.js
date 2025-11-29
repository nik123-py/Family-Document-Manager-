// backend/routes/importExport.js
// Local-only import / export of user data as JSON

const express = require('express');
const { all, run } = require('../db');
const { encrypt, decrypt } = require('../cryptoUtil');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  next();
}

router.use(requireAuth);

// Helper for per-table field decryption
const encryptionConfig = {
  documents: ['number'],
  accounts: ['account_number'],
  insurances_loans: ['policy_loan_number'],
  lockers: ['locker_number'],
  properties: ['address']
};

function decryptRow(table, row) {
  const fields = encryptionConfig[table];
  if (!fields || !row) return row;
  const copy = { ...row };
  for (const f of fields) {
    if (copy[f]) copy[f] = decrypt(copy[f]);
  }
  return copy;
}

function encryptRow(table, row) {
  const fields = encryptionConfig[table];
  if (!fields || !row) return row;
  const copy = { ...row };
  for (const f of fields) {
    if (copy[f]) copy[f] = encrypt(copy[f]);
  }
  return copy;
}

// Export all data for current user
router.get('/export', async (req, res) => {
  const userId = req.session.userId;
  try {
    const familyMembers = await all(
      'SELECT * FROM family_members WHERE user_id = ?',
      [userId]
    );

    const data = [];
    for (const member of familyMembers) {
      const memberId = member.id;
      let documents = await all('SELECT * FROM documents WHERE family_member_id = ?', [memberId]);
      let accounts = await all('SELECT * FROM accounts WHERE family_member_id = ?', [memberId]);
      let insLoans = await all('SELECT * FROM insurances_loans WHERE family_member_id = ?', [
        memberId
      ]);
      let lockers = await all('SELECT * FROM lockers WHERE family_member_id = ?', [memberId]);
      let properties = await all('SELECT * FROM properties WHERE family_member_id = ?', [
        memberId
      ]);

      documents = documents.map((d) => decryptRow('documents', d));
      accounts = accounts.map((a) => decryptRow('accounts', a));
      insLoans = insLoans.map((i) => decryptRow('insurances_loans', i));
      lockers = lockers.map((l) => decryptRow('lockers', l));
      properties = properties.map((p) => decryptRow('properties', p));

      data.push({
        member,
        documents,
        accounts,
        insurances_loans: insLoans,
        lockers,
        properties
      });
    }

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      userId,
      familyData: data
    };

    res.setHeader('Content-Disposition', 'attachment; filename="family_data_export.json"');
    res.json(exportPayload);
  } catch (err) {
    console.error('Error exporting data:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Import JSON data for current user (overlays on top)
router.post('/import', async (req, res) => {
  const userId = req.session.userId;
  const payload = req.body;

  if (!payload || !Array.isArray(payload.familyData)) {
    return res
      .status(400)
      .json({ error: 'Invalid import format. Expecting { familyData: [...] }.' });
  }

  try {
    for (const entry of payload.familyData) {
      const m = entry.member;
      if (!m || !m.name) continue;

      const memberResult = await run(
        `INSERT INTO family_members (user_id, name, relationship, dob, notes)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, m.name, m.relationship || '', m.dob || '', m.notes || '']
      );
      const newMemberId = memberResult.lastID;

      const copyArray = async (tableName, rows, cols) => {
        for (const row of rows || []) {
          let obj = {};
          cols.forEach((c) => {
            obj[c] = row[c] || '';
          });
          obj = encryptRow(tableName, obj);
          const values = cols.map((c) => obj[c]);
          const placeholders = cols.map(() => '?').join(',');
          await run(
            `INSERT INTO ${tableName} (family_member_id, ${cols.join(',')})
             VALUES (?, ${placeholders})`,
            [newMemberId, ...values]
          );
        }
      };

      await copyArray('documents', entry.documents, [
        'type',
        'number',
        'issue_date',
        'expiry_date',
        'authority',
        'file_ref',
        'notes'
      ]);

      await copyArray('accounts', entry.accounts, [
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
      ]);

      await copyArray('insurances_loans', entry.insurances_loans, [
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
      ]);

      await copyArray('lockers', entry.lockers, [
        'bank_name',
        'branch',
        'locker_number',
        'joint_holders',
        'nominee',
        'notes'
      ]);

      await copyArray('properties', entry.properties, [
        'title',
        'address',
        'city',
        'state',
        'property_type',
        'linked_docs',
        'ownership_type',
        'co_owners',
        'notes'
      ]);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error importing data:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
