import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { DetouraProvider } from './DetouraContext';
import ProtectedRoute from './components/ProtectedRoute';
import BottomNav from './components/BottomNav';
import TravelDNA from './pages/TravelDNA';
import Explore from './pages/Explore';
import Recommendations from './pages/Recommendations';
import DestinationDetail from './pages/DestinationDetail';
import Profile from './pages/Profile';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import AskDetouraDrawer from './components/AskDetouraDrawer';

export default function App() {
  return (
    <AuthProvider>
      <DetouraProvider>
        <Router>
          <div className="bg-surface text-on-surface font-body-md text-body-md flex flex-col min-h-screen">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Explore />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/catalog" element={<Explore />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />

              {/* Protected Personalized AI / Model Routes */}
              <Route 
                path="/travel-dna" 
                element={
                  <ProtectedRoute>
                    <TravelDNA />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/recommendations" 
                element={
                  <ProtectedRoute>
                    <Recommendations />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/destination/:id" 
                element={
                  <ProtectedRoute>
                    <DestinationDetail />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } 
              />

              {/* Fallback to Home */}
              <Route path="*" element={<Explore />} />
            </Routes>
            <AskDetouraDrawer />
            <BottomNav />
          </div>
        </Router>
      </DetouraProvider>
    </AuthProvider>
  );
}
