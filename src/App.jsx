import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Tickets from './pages/Tickets.jsx';
import Notifications from './pages/Notifications.jsx';
import NotificationHistory from './pages/NotificationHistory.jsx';
import Forms from './pages/Forms.jsx';
import FormView from './pages/FormView.jsx';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/form/:id" element={<FormView />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/tickets" element={<Tickets />} />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute roles={['admin']}>
              <Notifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notification-history"
          element={
            <ProtectedRoute roles={['admin']}>
              <NotificationHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/forms"
          element={
            <ProtectedRoute roles={['admin']}>
              <Forms />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
