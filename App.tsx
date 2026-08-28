import { Switch, Route, Router as WouterRouter } from 'wouter'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { SearchPage } from './pages/SearchPage'
import { ChatPage } from './pages/ChatPage'
import { OcrPage } from './pages/OcrPage'
import { PharmaciesPage } from './pages/PharmaciesPage'
import { ProfilePage } from './pages/ProfilePage'
import { useCart } from './hooks/use-patient'
import NotFound from './pages/not-found'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 60_000 } },
})

function AppRoutes() {
  const { totalItems } = useCart()

  return (
    <Layout cartCount={totalItems}>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/search" component={SearchPage} />
        <Route path="/chat" component={ChatPage} />
        <Route path="/ocr" component={OcrPage} />
        <Route path="/pharmacies" component={PharmaciesPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <AppRoutes />
      </WouterRouter>
    </QueryClientProvider>
  )
}

export default App
