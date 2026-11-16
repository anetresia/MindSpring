
import { useState } from "react";

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

// Components
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

// Pages
import Landing from "./pages/Landing";
import Register from "./pages/Register";
import Login from "./pages/Login";
import ParentDashboard from "./pages/ParentDashboard";
import ChildDashboard from "./pages/ChildDashboard";
import ChildLearning from "./pages/ChildLearning";
import AdminDashboard from "./pages/AdminDashboard";
import AdminContent from "./pages/AdminContent";
import AdminParents from "./pages/AdminParents";
import AdminChildren from "./pages/AdminChildren";
import AdminSubscriptions from "./pages/AdminSubscriptions";
import AdminContact from "./pages/AdminContact";

// ========================================
// GET SAVED ACCESS TOKEN
// ========================================

function getAccessToken() {
  return (
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token")
  );
}

// ========================================
// GET SAVED USER DETAILS
// ========================================

function getStoredUser() {
  try {
    const sessionUser = sessionStorage.getItem("user");
    const localUser = localStorage.getItem("user");

    const userData = sessionUser || localUser;

    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error("Unable to read user details:", error);
    return null;
  }
}

// ========================================
// PROTECTED ROUTE
// ========================================

function ProtectedRoute({ allowedRoles }) {
  const location = useLocation();

  const token = getAccessToken();
  const storedUser = getStoredUser();

  const navigationUser = location.state?.parent || null;

  const usersToCheck = [storedUser, navigationUser];

  const normalizedAllowedRoles = allowedRoles.map((role) =>
    role.trim().toLowerCase()
  );

  const validUser = usersToCheck.find((user) => {
    const userRole = user?.role?.trim().toLowerCase();

    return userRole && normalizedAllowedRoles.includes(userRole);
  });

  if (!token || !validUser) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

// ========================================
// LANDING PAGE
// ========================================

function HomePage() {
  const [activePopup, setActivePopup] = useState(null);

  function openLogin() {
    setActivePopup("login");
  }

  function openRegister() {
    setActivePopup("register");
  }

  function closePopup() {
    setActivePopup(null);
  }

  return (
    <>
      <Navbar
        onLoginClick={openLogin}
        onRegisterClick={openRegister}
      />

      <Landing onRegisterClick={openRegister} />

      <Footer />

      {activePopup === "login" && (
        <Login
          onClose={closePopup}
          onSwitchToRegister={openRegister}
        />
      )}

      {activePopup === "register" && (
        <Register
          isOpen={true}
          onClose={closePopup}
          onLoginClick={openLogin}
        />
      )}
    </>
  );
}

// ========================================
// MAIN APP
// ========================================

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* PUBLIC ROUTES */}

        <Route
          path="/"
          element={<HomePage />}
        />

        {/* PARENT PROTECTED ROUTES */}

        <Route
          element={
            <ProtectedRoute allowedRoles={["parent"]} />
          }
        >
          <Route
            path="/parent-home"
            element={<ParentDashboard />}
          />

          <Route
            path="/child-learning/:childId"
            element={<ChildLearning />}
          />
        </Route>

        {/* ADMIN PROTECTED ROUTES */}

        <Route
          element={
            <ProtectedRoute allowedRoles={["admin"]} />
          }
        >
          <Route
            path="/admin-dashboard"
            element={<AdminDashboard />}
          />

          <Route
            path="/admin-content"
            element={<AdminContent />}
          />

          <Route
            path="/admin-parents"
            element={<AdminParents />}
          />

          <Route
            path="/admin-children"
            element={<AdminChildren />}
          />

          {/* SUBSCRIPTION MANAGEMENT */}

          <Route
            path="/admin-subscriptions"
            element={<AdminSubscriptions />}
          />

          {/* CONTACT MESSAGES */}

          <Route
            path="/admin-contact"
            element={<AdminContact />}
          />
        </Route>

        {/* CHILD DASHBOARD */}

        <Route
          path="/child-dashboard/:childId"
          element={<ChildDashboard />}
        />

        {/* UNKNOWN ROUTES */}

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
