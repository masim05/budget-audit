# Feature Specification: Budget Audit

**Feature Branch**: `001-budget-audit`

**Created**: 2026-05-17

**Status**: Draft

**Input**: User description: "Build an application that can help me audit my budget. Input: a folder with bank statements for several accounts (`./data` by default), date range (previous full calendar month by default). I have accounts in different currencies. The goal of the app is to calculate total income and total spend. Internal transfers between my own accounts net to zero and should not affect the final totals. The same goes for internal currency conversions between my accounts."

## Clarifications

### Session 2026-05-17

- Q: Which statement input format should v1 support? -> A: CSV statement files with documented required columns; future bank API support should be possible through adapters.
- Q: How should ambiguous internal transfer or conversion matches be handled? -> A: Let the user choose strict or permissive matching per run.
- Q: How does the CSV represent transaction amounts? -> A: Use the header `Date,Transaction Type,Transaction Number,Account Number,Credit,Debit,Credit(AMD),Debit(AMD),Remitter/Beneficiary,Details,Type`; `Credit` and `Debit` may be AMD or USD original amounts, while `Credit(AMD)` and `Debit(AMD)` are always AMD-normalized amounts.
- Q: What currency should final income and spend totals use? -> A: Report everything in USD.
- Q: What matching mode should be used by default? -> A: Default to strict matching.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Audit Previous Month From Default Folder (Priority: P1)

As a budget auditor, I want to run the application without extra input so that it analyzes statements in the default folder for the previous full calendar month and shows my income and spend totals.

**Why this priority**: This is the minimum useful workflow and matches the default behavior requested by the user.

**Independent Test**: Can be fully tested with a sample `./data` folder containing statements for the previous full calendar month and confirming the reported income and spend totals match the expected non-transfer transactions.

**Acceptance Scenarios**:

1. **Given** the default statement folder contains valid statements for multiple own accounts, **When** the user runs the audit without specifying a folder or date range, **Then** the app audits the previous full calendar month and reports total income and total spend.
2. **Given** the default statement folder contains transactions outside the previous full calendar month, **When** the user runs the audit without specifying dates, **Then** transactions outside the default date range are excluded from the totals.
3. **Given** a statement file cannot be read or recognized, **When** the user runs the audit, **Then** the app reports the affected file and does not silently include incomplete data in the final totals.

---

### User Story 2 - Audit A Custom Folder And Date Range (Priority: P2)

As a budget auditor, I want to provide a statement folder and date range so that I can audit any period and any statement collection.

**Why this priority**: Auditing arbitrary periods is essential after the default monthly workflow is proven.

**Independent Test**: Can be tested by providing a fixture folder and explicit start and end dates, then verifying only transactions in that inclusive range contribute to the report.

**Acceptance Scenarios**:

1. **Given** a custom folder contains valid statements, **When** the user provides that folder and a date range, **Then** the app audits only statement files in that folder and only transactions within the requested range.
2. **Given** the user provides a date range with no matching transactions, **When** the audit runs, **Then** the app reports zero income and zero spend for the requested range with a clear indication that no matching transactions were found.

---

### User Story 3 - Exclude Own-Account Transfers And Currency Conversions (Priority: P3)

As a budget auditor with multiple accounts and currencies, I want transfers and currency conversions between my own accounts to net to zero so that the report reflects real income and real spending only.

**Why this priority**: Without this behavior, moving money between accounts would inflate income, spend, or both.

**Independent Test**: Can be tested with statement fixtures containing matched transfer pairs, matched currency conversion pairs, and external transactions, then verifying only external transactions affect final totals.

**Acceptance Scenarios**:

1. **Given** two own accounts contain opposite sides of the same transfer in the same currency, **When** the audit runs, **Then** both transfer entries are excluded from income and spend totals.
2. **Given** two own accounts contain opposite sides of an internal currency conversion, **When** the audit runs, **Then** both conversion entries are excluded from income and spend totals even though their currencies and amounts differ.
3. **Given** a transaction resembles a transfer but no matching own-account counterpart exists, **When** the audit runs, **Then** the transaction is treated as external income or spend and is included in totals.

---

### User Story 4 - Review USD Totals Across Accounts (Priority: P4)

As a budget auditor with accounts in different currencies, I want final income and spend totals reported in USD so that I can compare my whole budget in one currency.

**Why this priority**: Multi-currency reporting is necessary for correctness, but it builds on accurate parsing, filtering, and transfer exclusion.

**Independent Test**: Can be tested with transactions in at least two account currencies and verifying final income and spend totals use the configured AMD-to-USD conversion after internal conversions are excluded.

**Acceptance Scenarios**:

1. **Given** the audited date range contains external income and spend from accounts in multiple currencies, **When** the audit completes, **Then** the report shows final income and spend totals in USD.
2. **Given** an account currency appears only in excluded internal conversions, **When** the audit completes, **Then** those conversions do not create non-zero USD income or spend totals.

### Edge Cases

- Empty input folder: the app reports that no statement files were found and returns zero totals without pretending an audit was complete.
- Missing input folder: the app reports the missing folder and does not produce misleading totals.
- Duplicate statement files or duplicate transactions: duplicates are detected or reported so they do not inflate totals silently.
- Partial transfer matches: unmatched entries are included as external transactions and flagged for review when matching evidence is insufficient.
- Same-day multiple transfers with similar amounts: matching uses enough transaction evidence to avoid excluding unrelated income or spend.
- Date boundary transactions: transactions on the start and end dates are included; transactions before the start or after the end are excluded.
- Refunds, reversals, and chargebacks: positive and negative external transactions are included according to their direction so totals reflect the final economic effect.
- Unsupported currency codes: affected transactions are reported and excluded from final totals unless their currency can be recognized confidently.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept a folder containing bank statement files for one or more accounts, using `./data` as the default folder when no folder is provided.
- **FR-002**: System MUST accept an optional date range and default to the previous full calendar month when no range is provided.
- **FR-003**: System MUST read transactions from CSV statement files in the selected folder.
- **FR-004**: System MUST support CSV statement files with the exact header `Date,Transaction Type,Transaction Number,Account Number,Credit,Debit,Credit(AMD),Debit(AMD),Remitter/Beneficiary,Details,Type`.
- **FR-005**: System MUST identify each transaction's date, account number, transaction number, transaction type, original credit amount, original debit amount, AMD-normalized credit amount, AMD-normalized debit amount, remitter or beneficiary, details, and type from the documented CSV columns.
- **FR-006**: System MUST treat populated `Credit` values as positive cash flow and populated `Debit` values as negative cash flow before internal transfer or conversion exclusions are applied.
- **FR-007**: System MUST include only transactions whose dates fall within the selected inclusive date range.
- **FR-008**: System MUST classify external positive cash flow as income and external negative cash flow as spend.
- **FR-009**: System MUST detect and exclude internal transfers between accounts represented in the input folder when the transfer sides can be matched with sufficient confidence.
- **FR-010**: System MUST detect and exclude internal currency conversions between accounts represented in the input folder when the conversion sides can be matched with sufficient confidence.
- **FR-011**: System MUST NOT allow internal transfers or internal currency conversions to increase or decrease final income and spend totals.
- **FR-012**: System MUST default to strict internal matching while letting the user choose strict or permissive internal matching for each audit run.
- **FR-013**: In strict matching mode, system MUST exclude only high-confidence internal transfers and conversions, include ambiguous candidates in income or spend totals, and report those candidates as warnings.
- **FR-014**: In permissive matching mode, system MUST exclude probable internal transfers and conversions and report excluded lower-confidence matches in the audit summary.
- **FR-015**: System MUST report final total income and final total spend in USD.
- **FR-016**: System MUST report statement files, transactions, or fields that could not be processed confidently.
- **FR-017**: System MUST provide a clear audit summary that includes the audited folder, date range, matching mode, account currencies found, USD income total, USD spend total, excluded internal transfers, excluded internal currency conversions, and any warnings.
- **FR-018**: System MUST avoid silently producing final totals when unreadable files or ambiguous transaction records could materially affect the result.
- **FR-019**: System MUST keep statement ingestion behind an input adapter boundary so future bank API ingestion can be added without changing core audit behavior.

### Quality & Architecture Requirements

- **QA-001**: Application behavior MUST be independently unit-testable with at least 98% unit coverage enforced in CI.
- **QA-002**: Domain behavior MUST remain independent of CLI framework, terminal, web, persistence, and infrastructure concerns.
- **QA-003**: Features with external interaction MUST identify the applicable inbound adapters, outbound ports, and outbound adapters.
- **QA-004**: CLI behavior MUST define arguments, successful output, diagnostics, and exit codes.
- **QA-005**: Development, tests, generated artifacts, and runtime behavior MUST NOT require MCP servers, clients, protocols, or tooling.

### Key Entities *(include if feature involves data)*

- **Statement File**: A CSV file in the selected input folder that may contain transactions for one account and period; key attributes include path, recognized account identity, recognized currency or currencies, processing status, and warnings.
- **Statement Source Adapter**: An input boundary that supplies statement transactions to the audit core; v1 uses CSV files, and future versions may add bank API adapters.
- **Account**: A financial account represented by one or more statement files in the input folder; key attributes include account identity, display name, and primary currency when available.
- **Transaction**: A dated movement of money on an account; key attributes include date, account number, transaction number, transaction type, original credit amount, original debit amount, AMD-normalized credit amount, AMD-normalized debit amount, remitter or beneficiary, details, type, source statement, and classification.
- **Internal Transfer Match**: A relationship between two or more own-account transactions that represent moving money between the user's own accounts and should be excluded from income and spend.
- **Internal Currency Conversion Match**: A relationship between two own-account transactions in different currencies that represent exchanging funds between the user's own accounts and should be excluded from income and spend.
- **Matching Mode**: The user's per-run choice for handling uncertain internal transfer and currency conversion candidates; strict mode is the default and includes ambiguous candidates in totals with warnings, while permissive mode excludes probable candidates with warnings.
- **Audit Report**: The final result for a folder and date range; key attributes include audited period, processed files, warnings, account currencies found, USD income total, USD spend total, excluded internal transfers, and excluded internal currency conversions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can complete the default previous-month audit from the default folder in under 30 seconds for a folder containing up to 24 monthly statement files.
- **SC-002**: For curated sample statements with known expected results, reported USD income and spend totals match expected totals exactly.
- **SC-003**: 100% of matched own-account transfers and own-account currency conversions in curated sample statements are excluded from income and spend totals.
- **SC-004**: 100% of unmatched external income and spend transactions in curated sample statements are included in the correct USD total.
- **SC-005**: Ambiguous or unreadable statement data is reported in the audit summary every time and is never silently ignored.
- **SC-006**: At least 90% of first-time users can identify the audited folder, date range, final income totals, final spend totals, and warnings from the report without additional documentation.

## Assumptions

- All accounts represented by statement files in the selected input folder are the user's own accounts.
- Statement files are CSV exports with the required header `Date,Transaction Type,Transaction Number,Account Number,Credit,Debit,Credit(AMD),Debit(AMD),Remitter/Beneficiary,Details,Type`.
- `Credit` and `Debit` contain original transaction amounts that may be AMD or USD; `Credit(AMD)` and `Debit(AMD)` contain AMD-normalized amounts.
- Final cross-currency totals are reported in USD by converting AMD-normalized totals to USD.
- The previous full calendar month is calculated relative to the date the audit is run.
- The first product interface is a CLI, in line with the project constitution, while core audit behavior remains reusable by future interfaces.
- Internal transfer and currency-conversion matching may use transaction evidence such as dates, amounts, currencies, account identities, and descriptions; strict matching is used by default, uncertain matches are handled according to the selected matching mode, and warnings are always reported rather than hidden.
