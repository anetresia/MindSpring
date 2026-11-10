
import { useNavigate } from "react-router-dom";

function AdminHeader({ title = "Dashboard" }) {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");

    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("user");

    navigate("/", { replace: true });
  }

  return (
    <header className="admin-header">
      <div>
        <h1>{title}</h1>
        <p>Welcome to your MindSpring admin workspace.</p>
      </div>

      <div className="admin-header-actions">
        <div className="admin-user-info">
          <div className="admin-user-avatar">A</div>
          <div>
            <strong>Administrator</strong>
            <span>Admin</span>
          </div>
        </div>

        <button
          type="button"
          className="admin-logout-btn"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    </header>
  );
}

export default AdminHeader;
