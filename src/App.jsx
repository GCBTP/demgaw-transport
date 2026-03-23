import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AdminRoute } from './components/auth/AdminRoute'
import { DriverRoute } from './components/auth/DriverRoute'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { MainLayout } from './components/layout/MainLayout'
import { Account } from './pages/Account'
import { AdminDashboard } from './pages/AdminDashboard'
import { AdminTrips } from './pages/AdminTrips'
import { AdminBookings } from './pages/AdminBookings'
import { AdminUsers } from './pages/AdminUsers'
import { AdminDrivers } from './pages/AdminDrivers'
import { Booking } from './pages/Booking'
import { BookingConfirmation } from './pages/BookingConfirmation'
import { BookTrip } from './pages/BookTrip'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { ResetPassword } from './pages/ResetPassword'
import { Trips } from './pages/Trips'
import { WavePayment } from './pages/WavePayment'
import { DriverDashboard } from './pages/DriverDashboard'
import { DriverQuick } from './pages/DriverQuick'
import { DriverScanTicket } from './pages/DriverScanTicket'
import { DriverBadge } from './pages/DriverBadge'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/"
        element={
          <MainLayout>
            <Home />
          </MainLayout>
        }
      />
      <Route
        path="/compte"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Account />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/chauffeur"
        element={
          <DriverRoute>
            <MainLayout>
              <Outlet />
            </MainLayout>
          </DriverRoute>
        }
      >
        <Route index element={<DriverQuick />} />
        <Route path="gestion" element={<DriverDashboard />} />
        <Route path="scan" element={<DriverScanTicket />} />
        <Route path="badge" element={<DriverBadge />} />
      </Route>
      <Route
        path="/dashboard"
        element={
          <AdminRoute>
            <MainLayout>
              <AdminDashboard />
            </MainLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/dashboard/trips"
        element={
          <AdminRoute>
            <MainLayout>
              <AdminTrips />
            </MainLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/dashboard/bookings"
        element={
          <AdminRoute>
            <MainLayout>
              <AdminBookings />
            </MainLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/dashboard/users"
        element={
          <AdminRoute>
            <MainLayout>
              <AdminUsers />
            </MainLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/dashboard/drivers"
        element={
          <AdminRoute>
            <MainLayout>
              <AdminDrivers />
            </MainLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/trips"
        element={
          <MainLayout>
            <Trips />
          </MainLayout>
        }
      />
      <Route
        path="/booking"
        element={
          <MainLayout>
            <Booking />
          </MainLayout>
        }
      />
      <Route
        path="/book/:tripId"
        element={
          <ProtectedRoute>
            <MainLayout>
              <BookTrip />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/booking/confirmation/:bookingId"
        element={
          <ProtectedRoute>
            <MainLayout>
              <BookingConfirmation />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/booking/payment/:bookingId"
        element={
          <ProtectedRoute>
            <MainLayout>
              <WavePayment />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
