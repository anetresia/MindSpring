
import { NavLink } from "react-router-dom";
import mindspringLogo from "../../assets/mindspring-logo.png";
import "../../styles/admin/admin-sidebar.css";

function AdminSidebar() {
  return (
    <aside className="admin-sidebar">

      {/* BRAND LOGO */}
      <div className="admin-brand">
        <img
          src={mindspringLogo}
          alt="MindSpring Logo"
          className="admin-brand-logo"
        />
      </div>

      {/* MENU LABEL */}
      <div className="admin-sidebar-label">MENU</div>

      {/* NAVIGATION */}
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

        <NavLink
          to="/admin-parents"
          className={({ isActive }) =>
            `admin-nav-link ${isActive ? "active" : ""}`
          }
        >
          <span>♙</span>
          Parent Management
        </NavLink>

        <NavLink
          to="/admin-children"
          className={({ isActive }) =>
            `admin-nav-link ${isActive ? "active" : ""}`
          }
        >
          <span>♧</span>
          Child Management
        </NavLink>

        <NavLink
          to="/admin-subscriptions"
          className={({ isActive }) =>
            `admin-nav-link ${isActive ? "active" : ""}`
          }
        >
          <span>♛</span>
          Subscription Management
        </NavLink>

        <NavLink
          to="/admin-contact"
          className={({ isActive }) =>
            `admin-nav-link ${isActive ? "active" : ""}`
          }
        >
          <span>✉</span>
          Contact Messages
        </NavLink>

      </nav>

      {/* SIDEBAR FOOTER */}
      <div className="admin-sidebar-bottom">
        <p>MindSpring</p>
        <span>Learning made meaningful</span>
      </div>

    </aside>
  );
}

export default AdminSidebar;
