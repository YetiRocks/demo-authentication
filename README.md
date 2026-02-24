<p align="center">
  <img src="https://cdn.prod.website-files.com/68e09cef90d613c94c3671c0/697e805a9246c7e090054706_logo_horizontal_grey.png" alt="Yeti" width="200" />
</p>

---

# demo-authentication

[![Yeti](https://img.shields.io/badge/Yeti-Application-blue)](https://yetirocks.com)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> **[Yeti](https://yetirocks.com)** — The Performance Platform for Agent-Driven Development.
> Schema-driven APIs, real-time streaming, and vector search. From prompt to production.

Role-based access control with Basic, JWT, and OAuth login. Admin and viewer roles see different fields -- sensitive fields like salary and SSN are masked for non-admin users.

## Features

- Basic auth and JWT token login
- Role-based field masking (admin vs reader)
- OAuth provider integration
- Field-level access control

## Installation

```bash
cd ~/yeti/applications
git clone https://github.com/yetirocks/demo-authentication.git
cd demo-authentication/source
npm install
npm run build
```

## Project Structure

```
demo-authentication/
├── config.yaml              # App configuration with OAuth rules
├── schemas/
│   └── auth.graphql         # Employee table with sensitive fields
├── data/
│   └── employees.json       # Seed employee data
└── source/                  # React/Vite frontend
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    └── src/
```

## Configuration

```yaml
name: "Authentication Demo"
app_id: "demo-authentication"
version: "1.0.0"
description: "Role-based access control with Basic, JWT, and OAuth login"
enabled: true
rest: true
graphql: true

schemas:
  - schemas/auth.graphql

dataLoader: data/*.json

static_files:
  path: web
  route: /
  index: index.html
  notFound:
    file: index.html
    statusCode: 200
  build:
    sourceDir: source
    command: npm run build

extensions:
  - yeti-auth:
      oauth:
        rules:
          - strategy: provider
            pattern: "google"
            role: admin
          - strategy: email
            pattern: "*@mycompany.com"
            role: standard
          - strategy: provider
            pattern: "github"
            role: standard
```

## Schema

**auth.graphql** -- Employee table with sensitive fields for RBAC:
```graphql
type Employee @table(database: "demo-authentication") @export {
  id: String!
  name: String!
  email: String!
  department: String!
  title: String!
  salary: Float
  ssn: String
  homeAddress: String
  personalEmail: String
}
```

Fields like `salary`, `ssn`, `homeAddress`, and `personalEmail` are masked based on the authenticated user's role. Admin users see all fields; reader/standard users see redacted values.

## Development

```bash
cd source

# Install dependencies
npm install

# Start dev server with HMR
npm run dev

# Build for production
npm run build
```

---

Built with [Yeti](https://yetirocks.com) | The Performance Platform for Agent-Driven Development
