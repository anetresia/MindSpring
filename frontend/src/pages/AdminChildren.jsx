
import { useEffect, useState } from "react";

import AdminSidebar from "../components/admin/AdminSidebar";
import AdminHeader from "../components/admin/AdminHeader";

import { getAdminChildren, getAdminChild } from "../api";

import "../styles/admin/admin-dashboard.css";
import "../styles/admin/admin-children.css";

function AdminChildren() {
  const [children, setChildren] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedChild, setSelectedChild] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  // ========================================
  // LOAD CHILDREN
  // ========================================

  async function loadChildren(searchValue = "") {
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
  // CLOSE MODAL
  // ========================================

  function closeModal() {
    setShowDetails(false);
    setSelectedChild(null);
    setError("");
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

          {/* PAGE INTRO */}

          <div className="management-welcome">
            <div>
              <h1>Child Management</h1>

              <p>
                View all children registered in MindSpring.
              </p>
            </div>
          </div>

          {/* STATISTICS */}

          <div className="management-stat-grid">
            <div className="management-stat-card">

              <div className="management-stat-icon">
                ♧
              </div>

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

                <p>
                  View child profiles and learning information.
                </p>
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

            {error && !showDetails && (
              <div className="management-error">
                {error}
              </div>
            )}

            {/* CHILD TABLE */}

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
                      <td
                        colSpan="6"
                        className="management-empty"
                      >
                        Loading children...
                      </td>
                    </tr>
                  ) : children.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="management-empty"
                      >
                        No children found.
                      </td>
                    </tr>
                  ) : (
                    children.map((child) => (
                      <tr key={child.child_id}>

                        <td>
                          <div className="management-user-cell">

                            <div className="management-avatar">
                              {child.child_name?.charAt(0)?.toUpperCase() || "C"}
                            </div>

                            <strong>{child.child_name}</strong>

                          </div>
                        </td>

                        <td>
                          {child.parent?.name || "N/A"}
                        </td>

                        <td>
                          {child.parent?.email || "N/A"}
                        </td>

                        <td>
                          {formatDate(child.date_of_birth)}
                        </td>

                        <td>
                          {child.preferred_learning_mode || "Not set"}
                        </td>

                        <td>
                          <div className="management-actions">

                            <button
                              type="button"
                              className="management-view-btn"
                              onClick={() => handleView(child.child_id)}
                            >
                              View
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
          CHILD DETAILS MODAL - VIEW ONLY
      ======================================== */}

      {showDetails && selectedChild && (
        <div
          className="management-modal-overlay"
          onClick={closeModal}
        >
          <div
            className="management-modal"
            onClick={(event) => event.stopPropagation()}
          >

            {/* MODAL HEADER */}

            <div className="management-modal-header">

              <div>
                <h2>Child Details</h2>

                <p>
                  View complete child profile information.
                </p>
              </div>

              <button
                type="button"
                className="management-close-btn"
                onClick={closeModal}
              >
                ×
              </button>

            </div>

            {/* CHILD DETAILS */}

            <div className="management-details">

              <div className="management-detail-profile">

                <div className="management-large-avatar">
                  {selectedChild.child_name?.charAt(0)?.toUpperCase() || "C"}
                </div>

                <div>
                  <h3>{selectedChild.child_name}</h3>

                  <p>
                    Child ID: {selectedChild.child_id}
                  </p>
                </div>

              </div>

              {/* CHILD INFORMATION */}

              <h3 className="management-subheading">
                Child Information
              </h3>

              <div className="management-detail-grid">

                <div>
                  <label>Date of Birth</label>

                  <p>
                    {formatDate(selectedChild.date_of_birth)}
                  </p>
                </div>

                <div>
                  <label>Communication Method</label>

                  <p>
                    {selectedChild.communication_method || "Not set"}
                  </p>
                </div>

                <div>
                  <label>Preferred Learning Mode</label>

                  <p>
                    {selectedChild.preferred_learning_mode || "Not set"}
                  </p>
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

              {/* PARENT INFORMATION */}

              <h3 className="management-subheading">
                Parent Information
              </h3>

              <div className="management-detail-grid">

                <div>
                  <label>Parent Name</label>

                  <p>
                    {selectedChild.parent?.name || "N/A"}
                  </p>
                </div>

                <div>
                  <label>Parent Email</label>

                  <p>
                    {selectedChild.parent?.email || "N/A"}
                  </p>
                </div>

                <div>
                  <label>Parent Phone</label>

                  <p>
                    {selectedChild.parent?.phone || "N/A"}
                  </p>
                </div>

              </div>

              {/* MODAL ACTION */}

              <div className="management-modal-actions">

                <button
                  type="button"
                  className="management-cancel-btn"
                  onClick={closeModal}
                >
                  Close
                </button>

              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default AdminChildren;
