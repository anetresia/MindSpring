
import { useState } from "react";
import "../../styles/parent-dashboard/profile-dropdown.css";

const API_BASE_URL = "http://127.0.0.1:8000";

// SVG VECTOR ICONS

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="23"
      height="23"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="23"
      height="23"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
      <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
    </svg>
  );
}

function getInitials(name) {
  return (name || "Parent")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function getImageUrl(profileImage) {
  if (!profileImage) return "";

  if (
    profileImage.startsWith("http://") ||
    profileImage.startsWith("https://")
  ) {
    return profileImage;
  }

  return `${API_BASE_URL}${
    profileImage.startsWith("/") ? "" : "/"
  }${profileImage}`;
}

function ProfileDropdown({
  isOpen,
  onToggle,
  parentName,
  parentEmail,
  profileImage,
  onLogout,
  onProfileClick,
}) {
  const [imageError, setImageError] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const imageUrl = getImageUrl(profileImage);
  const showImage = imageUrl && !imageError;

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    onLogout?.();
  };

  return (
    <div className="profile-wrapper">

      {/* PROFILE BUTTON */}

      <button
        type="button"
        className="profile-btn"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-label="Open profile menu"
      >
        <span className="profile-avatar">
          {showImage ? (
            <img
              src={imageUrl}
              alt="Profile"
              onError={() => setImageError(true)}
            />
          ) : (
            getInitials(parentName)
          )}
        </span>

        <span className="profile-parent-name">
          {parentName || "Parent"}
        </span>

        <span className="profile-chevron">
          ⌄
        </span>
      </button>

      {/* BLURRED BACKGROUND */}

      {isOpen && (
        <div
          className="profile-backdrop"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* PROFILE POPUP CARD */}

      {isOpen && (
        <div className="dashboard-dropdown profile-dropdown">

          <div className="profile-card-content">

            <button
              type="button"
              className="profile-close-btn"
              onClick={onToggle}
              aria-label="Close profile popup"
            >
              ×
            </button>

            {/* PROFILE INFORMATION */}

            <div className="profile-card-header">

              <span className="profile-card-avatar">
                {showImage ? (
                  <img
                    src={imageUrl}
                    alt="Profile"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  getInitials(parentName)
                )}
              </span>

              <div className="profile-card-user-info">
                <h3>{parentName || "Parent"}</h3>
                <p>{parentEmail || "Parent Account"}</p>
              </div>

            </div>

            <div className="profile-card-divider" />

            {/* MY PROFILE */}

            <button
              type="button"
              className="profile-menu-btn"
              onClick={onProfileClick}
            >
              <span className="profile-menu-icon">
                <UserIcon />
              </span>

              <span>My Profile</span>

              <span className="profile-menu-arrow">›</span>
            </button>

            {/* LOGOUT */}

            <button
              type="button"
              className="profile-menu-btn profile-logout-btn"
              onClick={handleLogoutClick}
            >
              <span className="profile-menu-icon">
                <LogoutIcon />
              </span>

              <span>Logout</span>

              <span className="profile-menu-arrow">›</span>
            </button>

          </div>
        </div>
      )}

      {/* LOGOUT CONFIRMATION */}

      {showLogoutConfirm && (
        <div
          className="logout-modal-overlay"
          onClick={handleCancelLogout}
        >
          <div
            className="logout-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-modal-title"
            onClick={(event) => event.stopPropagation()}
          >

            <div className="logout-modal-icon">
              <LogoutIcon />
            </div>

            <h2 id="logout-modal-title">
              Are you sure you want to logout?
            </h2>

            <p>
              Do you really want to logout from your MindSpring account?
            </p>

            <div className="logout-modal-actions">

              <button
                type="button"
                className="logout-cancel-btn"
                onClick={handleCancelLogout}
              >
                Cancel
              </button>

              <button
                type="button"
                className="logout-confirm-btn"
                onClick={handleConfirmLogout}
              >
                Logout
              </button>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default ProfileDropdown;
