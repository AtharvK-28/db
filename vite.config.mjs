import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // This allows Vite to accept connections from your specific Ngrok URL
    allowedHosts: [
      'overwidely-pseudoprofessorial-blondell.ngrok-free.dev'
    ],
    // Optional hackathon tip: 'host: true' makes sure Vite listens on all network interfaces
    host: true 
  }
})