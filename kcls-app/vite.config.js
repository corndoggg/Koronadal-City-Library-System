import { defineConfig } from 'vite'
// Use the SWC-based React plugin for faster compilation
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})
