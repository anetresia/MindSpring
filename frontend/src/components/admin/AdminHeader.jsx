import { useId, useRef } from "react";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../../styles/admin/admin-header.css";

function AdminHeader({
  title = "Dashboard",
  subtitle = "Welcome to your MindSpring admin workspace.",
}) {
  const navigate = useNavigate();
  const logoutDialogRef = useRef(null);
  const logoutTitleId = useId();
  const logoutMessageId = useId();

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");

    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("user");

    navigate("/", { replace: true });
  }

  function handleLogoutClick() {
    logoutDialogRef.current?.showModal();
  }

  return (
    <header className="admin-header">
      <div className="admin-header-copy">
        <h1>{title}</h1>
        <p>{subtitle}</p>
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
          onClick={handleLogoutClick}
        >
          <LogOut aria-hidden="true" />
          Logout
        </button>
      </div>

      <dialog
        ref={logoutDialogRef}
        className="admin-logout-dialog"
        aria-labelledby={logoutTitleId}
        aria-describedby={logoutMessageId}
      >
        <span className="admin-logout-dialog-icon">
          <LogOut aria-hidden="true" />
        </span>
        <h2 id={logoutTitleId}>Are you sure you want to logout?</h2>
        <p id={logoutMessageId}>Do you really want to logout from your MindSpring Admin account?</p>

        <div className="admin-logout-dialog-actions">
          <button type="button" onClick={() => logoutDialogRef.current?.close()}>
            Cancel
          </button>
          <button type="button" className="admin-logout-confirm-btn" onClick={handleLogout}>
            Yes, Logout
          </button>
        </div>
      </dialog>
    </header>
  );
}

export default AdminHeader;
