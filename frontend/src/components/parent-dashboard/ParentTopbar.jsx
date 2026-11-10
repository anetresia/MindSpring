import { useState } from "react";
import { Menu, X } from "lucide-react";

import NotificationPanel from "./NotificationPanel";
import ProfileDropdown from "./ProfileDropdown";

import logo from "../../assets/mindspring-logo.png";

import "../../styles/parent-dashboard/parent-topbar.css";

function ParentTopbar({
  parentName,
  parentEmail,
  profileImage,
  onLogout,
  onProfileClick,
  onMenuClick,
  isSidebarOpen,
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // ========================================
  // MOBILE MENU TOGGLE
  // ========================================

  function toggleSidebar() {
    setShowNotifications(false);
    setShowProfile(false);

    onMenuClick?.();
  }

  // ========================================
  // NOTIFICATION TOGGLE
  // ========================================

  function toggleNotifications() {
    setShowNotifications((previous) => !previous);
    setShowProfile(false);
  }

  // ========================================
  // PROFILE DROPDOWN TOGGLE
  // ========================================

  function toggleProfile() {
    setShowProfile((previous) => !previous);
    setShowNotifications(false);
  }

  // ========================================
  // OPEN PROFILE PAGE
  // ========================================

  function openProfile() {
    setShowProfile(false);
    onProfileClick?.();
  }

  // ========================================
  // TOPBAR UI
  // ========================================

  return (
    <header className="parent-topbar">

      {/* MOBILE LEFT SECTION */}

      <div className="mobile-topbar-left">

        {/* MOBILE MENU BUTTON */}

        <button
          type="button"
          className="mobile-menu-btn"
          onClick={toggleSidebar}
          aria-label={
            isSidebarOpen ? "Close sidebar" : "Open sidebar"
          }
          aria-expanded={Boolean(isSidebarOpen)}
        >
          {isSidebarOpen ? (
            <X size={24} />
          ) : (
            <Menu size={24} />
          )}
        </button>

        {/* MOBILE LOGO */}

        <div className="mobile-dashboard-logo">
          <img
            src={logo}
            alt="MindSpring Logo"
          />
        </div>

      </div>

      {/* TOPBAR ACTIONS */}

      <div className="topbar-actions">

        <NotificationPanel
          isOpen={showNotifications}
          onToggle={toggleNotifications}
        />

        <ProfileDropdown
          isOpen={showProfile}
          onToggle={toggleProfile}
          parentName={parentName}
          parentEmail={parentEmail}
          profileImage={profileImage}
          onLogout={onLogout}
          onProfileClick={openProfile}
        />

      </div>

    </header>
  );
}

export default ParentTopbar;