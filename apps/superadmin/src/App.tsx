import { useAuth, AuthProvider } from './context/Auth';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import './App.css';

function AppContent() {
  const { token } = useAuth();

  return (
    <div className="App">
      {token ? <DashboardPage /> : <LoginPage />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
