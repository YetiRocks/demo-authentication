import { useState, useEffect, useCallback } from 'react'
import { syntaxHighlight } from '../utils.ts'

// ── Types ──────────────────────────────────────────────────────────────────────

interface User {
  name?: string
  username?: string
  email?: string
  avatar_url?: string
  role?: string
}

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
const DEMOS_BASE = window.location.origin + '/demo-authentication'

// ── Icons ──────────────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" style={{ width: 20, height: 20 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 20, height: 20 }}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" style={{ width: 20, height: 20 }}>
      <path fill="#F25022" d="M1 1h10v10H1z"/>
      <path fill="#00A4EF" d="M1 13h10v10H1z"/>
      <path fill="#7FBA00" d="M13 1h10v10H13z"/>
      <path fill="#FFB900" d="M13 13h10v10H13z"/>
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 20, height: 20 }}>
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 20, height: 20 }}>
      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
    </svg>
  )
}

function KeyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 20, height: 20 }}>
      <path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
    </svg>
  )
}

// ── Provider Config ────────────────────────────────────────────────────────────

const PROVIDER_CONFIG: Record<string, { icon: () => JSX.Element; label: string; role: string }> = {
  google: { icon: GoogleIcon, label: 'Google', role: 'admin' },
  github: { icon: GitHubIcon, label: 'GitHub', role: 'reader' },
  microsoft: { icon: MicrosoftIcon, label: 'Microsoft', role: 'reader' },
}

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

// ── AuthPanel Component ────────────────────────────────────────────────────────

interface AuthPanelProps {
  user: User | null
  provider: string | null
  authType: string | null
  providers: string[]
  error: string | null
  isLoggedIn: boolean
  onBasicLogin: (username: string, password: string) => void
  onJwtLogin: (username: string, password: string) => void
  onOAuthLogin: (provider: string) => void
  onLogout: () => void
}

function AuthPanel({ user, provider, authType, providers, error, isLoggedIn, onBasicLogin, onJwtLogin, onOAuthLogin, onLogout }: AuthPanelProps) {
  const displayName = user?.name || user?.username || 'User'
  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName.charAt(0))}&background=ce422b&color=fff&size=96`
  const [avatarSrc, setAvatarSrc] = useState(user?.avatar_url || fallbackAvatar)

  useEffect(() => {
    setAvatarSrc(user?.avatar_url || fallbackAvatar)
  }, [user?.avatar_url, fallbackAvatar])

  const badge = isLoggedIn ? `${user?.role || 'Authenticated'}` : 'Not Authenticated'
  const badgeSuccess = isLoggedIn

  return (
    <Panel title="Authentication" badge={badge} badgeSuccess={badgeSuccess}>
      {error && <div className="error-message">{error}</div>}

      {isLoggedIn && user ? (
        <div className="user-info">
          <img
            src={avatarSrc}
            alt="Profile"
            className="avatar"
            onError={() => setAvatarSrc(fallbackAvatar)}
            referrerPolicy="no-referrer"
          />
          <div className="welcome">Welcome, {displayName}!</div>
          {user.email && <div className="email">{user.email}</div>}
          <div className={`role-badge ${user.role === 'admin' ? 'admin' : 'reader'}`}>
            {user.role === 'admin' ? <ShieldIcon /> : <EyeIcon />}
            <span>{user.role === 'admin' ? 'Admin (Full Access)' : 'Reader (Limited)'}</span>
          </div>
          {provider && (
            <div className="provider-badge">
              {PROVIDER_CONFIG[provider]?.icon()}
              <span>{authType === 'basic' ? 'Basic Auth' : authType === 'jwt' ? 'JWT Token' : provider.charAt(0).toUpperCase() + provider.slice(1)}</span>
            </div>
          )}
          <button onClick={onLogout} className="btn btn-logout">
            Sign Out
          </button>
        </div>
      ) : (
        <div className="login-buttons">
          <div className="login-section">
            <div className="section-label">Basic Authentication</div>
            <button
              className="btn btn-basic btn-admin"
              onClick={() => onBasicLogin('admin', 'admin123')}
              disabled={isLoggedIn}
            >
              <ShieldIcon />
              Login as Admin (Full Access)
            </button>
            <button
              className="btn btn-basic btn-reader"
              onClick={() => onBasicLogin('user', 'user123')}
              disabled={isLoggedIn}
            >
              <EyeIcon />
              Login as Reader (Limited)
            </button>
          </div>

          <div className="login-divider">
            <span>or use JWT tokens</span>
          </div>

          <div className="login-section">
            <div className="section-label">JWT Authentication</div>
            <button
              className="btn btn-jwt btn-admin"
              onClick={() => onJwtLogin('admin', 'admin123')}
              disabled={isLoggedIn}
            >
              <KeyIcon />
              JWT Login as Admin
            </button>
            <button
              className="btn btn-jwt btn-reader"
              onClick={() => onJwtLogin('user', 'user123')}
              disabled={isLoggedIn}
            >
              <KeyIcon />
              JWT Login as Reader
            </button>
          </div>

          <div className="login-divider">
            <span>or continue with OAuth</span>
          </div>

          <div className="login-section">
            <div className="section-label">OAuth (role by provider)</div>
            {[...providers].sort((a, b) => {
              const roleA = PROVIDER_CONFIG[a]?.role ?? ''
              const roleB = PROVIDER_CONFIG[b]?.role ?? ''
              return roleA === roleB ? 0 : roleA === 'admin' ? -1 : 1
            }).map(p => {
              const config = PROVIDER_CONFIG[p]
              if (!config) return null
              const Icon = config.icon
              return (
                <button
                  key={p}
                  onClick={() => onOAuthLogin(p)}
                  className={`btn btn-oauth btn-${p}`}
                  disabled={isLoggedIn}
                >
                  <Icon />
                  {config.label} &rarr; {config.role}
                </button>
              )
            })}
            {providers.length === 0 && (
              <div className="info-message">No OAuth providers configured</div>
            )}
          </div>
        </div>
      )}
    </Panel>
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
  const [user, setUser] = useState<User | null>(null)
  const [provider, setProvider] = useState<string | null>(null)
  const [authType, setAuthType] = useState<string | null>(null)
  const [basicCredentials, setBasicCredentials] = useState<string | null>(null)
  const [jwtToken, setJwtToken] = useState<string | null>(null)
  const [configuredProviders, setConfiguredProviders] = useState<string[]>([])

  // Employee API state
  const [employeeResult, setEmployeeResult] = useState<EmployeeResponse | null>(null)
  const [employeeLoading, setEmployeeLoading] = useState(false)
  const [employeeError, setEmployeeError] = useState<string | null>(null)
  const [employeeStatusCode, setEmployeeStatusCode] = useState<number | null>(null)

  const isLoggedIn = user !== null

  // Fetch configured providers from yeti-auth extension
  useEffect(() => {
    fetch(`${AUTH_BASE}/oauth_providers`)
      .then(res => res.json())
      .then(data => setConfiguredProviders((data.providers || []).map((p: { name: string }) => p.name)))
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
            role: PROVIDER_CONFIG[data.provider]?.role || 'reader',
          })
          setProvider(data.provider)
          setAuthType('oauth')
        }
      }
    } catch {
      // OAuth session check failed -- user is not authenticated via OAuth
    }

    setLoading(false)
  }, [])

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
    const redirectUri = encodeURIComponent(`${window.location.origin}/demo-authentication/`)
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

      const response = await fetch(`${DEMOS_BASE}/Employee/?limit=100`, {
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
      <AuthPanel
        user={user}
        provider={provider}
        authType={authType}
        providers={configuredProviders}
        error={error}
        isLoggedIn={isLoggedIn}
        onBasicLogin={handleBasicLogin}
        onJwtLogin={handleJwtLogin}
        onOAuthLogin={handleOAuthLogin}
        onLogout={handleLogout}
      />

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
