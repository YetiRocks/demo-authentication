import { useState, useEffect, useCallback } from 'react'
import { syntaxHighlight } from '../utils.ts'
import LoginPage from '../components/LoginPage'
import type { LoginUser } from '../components/LoginPage'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Employee {
  id: string
  name: string
  department: string
  title: string
  salary?: number
  ssn?: string
  homeAddress?: string
  personalEmail?: string
}

interface EmployeeResponse {
  user: string
  role: string
  fields_visible: string[]
  count: number
  data: Employee[]
}

// ── Utils ──────────────────────────────────────────────────────────────────────

const AUTH_BASE = window.location.origin + '/yeti-auth'


// ── Panel Component ────────────────────────────────────────────────────────────

interface PanelProps {
  title: string
  badge: string
  badgeSuccess?: boolean
  badgeError?: boolean
  children: React.ReactNode
}

function Panel({ title, badge, badgeSuccess, badgeError, children }: PanelProps) {
  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">{title}</span>
        <span className={`panel-badge ${badgeSuccess ? 'success' : ''} ${badgeError ? 'error' : ''}`}>{badge}</span>
      </div>
      <div className="panel-content">
        {children}
      </div>
    </div>
  )
}

// ── EmployeePanel Component ────────────────────────────────────────────────────

interface EmployeePanelProps {
  result: EmployeeResponse | null
  loading: boolean
  error: string | null
  statusCode: number | null
  isLoggedIn: boolean
  onFetch: () => void
}

function EmployeePanel({ result, loading, error, statusCode, isLoggedIn, onFetch }: EmployeePanelProps) {
  const badge = statusCode ? `${statusCode}` : 'Ready'
  const badgeSuccess = statusCode === 200
  const badgeError = statusCode !== null && statusCode !== 200

  const metadata = result ? {
    user: result.user,
    role: result.role,
    fields_visible: result.fields_visible,
    count: result.count,
  } : null

  return (
    <Panel title="Employee Data (RBAC Demo)" badge={badge} badgeSuccess={badgeSuccess} badgeError={badgeError}>
      <div className="field-access-table">
        <div className="field-access-row header">
          <span className="field-access-role">Role</span>
          <span className="field-access-fields">Visible Fields</span>
        </div>
        <div className="field-access-row">
          <span className="field-access-role">Admin</span>
          <span className="field-access-fields">id, name, email, department, title, salary, ssn, homeAddress, personalEmail</span>
        </div>
        <div className="field-access-row">
          <span className="field-access-role">Reader</span>
          <span className="field-access-fields">id, name, email, department, title</span>
        </div>
      </div>

      <button
        className="btn btn-primary"
        onClick={onFetch}
        disabled={loading}
        style={{ width: '100%' }}
      >
        {loading ? 'Loading...' : 'GET /Employee'}
      </button>

      <div className="employee-results-split">
        {result === null && !error ? (
          <div className="empty-state" style={{ textAlign: 'center', width: '100%' }}>
            <p>Click the button to query employee data</p>
            <p className="empty-hint">Fields returned depend on your role</p>
          </div>
        ) : error ? (
          <pre className="results-pre error-text" style={{ flex: 1 }}>{error}</pre>
        ) : (
          <>
            <div className="results-container results-half">
              <div className="results-label">Metadata</div>
              <pre
                className="results-pre"
                dangerouslySetInnerHTML={{
                  __html: syntaxHighlight(JSON.stringify(metadata, null, 2))
                }}
              />
            </div>
            <div className="results-container results-half">
              <div className="results-label">Records</div>
              <pre
                className="results-pre"
                dangerouslySetInnerHTML={{
                  __html: syntaxHighlight(JSON.stringify(result?.data, null, 2))
                }}
              />
            </div>
          </>
        )}
      </div>
      {result && !isLoggedIn && statusCode === 200 && (
        <div style={{ marginTop: 8, padding: '10px 14px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: '#fff', textAlign: 'left', fontSize: 13, lineHeight: 1.5 }}>
          Development mode: authentication is not enforced. All fields are returned because no credentials were sent. In production, this request would return 401.
        </div>
      )}
    </Panel>
  )
}

// ── AuthPage (main export) ─────────────────────────────────────────────────────

export function AuthPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<LoginUser | null>(null)
  const [provider, setProvider] = useState<string | null>(null)
  const [authType, setAuthType] = useState<string | null>(null)
  const [basicCredentials, setBasicCredentials] = useState<string | null>(null)
  const [jwtToken, setJwtToken] = useState<string | null>(null)
  const [configuredProviders, setConfiguredProviders] = useState<string[]>([])
  const [providerRoles, setProviderRoles] = useState<Record<string, string>>({})

  // Employee API state
  const [employeeResult, setEmployeeResult] = useState<EmployeeResponse | null>(null)
  const [employeeLoading, setEmployeeLoading] = useState(false)
  const [employeeError, setEmployeeError] = useState<string | null>(null)
  const [employeeStatusCode, setEmployeeStatusCode] = useState<number | null>(null)

  const isLoggedIn = user !== null

  // Fetch configured providers from yeti-auth extension
  useEffect(() => {
    fetch(`${AUTH_BASE}/oauth_providers?app_id=demo-authentication`)
      .then(res => res.json())
      .then(data => {
        setConfiguredProviders((data.providers || []).map((p: { name: string }) => p.name))
        if (data.roles) setProviderRoles(data.roles)
      })
      .catch(() => setConfiguredProviders([]))
  }, [])

  // Check authentication status
  const checkAuth = useCallback(async () => {
    // Check for error in URL params (from OAuth callback)
    const urlParams = new URLSearchParams(window.location.search)
    const urlError = urlParams.get('error')
    if (urlError) {
      setError(decodeURIComponent(urlError))
      setLoading(false)
      window.history.replaceState({}, document.title, window.location.pathname)
      return
    }

    // Check for existing OAuth session via yeti-auth
    try {
      const response = await fetch(`${AUTH_BASE}/oauth_user`, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        if (data.authenticated && data.user) {
          const u = data.user
          setUser({
            name: u.name || u.login || u.username || u.email,
            username: u.login || u.username || u.email,
            email: u.email,
            avatar_url: u.avatar_url || u.picture,
            role: providerRoles[data.provider] || 'reader',
          })
          setProvider(data.provider)
          setAuthType('oauth')
        }
      }
    } catch {
      // OAuth session check failed -- user is not authenticated via OAuth
    }

    setLoading(false)
  }, [providerRoles])

  // Basic auth login
  const handleBasicLogin = useCallback((username: string, password: string) => {
    const credentials = btoa(`${username}:${password}`)
    const role = username === 'admin' ? 'admin' : 'reader'

    setBasicCredentials(credentials)
    setUser({ username, role })
    setProvider(username)
    setAuthType('basic')
    setError(null)
    setEmployeeResult(null)
    setEmployeeError(null)
    setEmployeeStatusCode(null)
  }, [])

  // JWT login -- POST to /yeti-auth/login, store token
  const handleJwtLogin = useCallback(async (username: string, password: string) => {
    try {
      const response = await fetch(`${AUTH_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!response.ok) {
        const data = await response.json()
        setError(data.message || 'JWT login failed')
        return
      }
      const data = await response.json()
      const role = username === 'admin' ? 'admin' : 'reader'
      setJwtToken(data.access_token)
      setUser({ username, role })
      setProvider(username)
      setAuthType('jwt')
      setError(null)
      setEmployeeResult(null)
      setEmployeeError(null)
      setEmployeeStatusCode(null)
    } catch {
      setError('JWT login request failed')
    }
  }, [])

  // OAuth login -- redirect to yeti-auth OAuth flow
  const handleOAuthLogin = useCallback((p: string) => {
    const redirectUri = encodeURIComponent('/demo-authentication/')
    window.location.href = `${AUTH_BASE}/oauth_login?provider=${p}&redirect_uri=${redirectUri}`
  }, [])

  // Logout handler
  const handleLogout = useCallback(async () => {
    try {
      if (authType === 'oauth') {
        await fetch(`${AUTH_BASE}/oauth_logout`, {
          method: 'POST',
          credentials: 'include',
        })
      }
      // Always call JWT logout to clear the yeti_token cookie
      await fetch(`${AUTH_BASE}/login`, {
        method: 'DELETE',
        credentials: 'include',
      })
    } catch {
      // Best effort
    }

    setUser(null)
    setProvider(null)
    setAuthType(null)
    setBasicCredentials(null)
    setJwtToken(null)
    setEmployeeResult(null)
    setEmployeeError(null)
    setEmployeeStatusCode(null)
  }, [authType])

  // Fetch employees from auto-generated Employee table endpoint
  // RBAC field filtering is applied server-side by the auth middleware
  const fetchEmployees = useCallback(async () => {
    setEmployeeLoading(true)
    setEmployeeError(null)
    setEmployeeResult(null)

    try {
      const headers: Record<string, string> = {}
      if (authType === 'basic' && basicCredentials) {
        headers['Authorization'] = `Basic ${basicCredentials}`
      } else if (authType === 'jwt' && jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`
      }

      const response = await fetch(`${RESOURCE_ROUTE}/Employee/?limit=100`, {
        credentials: 'include',
        headers
      })
      setEmployeeStatusCode(response.status)

      const data = await response.json()

      if (!response.ok) {
        setEmployeeError(JSON.stringify(data, null, 2))
      } else {
        // Auto-generated endpoint returns array of records directly
        // Wrap in EmployeeResponse format for the UI
        const records = Array.isArray(data) ? data : (data.records || [])
        const fields = records.length > 0 ? Object.keys(records[0]) : []
        setEmployeeResult({
          user: user?.username || 'unknown',
          role: user?.role || 'unknown',
          fields_visible: fields,
          count: records.length,
          data: records,
        })
      }
    } catch (err) {
      setEmployeeStatusCode(500)
      setEmployeeError(JSON.stringify({
        error: "Request failed",
        message: err instanceof Error ? err.message : "Unknown error"
      }, null, 2))
    } finally {
      setEmployeeLoading(false)
    }
  }, [isLoggedIn, authType, basicCredentials, jwtToken, user])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  if (loading) {
    return (
      <>
        <div className="loading-state">Checking authentication...</div>
      </>
    )
  }

  return (
    <>
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Authentication Method</span>
        </div>
        <LoginPage
          user={user}
          provider={provider}
          authType={authType}
          providers={configuredProviders}
          error={error}
          providerRoles={providerRoles}
          onBasicLogin={handleBasicLogin}
          onJwtLogin={handleJwtLogin}
          onOAuthLogin={handleOAuthLogin}
          onLogout={handleLogout}
        />
      </div>

      <div className="api-panels">
        <EmployeePanel
          result={employeeResult}
          loading={employeeLoading}
          error={employeeError}
          statusCode={employeeStatusCode}
          isLoggedIn={isLoggedIn}
          onFetch={fetchEmployees}
        />
      </div>
    </>
  )
}
