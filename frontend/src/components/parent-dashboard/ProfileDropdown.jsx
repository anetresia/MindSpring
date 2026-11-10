
import { useState } from "react";
import "../../styles/parent-dashboard/profile-dropdown.css";

const API_BASE_URL = "http://127.0.0.1:8000";

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
    onLogout();
  };

  return (
    <div className="profile-wrapper">
      <button
        type="button"
        className="profile-btn"
        onClick={onToggle}
        aria-expanded={isOpen}
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

        <span>{parentName || "Parent"}</span>
        <span>⌄</span>
      </button>

      {isOpen && (
        <div className="dashboard-dropdown profile-dropdown">
          <p>{parentEmail || "Parent Account"}</p>

          <button
            type="button"
            onClick={onProfileClick}
          >
            My Profile
          </button>

          <button
            type="button"
            onClick={handleLogoutClick}
          >
            Logout
          </button>
        </div>
      )}

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
              ↪
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
