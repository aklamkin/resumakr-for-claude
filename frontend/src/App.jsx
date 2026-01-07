import './App.css'
import Pages from "@/pages/index.jsx"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { useThemeInitializer } from '@/hooks/useTheme'

function App() {
  // Initialize theme globally
  useThemeInitializer();

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

  return (
    <QueryClientProvider client={queryClient}>
      <Pages />
    </QueryClientProvider>
  )
}

export default App
