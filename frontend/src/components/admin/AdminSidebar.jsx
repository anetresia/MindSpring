
import { NavLink } from "react-router-dom";
import "../../styles/admin/admin-dashboard.css";

function AdminSidebar() {
  return (
    <aside className="admin-sidebar">
      <div className="admin-brand">
        <div className="admin-brand-icon">M</div>
        <div>
          <h2>MindSpring</h2>
          <p>Admin Panel</p>
        </div>
      </div>

      <div className="admin-sidebar-label">MENU</div>

      <nav className="admin-navigation">
        <NavLink
          to="/admin-dashboard"
          end
          className={({ isActive }) =>
            `admin-nav-link ${isActive ? "active" : ""}`
          }
        >
          <span>▦</span>
          Dashboard
        </NavLink>

        <NavLink
          to="/admin-content"
          className={({ isActive }) =>
            `admin-nav-link ${isActive ? "active" : ""}`
          }
        >
          <span>▶</span>
          Video Management
        </NavLink>
      </nav>

      <div className="admin-sidebar-bottom">
        <p>MindSpring</p>
        <span>Learning made meaningful</span>
      </div>
    </aside>
  );
}

export default AdminSidebar;
