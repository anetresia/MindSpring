import { Baby, Crown, LayoutGrid, Mail, Play, Users } from "lucide-react";
import { NavLink } from "react-router-dom";
import sidebarArt from "../../assets/parent-sidebar-bg.png";
import mindspringLogo from "../../assets/mindspring-logo.png";
import "../../styles/admin/admin-sidebar.css";

function AdminSidebar({ illustrated = false }) {
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
          <span aria-hidden="true">{illustrated ? <LayoutGrid /> : "▦"}</span>
          Dashboard
        </NavLink>

        <NavLink
          to="/admin-content"
          className={({ isActive }) =>
            `admin-nav-link ${isActive ? "active" : ""}`
          }
        >
          <span aria-hidden="true">{illustrated ? <Play /> : "▶"}</span>
          Video Management
        </NavLink>

        <NavLink
          to="/admin-parents"
          className={({ isActive }) =>
            `admin-nav-link ${isActive ? "active" : ""}`
          }
        >
          <span aria-hidden="true">{illustrated ? <Users /> : "♙"}</span>
          Parent Management
        </NavLink>

        <NavLink
          to="/admin-children"
          className={({ isActive }) =>
            `admin-nav-link ${isActive ? "active" : ""}`
          }
        >
          <span aria-hidden="true">{illustrated ? <Baby /> : "♧"}</span>
          Child Management
        </NavLink>

        <NavLink
          to="/admin-subscriptions"
          className={({ isActive }) =>
            `admin-nav-link ${isActive ? "active" : ""}`
          }
        >
          <span aria-hidden="true">{illustrated ? <Crown /> : "♛"}</span>
          Subscription Management
        </NavLink>

        <NavLink
          to="/admin-contact"
          className={({ isActive }) =>
            `admin-nav-link ${isActive ? "active" : ""}`
          }
        >
          <span aria-hidden="true">{illustrated ? <Mail /> : "✉"}</span>
          Contact Messages
        </NavLink>

      </nav>

      {/* SIDEBAR FOOTER */}
      <div className="admin-sidebar-bottom">
        {illustrated && <img className="admin-sidebar-art" src={sidebarArt} alt="" />}
        <p>MindSpring</p>
        <span>Learning made meaningful</span>
      </div>

    </aside>
  );
}

export default AdminSidebar;
