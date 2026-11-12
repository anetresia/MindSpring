import { useEffect, useState } from "react";

import AdminSidebar from "../components/admin/AdminSidebar";
import AdminHeader from "../components/admin/AdminHeader";

import { getAdminChildren, getAdminChild, updateAdminChild } from "../api";

import "../styles/admin/admin-dashboard.css";
import "../styles/admin/admin-management.css";

function AdminChildren() {
  const [children, setChildren] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedChild, setSelectedChild] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    child_name: "",
    date_of_birth: "",
    communication_method: "",
    preferred_learning_mode: "",
    daily_learning_limit: "",
  });

  // ========================================
  // LOAD CHILDREN
  // ========================================

  async function loadChildren(searchValue = search) {
    try {
      setLoading(true);
      setError("");

      const response = await getAdminChildren(searchValue);

      setChildren(response.children || []);
    } catch (err) {
      setError(err.message || "Unable to load children.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadChildren("");
  }, []);

  // ========================================
  // SEARCH
  // ========================================

  function handleSearch(event) {
    const value = event.target.value;

    setSearch(value);
    loadChildren(value);
  }

  // ========================================
  // VIEW CHILD DETAILS
  // ========================================

  async function handleView(childId) {
    try {
      setError("");

      const response = await getAdminChild(childId);

      setSelectedChild(response.child);
      setShowDetails(true);
    } catch (err) {
      setError(err.message || "Unable to load child details.");
    }
  }

  // ========================================
  // OPEN EDIT FORM
  // ========================================

  function handleEdit(child) {
    setSelectedChild(child);

    setFormData({
      child_name: child.child_name || "",
      date_of_birth: child.date_of_birth || "",
      communication_method: child.communication_method || "",
      preferred_learning_mode: child.preferred_learning_mode || "",
      daily_learning_limit: child.daily_learning_limit ?? "",
    });

    setShowDetails(false);
    setShowEdit(true);
    setSuccess("");
    setError("");
  }

  // ========================================
  // FORM INPUT
  // ========================================

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // ========================================
  // UPDATE CHILD
  // ========================================

  async function handleUpdate(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (!formData.child_name.trim()) {
        throw new Error("Child name is required.");
      }

      if (!formData.date_of_birth) {
        throw new Error("Date of birth is required.");
      }

      if (
        !formData.daily_learning_limit ||
        Number(formData.daily_learning_limit) <= 0
      ) {
        throw new Error("Daily learning limit must be greater than zero.");
      }

      const updateData = {
        child_name: formData.child_name.trim(),
        date_of_birth: formData.date_of_birth,
        communication_method: formData.communication_method || null,
        preferred_learning_mode:
          formData.preferred_learning_mode || null,
        daily_learning_limit: Number(formData.daily_learning_limit),
      };

      const response = await updateAdminChild(
        selectedChild.child_id,
        updateData
      );

      setSelectedChild(response.child);
      setSuccess("Child details updated successfully.");

      await loadChildren();

      setTimeout(() => {
        setShowEdit(false);
        setSuccess("");
      }, 1000);
    } catch (err) {
      setError(err.message || "Unable to update child details.");
    } finally {
      setSaving(false);
    }
  }

  // ========================================
  // CLOSE MODALS
  // ========================================

  function closeModals() {
    setShowDetails(false);
    setShowEdit(false);
    setSelectedChild(null);
    setError("");
    setSuccess("");
  }

  // ========================================
  // DATE FORMAT
  // ========================================

  function formatDate(value) {
    if (!value) return "Not provided";

    return new Date(value).toLocaleDateString();
  }

  // ========================================
  // PAGE
  // ========================================

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <main className="admin-main">
        <AdminHeader />

        <div className="admin-dashboard-content">

          <div className="management-welcome">
            <div>
              <h1>Child Management</h1>
              <p>
                View and manage all children registered in MindSpring.
              </p>
            </div>
          </div>

          {/* STATISTICS */}

          <div className="management-stat-grid">
            <div className="management-stat-card">
              <div className="management-stat-icon">♧</div>
              <div>
                <p>Total Children</p>
                <h2>{children.length}</h2>
              </div>
            </div>
          </div>

          {/* CHILD LIST */}

          <section className="management-section">

            <div className="management-section-header">
              <div>
                <h2>Registered Children</h2>
                <p>Manage child profiles and learning preferences.</p>
              </div>

              <div className="management-search">
                <span>⌕</span>
                <input
                  type="text"
                  placeholder="Search child or parent..."
                  value={search}
                  onChange={handleSearch}
                />
              </div>
            </div>

            {error && !showEdit && !showDetails && (
              <div className="management-error">{error}</div>
            )}

            <div className="management-table-wrapper">
              <table className="management-table">
                <thead>
                  <tr>
                    <th>Child</th>
                    <th>Parent</th>
                    <th>Parent Email</th>
                    <th>Date of Birth</th>
                    <th>Learning Mode</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="management-empty">
                        Loading children...
                      </td>
                    </tr>
                  ) : children.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="management-empty">
                        No children found.
                      </td>
                    </tr>
                  ) : (
                    children.map((child) => (
                      <tr key={child.child_id}>
                        <td>
                          <div className="management-user-cell">
                            <div className="management-avatar">
                              {child.child_name?.charAt(0)?.toUpperCase()}
                            </div>
                            <strong>{child.child_name}</strong>
                          </div>
                        </td>

                        <td>{child.parent?.name || "N/A"}</td>

                        <td>{child.parent?.email || "N/A"}</td>

                        <td>{formatDate(child.date_of_birth)}</td>

                        <td>
                          {child.preferred_learning_mode || "Not set"}
                        </td>

                        <td>
                          <div className="management-actions">
                            <button
                              className="management-view-btn"
                              onClick={() => handleView(child.child_id)}
                            >
                              View
                            </button>

                            <button
                              className="management-edit-btn"
                              onClick={() => handleEdit(child)}
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="management-table-footer">
              Showing {children.length} children
            </div>

          </section>
        </div>
      </main>

      {/* ========================================
          CHILD DETAILS MODAL
      ======================================== */}

      {showDetails && selectedChild && (
        <div className="management-modal-overlay" onClick={closeModals}>
          <div
            className="management-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="management-modal-header">
              <div>
                <h2>Child Details</h2>
                <p>Complete child profile information</p>
              </div>

              <button
                className="management-close-btn"
                onClick={closeModals}
              >
                ×
              </button>
            </div>

            <div className="management-details">

              <div className="management-detail-profile">
                <div className="management-large-avatar">
                  {selectedChild.child_name?.charAt(0)?.toUpperCase()}
                </div>

                <div>
                  <h3>{selectedChild.child_name}</h3>
                  <p>Child ID: {selectedChild.child_id}</p>
                </div>
              </div>

              <h3 className="management-subheading">
                Child Information
              </h3>

              <div className="management-detail-grid">
                <div>
                  <label>Date of Birth</label>
                  <p>{formatDate(selectedChild.date_of_birth)}</p>
                </div>

                <div>
                  <label>Communication Method</label>
                  <p>{selectedChild.communication_method || "Not set"}</p>
                </div>

                <div>
                  <label>Preferred Learning Mode</label>
                  <p>{selectedChild.preferred_learning_mode || "Not set"}</p>
                </div>

                <div>
                  <label>Daily Learning Limit</label>
                  <p>
                    {selectedChild.daily_learning_limit
                      ? `${selectedChild.daily_learning_limit} minutes`
                      : "Not set"}
                  </p>
                </div>
              </div>

              <h3 className="management-subheading">
                Parent Information
              </h3>

              <div className="management-detail-grid">
                <div>
                  <label>Parent Name</label>
                  <p>{selectedChild.parent?.name || "N/A"}</p>
                </div>

                <div>
                  <label>Parent Email</label>
                  <p>{selectedChild.parent?.email || "N/A"}</p>
                </div>

                <div>
                  <label>Parent Phone</label>
                  <p>{selectedChild.parent?.phone || "N/A"}</p>
                </div>
              </div>

              <div className="management-modal-actions">
                <button
                  className="management-cancel-btn"
                  onClick={closeModals}
                >
                  Close
                </button>

                <button
                  className="management-primary-btn"
                  onClick={() => handleEdit(selectedChild)}
                >
                  Edit Child
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================
          EDIT CHILD MODAL
      ======================================== */}

      {showEdit && selectedChild && (
        <div className="management-modal-overlay" onClick={closeModals}>
          <div
            className="management-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="management-modal-header">
              <div>
                <h2>Edit Child Details</h2>
                <p>Update the child's profile information.</p>
              </div>

              <button
                className="management-close-btn"
                onClick={closeModals}
              >
                ×
              </button>
            </div>

            <form className="management-form" onSubmit={handleUpdate}>

              <div className="management-form-group">
                <label>Child Name</label>
                <input
                  type="text"
                  name="child_name"
                  value={formData.child_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="management-form-group">
                <label>Date of Birth</label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="management-form-group">
                <label>Communication Method</label>
                <input
                  type="text"
                  name="communication_method"
                  value={formData.communication_method}
                  onChange={handleChange}
                />
              </div>

              <div className="management-form-group">
                <label>Preferred Learning Mode</label>
                <input
                  type="text"
                  name="preferred_learning_mode"
                  value={formData.preferred_learning_mode}
                  onChange={handleChange}
                />
              </div>

              <div className="management-form-group">
                <label>Daily Learning Limit (Minutes)</label>
                <input
                  type="number"
                  name="daily_learning_limit"
                  min="1"
                  value={formData.daily_learning_limit}
                  onChange={handleChange}
                  required
                />
              </div>

              {error && (
                <div className="management-error">{error}</div>
              )}

              {success && (
                <div className="management-success">{success}</div>
              )}

              <div className="management-modal-actions">
                <button
                  type="button"
                  className="management-cancel-btn"
                  onClick={closeModals}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="management-primary-btn"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default AdminChildren;