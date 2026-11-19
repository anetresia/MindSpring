import { useEffect, useId, useRef, useState } from "react";
import { Baby, Crown, LayoutGrid, Mail, Menu, Play, Users, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import sidebarArt from "../../assets/parent-sidebar-bg.png";
import mindspringLogo from "../../assets/mindspring-logo.png";
import "../../styles/admin/admin-sidebar.css";

function AdminSidebar({ illustrated = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const menuToggle = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;

    const mobileViewport = window.matchMedia("(max-width: 760px)");
    function closeOnDesktop(event) {
      if (!event.matches) setMenuOpen(false);
    }

    function closeOnEscape(event) {
      if (event.key !== "Escape" || event.defaultPrevented) return;

      setMenuOpen(false);
      menuToggle.current?.focus();
    }

    mobileViewport.addEventListener("change", closeOnDesktop);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      mobileViewport.removeEventListener("change", closeOnDesktop);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  function closeMenu() {
    if (!menuOpen) return;

    setMenuOpen(false);
    menuToggle.current?.focus();
  }

  return (
    <aside className={menuOpen ? "admin-sidebar is-open" : "admin-sidebar"}>

      {/* BRAND LOGO */}
      <div className="admin-brand">
        <img
          src={mindspringLogo}
          alt="MindSpring Logo"
          className="admin-brand-logo"
        />
      </div>

      <button
        ref={menuToggle}
        type="button"
        className="admin-menu-toggle"
        aria-label={menuOpen ? "Close admin navigation" : "Open admin navigation"}
        aria-controls={menuId}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
      </button>

      {/* MENU LABEL */}
      <div className="admin-sidebar-label">MENU</div>

      {/* NAVIGATION */}
      <nav id={menuId} className="admin-navigation" aria-label="Admin navigation">

        <NavLink
          to="/admin-dashboard"
          end
          onClick={closeMenu}
          className={({ isActive }) =>
            `admin-nav-link ${isActive ? "active" : ""}`
          }
        >
          <span aria-hidden="true">{illustrated ? <LayoutGrid /> : "▦"}</span>
          Dashboard
        </NavLink>

        <NavLink
          to="/admin-content"
          onClick={closeMenu}
          className={({ isActive }) =>
            `admin-nav-link ${isActive ? "active" : ""}`
          }
        >
          <span aria-hidden="true">{illustrated ? <Play /> : "▶"}</span>
          Video Management
        </NavLink>

        <NavLink
          to="/admin-parents"
          onClick={closeMenu}
          className={({ isActive }) =>
            `admin-nav-link ${isActive ? "active" : ""}`
          }
        >
          <span aria-hidden="true">{illustrated ? <Users /> : "♙"}</span>
          Parent Management
        </NavLink>

        <NavLink
          to="/admin-children"
          onClick={closeMenu}
          className={({ isActive }) =>
            `admin-nav-link ${isActive ? "active" : ""}`
          }
        >
          <span aria-hidden="true">{illustrated ? <Baby /> : "♧"}</span>
          Child Management
        </NavLink>

        <NavLink
          to="/admin-subscriptions"
          onClick={closeMenu}
          className={({ isActive }) =>
            `admin-nav-link ${isActive ? "active" : ""}`
          }
        >
          <span aria-hidden="true">{illustrated ? <Crown /> : "♛"}</span>
          Subscription Management
        </NavLink>

        <NavLink
          to="/admin-contact"
          onClick={closeMenu}
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
        {illustrated && (
          <div className="admin-sidebar-art-frame">
            <img className="admin-sidebar-art" src={sidebarArt} alt="" />
          </div>
        )}
        <p>MindSpring</p>
        <span>Learning made meaningful</span>
      </div>

    </aside>
  );
}

export default AdminSidebar;
