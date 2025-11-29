# Family Document Manager (Local-Only, Offline-First)

This project is a **local-only Single Page App** for managing sensitive family documents and financial details.

- ✅ Runs entirely on your own computer
- ✅ Uses a local SQLite database file
- ✅ No external APIs, no telemetry, no tracking
- ✅ Works even with **no internet connection**

---

## 1. Tech Stack

- **Frontend:** HTML, CSS, vanilla JavaScript (SPA)
- **Backend:** Node.js + Express
- **Database:** SQLite (via `sqlite3`), stored as `data/family_data.sqlite`
- **Auth:** Local users with bcrypt-hashed passwords and sessions (no external providers)

---

## 2. Privacy & Security

- Backend binds to `127.0.0.1` (localhost) only – it is **not exposed** to the network.
- No external network calls – no Google, no CDNs, no telemetry, no analytics.
- All frontend assets (HTML/CSS/JS) are served locally from the project.
- All data is stored locally in:
  - `data/family_data.sqlite` (main DB)
  - `data/sessions.sqlite` (session store)
- You can use this app with your **internet disconnected**.

> **Important:** This app is designed for local use only. Do **not** deploy it to the public internet as-is.

---

## 3. Features

### 3.1 Local User Login

- Create local accounts with **username + password**.
- Passwords are hashed with **bcrypt**.
- Authentication is done entirely on your machine – no remote auth server.

### 3.2 Family Members

Default relationships you might use:

- Me
- Mom
- Dad
- Sister
- Grandfather
- Grandmother

For each family member, you can store:

#### A. Basic Info

- Full Name
- Relationship (Mom, Dad, etc.)
- Date of Birth
- Notes

#### B. Identity & Personal Documents

You can track document records such as:

- Aadhaar card
- PAN card
- Passport
- Voter ID
- Driving License
- Passport size picture (only file reference text, **no uploads**)
- Birth Certificate
- Marriage Certificate

Each document includes:

- Document Type
- Document Number / ID
- Issue Date
- Expiry Date (if applicable)
- Issuing Authority
- File Reference (path / folder / description)
- Notes

#### C. Bank, Demat, PPF, NPS, SSY & Other Investments

Supports multiple records per person:

- Type (Bank Account, Demat, PPF, NPS, SSY, SGB, Other)
- Bank / Institution / Broker
- Branch / Location
- Account / Client / Folio Number
- Account Nickname (Salary Account, Joint Account, etc.)
- Account Holder Type (Single / Joint)
- Joint Holder Names
- IFSC (for bank accounts)
- Opening Date
- Maturity Date
- Current Value / Balance
- Nominee Name
- Notes

#### D. Insurance & Loans

For each person:

- Medical insurance
- Term insurance
- Car insurance
- LIC policies
- Home loan
- Personal / Education / Vehicle loans, etc.

Fields:

- Category (Medical Insurance, Term Insurance, Car Insurance, LIC, Home Loan, Personal Loan, etc.)
- Company / Bank
- Policy / Loan Number
- Product Name
- Coverage / Loan Amount
- Premium / EMI Amount
- Frequency (Monthly / Quarterly / Yearly)
- Start Date
- End / Maturity Date
- Nominee
- Linked Asset (car number, property address, etc.)
- Status (Active / Closed)
- Notes

#### E. Lockers & Properties

**Lockers**

- Bank Name
- Branch / Location
- Locker Number
- Joint Holder(s)
- Nominee
- Notes

**Properties**

- Property Title / Name
- Full Address
- City
- State
- Property Type (Flat / Land / House / Commercial, etc.)
- Linked Documents (Issue letter, utility bills, property tax receipts, etc.)
- Ownership Type (Single / Joint)
- Co-owner Names
- Notes

---

## 4. Import / Export

You can:

- **Export Data** – download all your data as a JSON file.
- **Import Data** – restore from such a JSON file.

Both operations are fully **local**:

- Export: browser downloads a JSON file.
- Import: JSON is sent to the local backend and stored in the local SQLite DB.
- No data is sent to any remote server.

---

## 5. Project Structure

```text
/backend
  server.js        # Express server (localhost-only)
  db.js            # SQLite initialization & helpers
  cryptoUtil.js    # Simple field-level encryption
  /routes
    auth.js        # Local auth (register/login/logout/me)
    family.js      # Family members, documents, accounts, insurance, lockers, properties
    importExport.js# Import / export JSON
/frontend
  index.html       # Single-page app (dark mode UI)
  styles.css       # Local CSS styles (dark, glassy)
  main.js          # Frontend logic (fetch API, modals, print summary)
/data
  family_data.sqlite  # (created automatically)
  sessions.sqlite     # (created automatically)
package.json
README.md
```

---

## 6. Installation & Usage

### 6.1 Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- npm (comes with Node.js)

### 6.2 Clone & Install

```bash
git clone <this-repo-url> family-document-manager
cd family-document-manager
npm install
```

### 6.3 Run

```bash
npm start
```

This starts the backend on **localhost only**:

- URL: `http://localhost:3000`
- Server binds to `127.0.0.1` (not exposed on your LAN/Wi-Fi).

Open your browser and go to:

```text
http://localhost:3000
```

### 6.4 Workflow

1. Register a local account (username + password).
2. Login.
3. Add family members (e.g., Me, Mom, Dad, etc.).
4. Click a member to:
   - Edit basic info
   - Add ID & documents (via modals)
   - Add accounts & investments
   - Add insurances & loans
   - Add lockers
   - Add properties
5. Use **Export Data** to save a backup JSON.
6. Use **Import Data** to restore from a previous export.
7. Use **Print Summary** to get a printable report per family member.

---

## 7. Simple Field Encryption (Optional but Recommended)

Some sensitive fields are stored encrypted at rest in the SQLite database using AES-256-GCM:

- Documents: `number`
- Accounts: `account_number`
- Insurance/Loans: `policy_loan_number`
- Lockers: `locker_number`
- Properties: `address`

The encryption key is derived from the `FDM_ENCRYPTION_KEY` environment variable:

```bash
# Example (Linux/macOS)
export FDM_ENCRYPTION_KEY="your-long-random-secret-value"
npm start
```

If `FDM_ENCRYPTION_KEY` is not set, a hard-coded development key is used, which is **less secure** and only meant for testing on a trusted machine.

---

## 8. Offline / Security Notes

- You can disconnect the internet completely – the app will still function:
  - All assets (`index.html`, `styles.css`, `main.js`) are loaded from your local machine.
  - All data requests go to `http://localhost:3000`.
- Data is stored in:
  - `data/family_data.sqlite`
  - `data/sessions.sqlite`
- No calls are made to any external server.
- There is no Google login, no social login, no remote logging, and no analytics.

> If you push this project to GitHub, **do not commit your `data/` directory** if it contains real personal data.

---

## 9. License

MIT (or your preferred license).
