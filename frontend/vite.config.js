import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Log environment variables during build - debugging blank page issue
  console.log('=== VITE BUILD ENVIRONMENT ===');
  console.log('Mode:', mode);
  console.log('VITE_API_URL:', process.env.VITE_API_URL);
  console.log('VITE_STRIPE_PUBLISHABLE_KEY:', process.env.VITE_STRIPE_PUBLISHABLE_KEY);
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('All env vars:', Object.keys(process.env).filter(k => k.startsWith('VITE_')));
  console.log('==============================');

  return {
    plugins: [react()],
    server: {
      allowedHosts: true
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json']
    },
    optimizeDeps: {
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
    },
  };
}) 