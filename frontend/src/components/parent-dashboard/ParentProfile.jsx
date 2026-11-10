
import { useEffect, useState } from "react";

import {
  getParentProfile,
  updateParentProfile,
  uploadParentProfileImage,
} from "../../api";

import "../../styles/parent-dashboard/parent-profile.css";
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

function getImageUrl(imagePath) {
  if (!imagePath) return "";

  if (
    imagePath.startsWith("http://") ||
    imagePath.startsWith("https://")
  ) {
    return imagePath;
  }

  return `${API_BASE_URL}${
    imagePath.startsWith("/") ? imagePath : `/${imagePath}`
  }`;
}

function ParentProfile({ onProfileUpdate, onLogout }) {
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    profile_image: "",
  });

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
  });

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [imageLoadError, setImageLoadError] = useState(false);

  // Logout confirmation state
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const imageUrl = getImageUrl(profile.profile_image);

  // ========================================
  // LOAD PARENT PROFILE
  // ========================================

  async function loadProfile() {
    try {
      setLoading(true);
      setError("");

      const data = await getParentProfile();

      const updatedProfile = {
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        profile_image: data.profile_image || "",
      };

      setProfile(updatedProfile);

      setFormData({
        name: updatedProfile.name,
        phone: updatedProfile.phone,
      });

      setImageLoadError(false);

      onProfileUpdate?.(updatedProfile);
    } catch (err) {
      console.error("Profile loading error:", err);

      setError(
        err.message || "Unable to load profile."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  // ========================================
  // HANDLE INPUT CHANGE
  // ========================================

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // ========================================
  // SAVE PROFILE
  // ========================================

  async function handleSave(event) {
    event.preventDefault();

    if (!formData.name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const data = await updateParentProfile(formData);

      const updatedProfile = {
        ...profile,
        name: data.name ?? formData.name.trim(),
        phone: data.phone ?? formData.phone,
      };

      setProfile(updatedProfile);

      setFormData({
        name: updatedProfile.name,
        phone: updatedProfile.phone || "",
      });

      setEditing(false);

      setSuccess("Profile updated successfully.");

      onProfileUpdate?.(updatedProfile);
    } catch (err) {
      console.error("Profile update error:", err);

      setError(
        err.message || "Unable to update profile."
      );
    } finally {
      setSaving(false);
    }
  }

  // ========================================
  // UPLOAD PROFILE IMAGE
  // ========================================

  async function handleImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Please select a JPG, PNG or WEBP image.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5 MB.");
      event.target.value = "";
      return;
    }

    try {
      setUploading(true);
      setError("");
      setSuccess("");

      const data = await uploadParentProfileImage(file);

      const imagePath =
        data.profile_image ||
        data.image_url ||
        data.image;

      if (!imagePath) {
        throw new Error(
          "Image uploaded, but image URL was not returned."
        );
      }

      const updatedProfile = {
        ...profile,
        profile_image: imagePath,
      };

      setProfile(updatedProfile);

      setImageLoadError(false);

      onProfileUpdate?.(updatedProfile);

      setSuccess("Profile image updated successfully.");
    } catch (err) {
      console.error("Image upload error:", err);

      setError(
        err.message || "Unable to upload profile image."
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  // ========================================
  // CANCEL EDITING
  // ========================================

  function handleCancel() {
    setFormData({
      name: profile.name,
      phone: profile.phone || "",
    });

    setEditing(false);
    setError("");
  }

  // ========================================
  // LOGOUT CONFIRMATION
  // ========================================

  function handleLogoutClick() {
    setShowLogoutConfirm(true);
  }

  function handleCancelLogout() {
    setShowLogoutConfirm(false);
  }

  function handleConfirmLogout() {
    setShowLogoutConfirm(false);
    onLogout?.();
  }

  // ========================================
  // LOADING
  // ========================================

  if (loading) {
    return (
      <div className="parent-profile-page">
        <p className="profile-loading">
          Loading profile...
        </p>
      </div>
    );
  }

  // ========================================
  // PROFILE PAGE
  // ========================================

  return (
    <div className="parent-profile-page">

      {/* PAGE HEADING */}

      <div className="profile-heading">
        <div>
          <h2>My Profile</h2>

          <p>
            Manage your personal account information.
          </p>
        </div>
      </div>

      {/* ERROR MESSAGE */}

      {error && (
        <div className="profile-message profile-error">
          {error}
        </div>
      )}

      {/* SUCCESS MESSAGE */}

      {success && (
        <div className="profile-message profile-success">
          {success}
        </div>
      )}

      {/* PROFILE CARD */}

      <section className="profile-main-card">

        {/* PROFILE IMAGE AND DETAILS */}

        <div className="profile-avatar-section">

          <div className="profile-large-avatar">

            {imageUrl && !imageLoadError ? (
              <img
                key={imageUrl}
                src={imageUrl}
                alt="Parent profile"
                onLoad={() => {
                  setImageLoadError(false);
                }}
                onError={() => {
                  console.error(
                    "Unable to load profile image:",
                    imageUrl
                  );

                  setImageLoadError(true);
                }}
              />
            ) : (
              <span>
                {getInitials(profile.name)}
              </span>
            )}

          </div>

          <div className="profile-avatar-info">

            <h3>
              {profile.name || "Parent"}
            </h3>

            <p>{profile.email}</p>

            <label className="profile-upload-button">

              {uploading
                ? "Uploading..."
                : "Change Photo"}

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                disabled={uploading}
                hidden
              />

            </label>

            <small>
              JPG, PNG or WEBP. Maximum 5 MB.
            </small>

          </div>

        </div>

        <div className="profile-divider" />

        {/* PERSONAL INFORMATION */}

        <div className="profile-details-heading">

          <div>
            <h3>Personal Information</h3>

            <p>
              Update your account details.
            </p>
          </div>

          {!editing && (
            <button
              type="button"
              className="profile-edit-button"
              onClick={() => {
                setEditing(true);
                setError("");
                setSuccess("");
              }}
            >
              Edit Profile
            </button>
          )}

        </div>

        {/* PROFILE FORM */}

        <form onSubmit={handleSave}>

          <div className="profile-form-grid">

            {/* FULL NAME */}

            <div className="profile-field">

              <label>Full Name</label>

              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={!editing}
                placeholder="Enter your full name"
              />

            </div>

            {/* EMAIL */}

            <div className="profile-field">

              <label>Email Address</label>

              <input
                type="email"
                value={profile.email}
                disabled
              />

              <small>
                Email address cannot be changed here.
              </small>

            </div>

            {/* PHONE */}

            <div className="profile-field">

              <label>Phone Number</label>

              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={!editing}
                placeholder="Enter your phone number"
              />

            </div>

          </div>

          {/* SAVE AND CANCEL */}

          {editing && (
            <div className="profile-form-actions">

              <button
                type="button"
                className="profile-cancel-button"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="profile-save-button"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>

            </div>
          )}

        </form>

      </section>

      {/* ACCOUNT ACTIONS */}

      <section className="profile-account-card">

        <div>
          <h3>Account Actions</h3>

          <p>
            Sign out of your MindSpring parent account.
          </p>
        </div>

        <button
          type="button"
          className="profile-logout-button"
          onClick={handleLogoutClick}
        >
          Logout
        </button>

      </section>

      {/* LOGOUT CONFIRMATION MODAL */}

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

export default ParentProfile;
