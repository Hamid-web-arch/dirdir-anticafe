import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Vercel/öz domen: sayt kökdə (/). GitHub Pages isə /dirdir-anticafe/ altındadır —
  // onun workflow-u VITE_BASE ilə bunu ayrıca verir.
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
})
