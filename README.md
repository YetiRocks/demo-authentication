<p align="center">
  <img src="https://cdn.prod.website-files.com/68e09cef90d613c94c3671c0/697e805a9246c7e090054706_logo_horizontal_grey.png" alt="Yeti" width="200" />
</p>

---

# demo-authentication

[![Yeti](https://img.shields.io/badge/Yeti-Demo-blue)](https://yetirocks.com)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> **[Yeti](https://yetirocks.com)** - The Performance Platform for Agent-Driven Development.
> Schema-driven APIs, real-time streaming, and vector search. From prompt to production.

**A complete authentication and authorization demo.** Three auth methods, role-based field masking, and a live React UI -- all in one yeti application.

Demo-authentication shows how yeti's built-in auth system handles Basic auth, JWT tokens, and OAuth providers side-by-side. Admins see every field on an employee record. Viewers see the same endpoint but sensitive fields -- salary, SSN, home address, personal email -- are stripped server-side before the response leaves the wire. No application code required. The schema defines the data, the roles define the permissions, and yeti enforces both automatically.

---

## Why This Demo

Authentication tutorials usually demonstrate one method in isolation. Real applications need all three: service-to-service calls use Basic auth, SPAs use JWT, and end users expect "Sign in with Google." Building that means configuring three separate middleware layers, writing token validation logic, and hand-rolling field-level access control.

This demo collapses all of that into yeti's declarative auth system:

- **Three auth methods, zero application code** -- Basic, JWT, and OAuth are configured in `config.yaml` and enforced by the yeti-auth extension. No middleware to write, no token parsing, no session management.
- **Attribute-level permissions** -- roles define which table fields are visible. The `viewer` role cannot read `salary`, `ssn`, `homeAddress`, or `personalEmail`. The server strips these fields before serialization, not after.
- **OAuth role mapping** -- provider-based rules assign roles automatically. Google users get `admin`, GitHub users get `viewer`. No user provisioning step required.
- **Seed data on startup** -- `authLoader` and `dataLoader` populate users, roles, and employee records on first boot. The demo is functional immediately.
- **Live React UI** -- a single-page app lets you log in with each method, switch between users, and see the RBAC difference in real time.

---

## Quick Start

### 1. Install

```bash
cd ~/yeti/applications
git clone https://github.com/yetirocks/demo-authentication.git
```

Restart yeti. The frontend builds automatically on first load via `npm run build` and is served as a static SPA.

### 2. Log in with Basic auth

```bash
curl -s https://localhost:9996/demo-authentication/Employee/?limit=5 \
  -u admin:admin123 | jq
```

Response (admin -- all fields visible):
```json
[
  {
    "id": "emp-001",
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "department": "Engineering",
    "title": "Senior Developer",
    "salary": 145000,
    "ssn": "123-45-6789",
    "homeAddress": "123 Oak Street, San Francisco, CA",
    "personalEmail": "alice.j@personal.com"
  }
]
```

```bash
curl -s https://localhost:9996/demo-authentication/Employee/?limit=5 \
  -u user:user123 | jq
```

Response (viewer -- sensitive fields stripped):
```json
[
  {
    "id": "emp-001",
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "department": "Engineering",
    "title": "Senior Developer"
  }
]
```

The same endpoint, the same data, different fields. The `viewer` role has `attribute_permissions` that deny read access to `salary`, `ssn`, `homeAddress`, and `personalEmail`.

### 3. Log in with JWT

```bash
# Obtain a token pair
curl -s -X POST https://localhost:9996/yeti-auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}' | jq
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 900
}
```

```bash
# Use the access token
curl -s https://localhost:9996/demo-authentication/Employee/?limit=5 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." | jq
```

```bash
# Refresh when the access token expires (15 min default)
curl -s -X POST https://localhost:9996/yeti-auth/jwt_refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "eyJhbGciOiJIUzI1NiIs..."}' | jq
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...<new>",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...<new>",
  "token_type": "Bearer",
  "expires_in": 900
}
```

### 4. Log in with OAuth

OAuth requires a browser. The flow works like this:

```bash
# 1. Redirect the user to the OAuth login endpoint
#    (open in browser -- this initiates the provider redirect)
open "https://localhost:9996/yeti-auth/oauth_login?provider=github&redirect_uri=/demo-authentication/"

# 2. After the provider callback, the user lands back at the app
#    with an authenticated session cookie

# 3. Check the session
curl -s https://localhost:9996/yeti-auth/oauth_user \
  --cookie "yeti_session=<session-cookie>" | jq
```

Response:
```json
{
  "authenticated": true,
  "provider": "github",
  "user": {
    "login": "octocat",
    "name": "The Octocat",
    "email": "octocat@github.com",
    "avatar_url": "https://avatars.githubusercontent.com/u/..."
  }
}
```

```bash
# 4. Discover available providers and their role mappings
curl -s "https://localhost:9996/yeti-auth/oauth_providers?app_id=demo-authentication" | jq
```

Response:
```json
{
  "providers": [
    { "name": "github" },
    { "name": "google" }
  ],
  "roles": {
    "github": "viewer",
    "google": "admin"
  }
}
```

### 5. Open the web UI

```
https://localhost:9996/demo-authentication/
```

The React frontend provides a visual interface for all three auth methods. Log in with Basic or JWT using the seeded credentials, or click an OAuth provider button. After login, click "GET /Employee" to see the role-based field masking in action.

---

## Architecture

```
Browser / curl / Agent
    |
    +-- Basic auth header ----> yeti-auth (BasicAuthProvider)
    +-- Bearer JWT token -----> yeti-auth (JwtAuthProvider)
    +-- OAuth redirect -------> yeti-auth (OAuthAuthProvider)
          |
          v
    +--------------------------------------------------+
    |              yeti-auth extension                  |
    |  +---------------+  +------------------+         |
    |  |  Credential   |  |  Role            |         |
    |  |  validation   |  |  resolution      |         |
    |  |  (Argon2id)   |  |  (User -> Role)  |         |
    |  +---------------+  +------------------+         |
    |         |                    |                    |
    |         v                    v                    |
    |  +------------------------------------------+    |
    |  |  Attribute-level permission enforcement   |    |
    |  |  (strip fields denied by role)            |    |
    |  +------------------------------------------+    |
    +--------------------------------------------------+
          |
          v
    +--------------------------------------------------+
    |           demo-authentication                     |
    |  +------------+  +---------+  +--------+         |
    |  |  Employee  |  |  User   |  |  Role  |         |
    |  |  (data)    |  |  (auth) |  | (auth) |         |
    |  +------------+  +---------+  +--------+         |
    |                                                  |
    |  React SPA (login UI + RBAC visualization)       |
    +--------------------------------------------------+
          |
          v
    Yeti (embedded RocksDB, yeti-auth extension)
```

**Auth flow:** Request arrives -> yeti-auth inspects `Authorization` header or session cookie -> validates credentials (Argon2id hash check, JWT signature, or OAuth session lookup) -> resolves user to role -> applies `attribute_permissions` to strip denied fields -> returns filtered response.

**Role resolution:** Basic/JWT -> `User.roleId` -> Role table lookup. OAuth -> config rules match provider name to role ID -> Role table lookup.

---

## Features

### Basic Authentication

HTTP Basic auth using the `Authorization: Basic <base64>` header. Credentials are validated against the User table with Argon2id password hashing. A 5-minute credential cache avoids repeated hash computations.

```bash
# Admin -- full access
curl -u admin:admin123 https://localhost:9996/demo-authentication/Employee/?limit=5

# Viewer -- restricted fields
curl -u user:user123 https://localhost:9996/demo-authentication/Employee/?limit=5
```

**Seeded users:**

| Username | Password | Role | Access Level |
|----------|----------|------|-------------|
| `admin` | `admin123` | admin | All fields, full CRUD |
| `user` | `user123` | viewer | Public fields only, read-only |

### JWT Authentication

JSON Web Token auth using the `Authorization: Bearer <token>` header. Tokens are issued by `POST /yeti-auth/login` and contain embedded permissions, so authenticated requests skip the database lookup.

| Parameter | Value |
|-----------|-------|
| Algorithm | HS256 |
| Access token TTL | 900 seconds (15 minutes) |
| Refresh token TTL | 604800 seconds (7 days) |
| Secret | `${JWT_SECRET}` environment variable |

**Token lifecycle:**

1. `POST /yeti-auth/login` with `username` and `password` -- returns `access_token` + `refresh_token`
2. Use `access_token` in `Authorization: Bearer` header for API calls
3. When `access_token` expires, `POST /yeti-auth/jwt_refresh` with `refresh_token` -- returns a new token pair
4. `DELETE /yeti-auth/login` to invalidate the session

### OAuth Authentication

Browser-based OAuth 2.0 with automatic role assignment. Users are redirected to the provider, authenticated, and redirected back with a session cookie. No user pre-provisioning is needed -- role is determined by provider-based rules in `config.yaml`.

**Configured providers:**

| Provider | Role Assigned | Config Required |
|----------|--------------|----------------|
| Google | `admin` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| GitHub | `viewer` | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` |

**OAuth endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/yeti-auth/oauth_login` | GET | Initiate OAuth flow (query: `provider`, `redirect_uri`) |
| `/yeti-auth/oauth_callback` | GET | Handle provider redirect (internal) |
| `/yeti-auth/oauth_user` | GET | Check current OAuth session |
| `/yeti-auth/oauth_logout` | POST | Clear OAuth session |
| `/yeti-auth/oauth_refresh` | POST | Refresh provider access token |
| `/yeti-auth/oauth_providers` | GET | List available providers and role mappings |

**OAuth flow:**
1. Frontend redirects to `/yeti-auth/oauth_login?provider=github&redirect_uri=/demo-authentication/`
2. yeti-auth redirects to GitHub's authorization page
3. User authorizes the application
4. GitHub redirects to `/yeti-auth/oauth_callback` with an authorization code
5. yeti-auth exchanges the code for tokens, resolves role via config rules, sets session cookie
6. User is redirected to `/demo-authentication/` with an active session

### Role-Based Field Masking

The core feature this demo illustrates. Two roles access the same `Employee` table endpoint but receive different fields in the response:

| Field | Admin | Viewer |
|-------|:-----:|:------:|
| `id` | visible | visible |
| `name` | visible | visible |
| `email` | visible | visible |
| `department` | visible | visible |
| `title` | visible | visible |
| `salary` | visible | **denied** |
| `ssn` | visible | **denied** |
| `homeAddress` | visible | **denied** |
| `personalEmail` | visible | **denied** |

Field masking is enforced server-side via `attribute_permissions` in the role definition. The denied fields are removed from the serialized response before it is sent -- they never leave the server. No application code is involved.

### React Frontend

A single-page application built with React and Vite that provides a visual interface for the demo:

- **Login panel** -- switch between Basic auth, JWT, and OAuth login methods
- **Employee data panel** -- fetch employee records and see which fields are returned
- **Role indicator** -- shows current user, auth method, and assigned role
- **Development mode notice** -- warns when auth is bypassed in dev mode

---

## Data Model

### Employee Table

The primary data table demonstrating attribute-level access control.

| Field | Type | Required | Sensitive | Description |
|-------|------|:--------:|:---------:|-------------|
| `id` | String | Yes | No | Unique employee identifier (e.g., "emp-001") |
| `name` | String | Yes | No | Full name |
| `email` | String | Yes | No | Work email address |
| `department` | String | Yes | No | Department name |
| `title` | String | Yes | No | Job title |
| `salary` | Float | No | **Yes** | Annual salary (admin only) |
| `ssn` | String | No | **Yes** | Social security number (admin only) |
| `homeAddress` | String | No | **Yes** | Home address (admin only) |
| `personalEmail` | String | No | **Yes** | Personal email address (admin only) |

### User Table (yeti-auth)

Seeded via `authLoader` on startup.

| Field | Value | Description |
|-------|-------|-------------|
| `username` | `admin` | Admin user with full CRUD access |
| `password` | `admin123` | Hashed with Argon2id on load |
| `roleId` | `admin` | References the admin role |
| `email` | `admin@example.com` | User email |
| `username` | `user` | Standard user with read-only access |
| `password` | `user123` | Hashed with Argon2id on load |
| `roleId` | `viewer` | References the viewer role |
| `email` | `user@example.com` | User email |

### Role Table (yeti-auth)

Seeded via `authLoader` on startup. Defines permissions per database, per table, per field.

| Role | Employee CRUD | Attribute Restrictions |
|------|:------------:|----------------------|
| `super_user` | Full (all databases) | None |
| `admin` | Read, Insert, Update, Delete | None -- all fields visible |
| `viewer` | Read only | `salary`, `ssn`, `homeAddress`, `personalEmail` denied |

---

## Configuration

### config.yaml

```yaml
name: "Authentication Demo"
app_id: "demo-authentication"
version: "1.0.0"
description: "Role-based access control with Basic, JWT, and OAuth login"
schemas:
  - schemas/auth.graphql

dataLoader: data/employees.json        # Seed employee records on startup

authLoader:                             # Seed users and roles on startup
  roles: data/roles.json
  users: data/users.json

static_files:                           # React SPA served at /
  path: web
  spa: true
  build:
    sourceDir: source
    command: npm run build

auth:
  jwt:
    secret: "${JWT_SECRET}"             # Set via environment variable
    accessTtl: 900                      # 15 minutes
    refreshTtl: 604800                  # 7 days
  oauth:
    github:
      clientId: "${GITHUB_CLIENT_ID}"
      clientSecret: "${GITHUB_CLIENT_SECRET}"
    google:
      clientId: "${GOOGLE_CLIENT_ID}"
      clientSecret: "${GOOGLE_CLIENT_SECRET}"
    rules:
      - strategy: provider              # Match by OAuth provider name
        pattern: "google"
        role: admin                     # Google users -> admin role
      - strategy: provider
        pattern: "github"
        role: viewer                    # GitHub users -> viewer role
```

### Environment Variables

| Variable | Required | Description |
|----------|:--------:|-------------|
| `JWT_SECRET` | Yes | Secret key for HS256 JWT signing |
| `GITHUB_CLIENT_ID` | For OAuth | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | For OAuth | GitHub OAuth app client secret |
| `GOOGLE_CLIENT_ID` | For OAuth | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | For OAuth | Google OAuth client secret |

Basic auth and JWT work without any environment variables (JWT will use a default secret in development mode). OAuth requires valid provider credentials.

### Seed Data

The demo ships with three data files that are loaded on startup:

| File | Purpose | Records |
|------|---------|:-------:|
| `data/employees.json` | Employee records for the RBAC demo | 5 |
| `data/users.json` | Auth users (admin + user) | 2 |
| `data/roles.json` | Auth roles (super_user + admin + viewer) | 3 |

---

## REST Endpoints

### Employee (auto-generated from schema)

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/demo-authentication/Employee` | GET, POST | List/create employees |
| `/demo-authentication/Employee/{id}` | GET, PUT, DELETE | Read/update/delete an employee |
| `/demo-authentication/Employee?stream=sse` | GET | Real-time SSE stream of changes |

### Auth (provided by yeti-auth extension)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/yeti-auth/login` | POST | JWT login (username + password -> token pair) |
| `/yeti-auth/login` | DELETE | Logout (clear session cookie) |
| `/yeti-auth/jwt_refresh` | POST | Refresh an expired access token |
| `/yeti-auth/oauth_login` | GET | Initiate OAuth flow |
| `/yeti-auth/oauth_callback` | GET | OAuth provider redirect target |
| `/yeti-auth/oauth_user` | GET | Current OAuth session info |
| `/yeti-auth/oauth_logout` | POST | Clear OAuth session |
| `/yeti-auth/oauth_providers` | GET | List providers and role mappings |
| `/yeti-auth/auth` | GET | Auth status check |

---

## Project Structure

```
demo-authentication/
├── config.yaml              # App configuration with auth + OAuth rules
├── schemas/
│   └── auth.graphql         # Employee table with sensitive fields
├── data/
│   ├── employees.json       # 5 seed employee records
│   ├── users.json           # 2 seed users (admin, user)
│   └── roles.json           # 3 roles (super_user, admin, viewer)
├── source/                  # React/Vite frontend
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx              # Main app shell with navigation
│       ├── main.tsx             # React entry point
│       ├── pages/
│       │   └── AuthPage.tsx     # Login + employee data panels
│       ├── components/
│       │   ├── LoginPage.tsx    # Auth method selector (Basic/JWT/OAuth)
│       │   └── Footer.tsx       # Page footer
│       ├── theme.ts             # CSS custom properties
│       ├── utils.ts             # JSON syntax highlighting
│       ├── auth.css             # Auth-specific styles
│       ├── index.css            # Global styles
│       └── yeti.css             # Yeti design system styles
└── web/                     # Built output (generated by npm run build)
```

---

## Comparison

| | demo-authentication | Typical Auth Setup |
|---|---|---|
| **Auth methods** | Basic + JWT + OAuth from config | Each method requires separate library/middleware |
| **Field masking** | Declarative in role JSON | Custom serialization logic per endpoint |
| **Role assignment** | OAuth rules in config.yaml | Manual user provisioning or custom mapping code |
| **Seed data** | `authLoader` + `dataLoader` in config | Migration scripts or manual setup |
| **Password hashing** | Argon2id (OWASP params), automatic | Choose library, configure parameters, test |
| **Token refresh** | Built-in endpoint, automatic rotation | Custom refresh logic and token storage |
| **Frontend** | SPA with Vite, auto-built on deploy | Separate build pipeline and deployment |
| **Lines of auth code** | 0 (configuration only) | Hundreds to thousands |

---

Built with [Yeti](https://yetirocks.com) | The Performance Platform for Agent-Driven Development
