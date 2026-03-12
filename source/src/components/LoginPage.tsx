import { useState, useEffect } from 'react'
import './LoginPage.css'

// ── Types ────────────────────────────────────────────────────────────────────

export interface LoginUser {
  name?: string
  username?: string
  email?: string
  avatar_url?: string
  role?: string
}

export interface LoginPageProps {
  /** Current user (null = logged out) */
  user: LoginUser | null
  /** Active auth provider key (e.g. "github", "google", or username for basic/jwt) */
  provider: string | null
  /** Auth method: "basic" | "jwt" | "oauth" */
  authType: string | null
  /** Available OAuth provider keys fetched from the API */
  providers: string[]
  /** Error message to display */
  error: string | null
  /** Which auth methods to show (default: all) */
  methods?: ('basic' | 'jwt' | 'oauth')[]
  /** Basic auth preset accounts: [{ label, username, password, role }] */
  basicAccounts?: { label: string; username: string; password: string; role: 'admin' | 'reader' }[]
  /** JWT preset accounts: [{ label, username, password, role }] */
  jwtAccounts?: { label: string; username: string; password: string; role: 'admin' | 'reader' }[]
  /** OAuth provider → role label mapping (e.g. { github: "reader", google: "admin" }) */
  providerRoles?: Record<string, string>
  /** Callbacks */
  onBasicLogin: (username: string, password: string) => void
  onJwtLogin: (username: string, password: string) => void
  onOAuthLogin: (provider: string) => void
  onLogout: () => void
}

// ── Icons ────────────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path fill="#F25022" d="M1 1h10v10H1z"/>
      <path fill="#00A4EF" d="M1 13h10v10H1z"/>
      <path fill="#7FBA00" d="M13 1h10v10H13z"/>
      <path fill="#FFB900" d="M13 13h10v10H13z"/>
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
    </svg>
  )
}

function KeyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
    </svg>
  )
}

// ── Provider Config ──────────────────────────────────────────────────────────

const PROVIDER_ICONS: Record<string, { icon: () => JSX.Element; label: string }> = {
  google:    { icon: GoogleIcon,    label: 'Google' },
  github:    { icon: GitHubIcon,    label: 'GitHub' },
  microsoft: { icon: MicrosoftIcon, label: 'Microsoft' },
}

const ROLE_ICONS: Record<string, () => JSX.Element> = {
  admin: ShieldIcon,
  reader: EyeIcon,
}

// ── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_BASIC_ACCOUNTS = [
  { label: 'Login as Admin (Full Access)', username: 'admin', password: 'admin123', role: 'admin' as const },
  { label: 'Login as Reader (Limited)',     username: 'user',  password: 'user123',  role: 'reader' as const },
]

const DEFAULT_JWT_ACCOUNTS = [
  { label: 'JWT Login as Admin',  username: 'admin', password: 'admin123', role: 'admin' as const },
  { label: 'JWT Login as Reader', username: 'user',  password: 'user123',  role: 'reader' as const },
]

// ── Component ────────────────────────────────────────────────────────────────

export default function LoginPage({
  user,
  provider,
  authType,
  providers,
  error,
  methods = ['basic', 'jwt', 'oauth'],
  basicAccounts = DEFAULT_BASIC_ACCOUNTS,
  jwtAccounts = DEFAULT_JWT_ACCOUNTS,
  providerRoles,
  onBasicLogin,
  onJwtLogin,
  onOAuthLogin,
  onLogout,
}: LoginPageProps) {
  const isLoggedIn = user !== null
  const displayName = user?.name || user?.username || 'User'
  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName.charAt(0))}&background=ce422b&color=fff&size=96`
  const [avatarSrc, setAvatarSrc] = useState(user?.avatar_url || fallbackAvatar)

  useEffect(() => {
    setAvatarSrc(user?.avatar_url || fallbackAvatar)
  }, [user?.avatar_url, fallbackAvatar])

  const showBasic = methods.includes('basic')
  const showJwt = methods.includes('jwt')
  const showOAuth = methods.includes('oauth')

  return (
    <div className="login-page">
      {error && <div className="lp-error">{error}</div>}

      {isLoggedIn && user ? (
        <div className="lp-user">
          <img
            src={avatarSrc}
            alt="Profile"
            className="lp-avatar"
            onError={() => setAvatarSrc(fallbackAvatar)}
            referrerPolicy="no-referrer"
          />
          <div className="lp-name">{displayName}</div>
          {user.email && <div className="lp-email">{user.email}</div>}
          <div className="lp-badge">
            {ROLE_ICONS[user.role || '']?.() || null}
            <span>{user.role === 'admin' ? 'Admin (Full Access)' : 'Reader (Limited)'}</span>
          </div>
          {provider && (
            <div className="lp-badge lp-provider-badge">
              {PROVIDER_ICONS[provider]?.icon() || null}
              <span>
                {authType === 'basic' ? 'Basic Auth' : authType === 'jwt' ? 'JWT Token' : PROVIDER_ICONS[provider]?.label || provider}
              </span>
            </div>
          )}
          <button onClick={onLogout} className="lp-btn lp-btn-logout">Sign Out</button>
        </div>
      ) : (
        <div className="lp-form">
          {showBasic && (
            <div className="lp-section">
              <div className="lp-label">Basic Authentication</div>
              {basicAccounts.map(a => (
                <button
                  key={`basic-${a.username}`}
                  className="lp-btn"
                  onClick={() => onBasicLogin(a.username, a.password)}
                  disabled={isLoggedIn}
                >
                  {ROLE_ICONS[a.role]?.() || null}
                  {a.label}
                </button>
              ))}
            </div>
          )}

          {showBasic && showJwt && (
            <div className="lp-divider"><span>or use JWT tokens</span></div>
          )}

          {showJwt && (
            <div className="lp-section">
              <div className="lp-label">JWT Authentication</div>
              {jwtAccounts.map(a => (
                <button
                  key={`jwt-${a.username}`}
                  className="lp-btn"
                  onClick={() => onJwtLogin(a.username, a.password)}
                  disabled={isLoggedIn}
                >
                  <KeyIcon />
                  {a.label}
                </button>
              ))}
            </div>
          )}

          {(showBasic || showJwt) && showOAuth && (
            <div className="lp-divider"><span>or continue with OAuth</span></div>
          )}

          {showOAuth && (
            <div className="lp-section">
              <div className="lp-label">OAuth</div>
              {providers.map(p => {
                const cfg = PROVIDER_ICONS[p]
                if (!cfg) return null
                const Icon = cfg.icon
                return (
                  <button
                    key={p}
                    onClick={() => onOAuthLogin(p)}
                    className="lp-btn"
                    disabled={isLoggedIn}
                  >
                    <Icon />
                    Continue with {cfg.label}{providerRoles?.[p] ? ` (${providerRoles[p]})` : ''}
                  </button>
                )
              })}
              {providers.length === 0 && (
                <div className="lp-info">No OAuth providers configured</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
