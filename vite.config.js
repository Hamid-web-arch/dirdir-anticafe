import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Sayt Vercel-də kök ünvandadır (/).
export default defineConfig({
  plugins: [react()],
})
