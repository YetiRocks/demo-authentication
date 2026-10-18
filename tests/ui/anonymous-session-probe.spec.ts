// YTC-2435: an anonymous visitor's page load must not probe a route that
// refuses anonymous callers. `/yeti-auth/oauth_user` answers 401 without an
// OAuth session (intended; pinned in yeti-auth's public_access_tests.rs), and
// the session cookie is HttpOnly, so the page cannot tell from JS whether it
// has one. It asks `/yeti-auth/auth` instead, which answers 200 with
// `authenticated: false` for an anonymous caller, and reads the OAuth profile
// only when that status names an OAuth session.
import { test, expect, settle } from '@yeti/ui-gate'

test('an anonymous visitor sees the login page without probing oauth_user', async ({ page }) => {
  const probed: string[] = []
  const statuses: string[] = []
  page.on('request', (req) => {
    const p = new URL(req.url()).pathname
    if (p === '/yeti-auth/oauth_user') probed.push(req.url())
  })
  page.on('response', (res) => {
    if (new URL(res.url()).pathname === '/yeti-auth/auth') statuses.push(String(res.status()))
  })

  const appUrl = process.env.YETI_APP_URL
  if (!appUrl) throw new Error('YETI_APP_URL is not set')
  await page.goto(appUrl, { waitUntil: 'load' })

  await expect(page.locator('.login-page')).toBeVisible()
  await expect(page.locator('.loading-state')).toHaveCount(0)
  await settle(page.context())

  expect(probed, 'an anonymous page load fetched /yeti-auth/oauth_user').toEqual([])
  expect(statuses.length, 'the page never asked /yeti-auth/auth for its session status').toBeGreaterThan(0)
  expect(statuses.every((s) => s === '200'), `/yeti-auth/auth answered ${statuses.join(',')}`).toBe(true)
})
