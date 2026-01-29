import './App.css'
import Pages from "@/pages/index.jsx"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { useThemeInitializer } from '@/hooks/useTheme'
import { AuthProvider } from '@/contexts/AuthContext'
import api from '@/api/apiClient'
import { FileCheck, Wrench } from 'lucide-react'

function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
              <FileCheck className="h-8 w-8 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 shadow">
              <Wrench className="h-4 w-4 text-white" />
            </div>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
          We'll Be Right Back
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          Resumakr is currently undergoing scheduled maintenance. We're working to improve your experience and will be back shortly.
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-500">
          Please check back in a few minutes.
        </p>
      </div>
    </div>
  );
}

function App() {
  // Initialize theme globally
  useThemeInitializer();

  const [maintenance, setMaintenance] = useState(false);

  useEffect(() => {
    api.entities.AppSettings.getPublic()
      .then((settings) => {
        if (settings.maintenance_mode === true) {
          setMaintenance(true);
        }
      })
      .catch(() => {});
  }, []);

  // Create a client
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }))

  if (maintenance) {
    return <MaintenancePage />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Pages />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
