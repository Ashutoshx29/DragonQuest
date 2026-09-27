# Security Policy

## 1. Supported Versions

DragonQuest is currently in active development. Security updates and patches are applied to the `main` branch.

| Branch / Release | Supported |
| :--- | :--- |
| `main` (active development) | :white_check_mark: |
| Pre-release tags (`v0.1.x`) | :white_check_mark: |

---

## 2. Reporting a Vulnerability

If you discover a security vulnerability or potential data leak in DragonQuest, please report it responsibly rather than opening a public issue on GitHub.

- **Private Reporting**: Send details of the vulnerability to the project maintainers via email at `ashutoshx29@gmail.com` or via GitHub Private Vulnerability Reporting if enabled.
- **Details to Include**:
  - Description of the vulnerability and attack vector.
  - Steps to reproduce or proof-of-concept code.
  - Impact assessment (e.g. data exposure, local state corruption, RLS bypass).
- **Response Timeline**: We aim to acknowledge receipt of reports within 48 hours and provide a remediation timeline shortly thereafter.

---

## 3. Security Architecture & Invariants

DragonQuest is designed with an offline-first architecture prioritizing user privacy and data protection:

### 3.1 Zero Client Secrets
- Client builds contain **zero private credentials**, API secrets, or service keys.
- The mobile application connects to cloud services using only the public anonymous key (`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`).
- Secret keys (such as `SUPABASE_SERVICE_ROLE_KEY` or database connection strings) are **strictly forbidden** from mobile client builds and Git history.

### 3.2 Row Level Security (RLS)
- Remote PostgreSQL tables on Supabase enforce strict Row Level Security policies.
- Every user row is bound to the authenticated user ID (`auth.uid() = user_id`).
- Cloud synchronization operations explicitly scope queries to `auth.uid()` verified by active JWT session tokens.
- We never weaken or bypass RLS policies for testing or convenience.

### 3.3 Local Device Data Isolation
- Local database storage utilizes `expo-sqlite` within the sandboxed application directory on Android and iOS.
- Auth session tokens are stored securely in local device storage and are auto-refreshed only while the application is active in the foreground.

### 3.4 Idempotent Append-Only Ledgers
- Tables storing proof-of-effort (`xp_transactions`, `daily_completions`, `training_sessions`) are append-only.
- Sync push/pull mechanisms utilize natural-key deduplication targets (such as `(user_id, achievement_id)` or `(user_id, entity_type, entity_id, day)`) to protect against replay attacks and intentional duplicate reward exploitation.
