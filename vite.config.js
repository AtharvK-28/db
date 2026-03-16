import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const repoBase = './'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: repoBase,
})
