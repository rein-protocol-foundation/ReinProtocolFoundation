import { defineConfig, devices } from '@playwright/test'

const baseURL = 'http://127.0.0.1:4188'
const fixtureURL = 'http://127.0.0.1:4189'

export default defineConfig({
  testDir: './tests/community-browser',
  workers: 1,
  use: { baseURL, contextOptions: { reducedMotion: 'reduce' } },
  projects: [
    { name: 'webkit', use: { ...devices['iPhone 13'], viewport: { width: 320, height: 690 } } },
    { name: 'chromium', use: { ...devices['Pixel 7'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  webServer: [
    { command: 'node tests/community-browser/fixture.mjs', url: fixtureURL },
    {
      command: 'npm run dev -- --hostname 127.0.0.1 --port 4188',
      url: baseURL,
      env: {
        NEXT_PUBLIC_SITE_URL: baseURL, NEXT_PUBLIC_SUPABASE_URL: fixtureURL,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_local',
        SUPABASE_SECRET_KEY: 'sb_secret_local', DATABASE_ENVIRONMENT: 'dev', RESEND_API_KEY: '',
      },
    },
  ],
})
