
import { useEffect, useState } from "react";

import AdminSidebar from "../components/admin/AdminSidebar";
import AdminHeader from "../components/admin/AdminHeader";

import { getAdminParents, getAdminParent, updateAdminParent } from "../api";

import "../styles/admin/admin-dashboard.css";
import "../styles/admin/admin-management.css";

function AdminParents() {
  const [parents, setParents] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedParent, setSelectedParent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });

  // ========================================
  // LOAD PARENTS
  // ========================================

  async function loadParents(searchValue = "") {
    try {
      setLoading(true);
      setError("");

      const response = await getAdminParents(searchValue);

      setParents(response.parents || []);
    } catch (err) {
      setError(err.message || "Unable to load parents.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadParents();
  }, []);

  // ========================================
  // SEARCH
  // ========================================

  function handleSearch(event) {
    const value = event.target.value;

    setSearch(value);
    loadParents(value);
  }

  // ========================================
  // VIEW PARENT DETAILS
  // ========================================

  async function handleViewParent(parentId) {
    try {
      setError("");

      const response = await getAdminParent(parentId);
      const parent = response.parent;

      setSelectedParent(parent);

      setFormData({
        name: parent.name || "",
        email: parent.email || "",
        phone: parent.phone || "",
      });

      setEditMode(false);
      setShowModal(true);
    } catch (err) {
      setError(err.message || "Unable to load parent details.");
    }
  }

  // ========================================
  // FORM INPUT
  // ========================================

  function handleInputChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // ========================================
  // UPDATE PARENT
  // ========================================

  async function handleUpdateParent(event) {
    event.preventDefault();

    if (!selectedParent) return;

    try {
      setSaving(true);
      setError("");

      const response = await updateAdminParent(
        selectedParent.parent_id,
        {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || null,
        }
      );

      setSelectedParent((previous) => ({
        ...previous,
        ...response.parent,
      }));

      setEditMode(false);

      await loadParents(search);

    } catch (err) {
      setError(err.message || "Unable to update parent.");
    } finally {
      setSaving(false);
    }
  }

  // ========================================
  // CLOSE MODAL
  // ========================================

  function closeModal() {
    setShowModal(false);
    setSelectedParent(null);
    setEditMode(false);
  }

  // ========================================
  // FORMAT DATE
  // ========================================

  function formatDate(dateValue) {
    if (!dateValue) return "—";

    return new Date(dateValue).toLocaleDateString();
  }

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <main className="admin-main">
        <AdminHeader title="Parent Management" />

        <div className="admin-dashboard-content">

          {/* PAGE INTRO */}

          <section className="management-welcome">
            <div>
              <h2>Parent Management</h2>
              <p>
                View and manage registered parents and their
                children's information.
              </p>
            </div>

            <div className="management-welcome-icon">
              ♙
            </div>
          </section>

          {/* STATISTICS */}

          <section className="management-stat-grid">

            <div className="admin-stat-card stat-card-purple">
              <div className="admin-stat-icon">♙</div>
              <p>Total Parents</p>
              <h3>{parents.length}</h3>
              <span>Registered parents</span>
            </div>

          </section>

          {/* PARENT LIST */}

          <section className="management-list-panel">

            <div className="management-list-heading">
              <div>
                <h2>Registered Parents</h2>
                <p>
                  View parent information and associated children.
                </p>
              </div>
            </div>

            {/* SEARCH */}

            <div className="management-search">
              <span>⌕</span>

              <input
                type="text"
                value={search}
                onChange={handleSearch}
                placeholder="Search by name, email or phone..."
              />
            </div>

            {error && !showModal && (
              <div className="management-error">
                {error}
              </div>
            )}

            {/* TABLE */}

            <div className="management-table-wrapper">
              <table className="management-table">

                <thead>
                  <tr>
                    <th>Parent</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Children</th>
                    <th>Registered Date</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>

                  {loading ? (
                    <tr>
                      <td colSpan="6" className="management-message">
                        Loading parents...
                      </td>
                    </tr>
                  ) : parents.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="management-message">
                        No parents found.
                      </td>
                    </tr>
                  ) : (
                    parents.map((parent) => (
                      <tr key={parent.parent_id}>

                        <td>
                          <div className="management-parent-cell">

                            <div className="management-avatar">
                              {parent.name?.charAt(0)?.toUpperCase() || "P"}
                            </div>

                            <strong>{parent.name}</strong>
                          </div>
                        </td>

                        <td>{parent.email || "—"}</td>

                        <td>{parent.phone || "—"}</td>

                        <td>
                          <span className="management-count">
                            {parent.children_count ?? 0}
                          </span>
                        </td>

                        <td>{formatDate(parent.created_at)}</td>

                        <td>
                          <button
                            type="button"
                            className="management-view-btn"
                            onClick={() =>
                              handleViewParent(parent.parent_id)
                            }
                          >
                            View Details
                          </button>
                        </td>

                      </tr>
                    ))
                  )}

                </tbody>
              </table>
            </div>

            <div className="management-list-footer">
              Showing {parents.length} parent(s)
            </div>

          </section>

          <footer className="admin-footer">
            Made with care for little learners | MindSpring
          </footer>

        </div>
      </main>

      {/* ========================================
          PARENT DETAILS MODAL
      ======================================== */}

      {showModal && selectedParent && (
        <div
          className="management-modal-overlay"
          onClick={closeModal}
        >
          <div
            className="management-modal"
            onClick={(event) => event.stopPropagation()}
          >

            <div className="management-modal-header">
              <div>
                <h2>Parent Details</h2>
                <p>View and update parent information.</p>
              </div>

              <button
                type="button"
                className="management-close-btn"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            {error && (
              <div className="management-error">
                {error}
              </div>
            )}

            {/* PARENT FORM */}

            <form onSubmit={handleUpdateParent}>

              <div className="management-form-grid">

                <div className="management-form-group">
                  <label>Parent Name</label>

                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    required
                  />
                </div>

                <div className="management-form-group">
                  <label>Email Address</label>

                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    required
                  />
                </div>

                <div className="management-form-group">
                  <label>Phone Number</label>

                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    disabled={!editMode}
                  />
                </div>

                <div className="management-form-group">
                  <label>Registered Date</label>

                  <input
                    type="text"
                    value={formatDate(selectedParent.created_at)}
                    disabled
                  />
                </div>

              </div>

              {/* CHILDREN */}

              <div className="management-children-section">

                <div className="management-children-heading">
                  <h3>Associated Children</h3>

                  <span>
                    {selectedParent.children_count ?? 0}
                  </span>
                </div>

                {selectedParent.children?.length > 0 ? (
                  <div className="management-children-list">

                    {selectedParent.children.map((child) => (
                      <div
                        className="management-child-item"
                        key={child.child_id}
                      >
                        <div className="management-child-avatar">
                          ♧
                        </div>

                        <div>
                          <strong>{child.child_name}</strong>

                          <p>
                            Date of Birth:{" "}
                            {formatDate(child.date_of_birth)}
                          </p>
                        </div>
                      </div>
                    ))}

                  </div>
                ) : (
                  <p className="management-no-children">
                    No children registered under this parent.
                  </p>
                )}

              </div>

              {/* MODAL ACTIONS */}

              <div className="management-modal-actions">

                {editMode ? (
                  <>
                    <button
                      type="button"
                      className="management-cancel-btn"
                      onClick={() => {
                        setEditMode(false);

                        setFormData({
                          name: selectedParent.name || "",
                          email: selectedParent.email || "",
                          phone: selectedParent.phone || "",
                        });
                      }}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="management-save-btn"
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="management-save-btn"
                    onClick={() => setEditMode(true)}
                  >
                    Edit Parent
                  </button>
                )}

              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}

export default AdminParents;
