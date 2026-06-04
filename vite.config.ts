import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { traeBadgePlugin } from 'vite-plugin-trae-solo-badge'

export default defineConfig(() => {
  const secretsPath = path.resolve(process.cwd(), 'secrets/local.keys.env')
  const secretEnv = fs.existsSync(secretsPath) ? dotenv.parse(fs.readFileSync(secretsPath)) : {}
  const envDefines = Object.fromEntries(
    Object.entries(secretEnv)
      .filter(([key]) => key.startsWith('VITE_'))
      .map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)]),
  )

  return {
    base: process.env.VITE_BASE || '/',
    build: {
      sourcemap: 'hidden',
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:8787',
          changeOrigin: true,
        },
      },
    },
    plugins: [
      react({
        babel: {
          plugins: ['react-dev-locator'],
        },
      }),
      traeBadgePlugin({
        variant: 'dark',
        position: 'bottom-right',
        prodOnly: true,
        clickable: true,
        clickUrl: 'https://www.trae.ai/solo?showJoin=1',
        autoTheme: true,
        autoThemeTarget: '#root',
      }),
      tsconfigPaths(),
    ],
    define: envDefines,
    test: {
      environment: 'jsdom',
      setupFiles: './src/vitest.setup.ts',
    },
  }
})
