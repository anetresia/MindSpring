
import { useEffect, useState } from "react";
import { CalendarDays, Eye, Mail, Play, Search, Users, Video, X } from "lucide-react";

import AdminSidebar from "../components/admin/AdminSidebar";
import AdminHeader from "../components/admin/AdminHeader";

import { getAdminChildren, getAdminChild } from "../api";

import welcomeArt from "../assets/hero-bg.png";
import "../styles/admin/admin-dashboard.css";
import "../styles/admin/admin-children.css";

function isVideoLearner(child) {
  return child.preferred_learning_mode?.trim().toLowerCase() === "video";
}

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
    <div className="admin-layout admin-dashboard-page admin-children-page">
      <AdminSidebar illustrated />

      <main className="admin-main">
        <AdminHeader title="Child Management" />

        <div className="admin-dashboard-content">

          {/* PAGE INTRO */}

          <section className="admin-welcome">
            <div className="admin-welcome-copy">
              <h2>Child Management</h2>
              <p>View and manage all children registered in MindSpring.</p>
            </div>
            <div className="admin-welcome-art" aria-hidden="true">
              <img src={welcomeArt} alt="" />
            </div>
          </section>

          <section className="management-stat-grid" aria-label="Child statistics" aria-busy={loading}>
            <div className="management-stat-card">
              <div className="management-stat-icon"><Users aria-hidden="true" /></div>
              <div>
                <p>Total Children</p>
                <strong>{children.length}</strong>
              </div>
            </div>

            <div className="management-stat-card">
              <div className="management-stat-icon"><Video aria-hidden="true" /></div>
              <div>
                <p>Video Learners</p>
                <strong>{children.filter(isVideoLearner).length}</strong>
              </div>
            </div>
          </section>

          {/* CHILD LIST */}

          <section className="management-section">

            <div className="management-section-header">

              <div className="management-section-title">
                <span className="management-stat-icon"><Users aria-hidden="true" /></span>
                <div>
                  <h2 id="registered-children-title">Registered Children</h2>
                  <p>View child profiles and learning information.</p>
                </div>
              </div>

              <div className="management-search">
                <Search aria-hidden="true" />

                <input
                  type="text"
                  aria-label="Search child or parent"
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

            <div
              className="management-table-wrapper"
              tabIndex={0}
              role="region"
              aria-labelledby="registered-children-title"
            >
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
                          <span className="management-child-cell">
                            <Mail aria-hidden="true" />
                            {child.parent?.email || "N/A"}
                          </span>
                        </td>

                        <td>
                          <span className="management-child-cell">
                            <CalendarDays aria-hidden="true" />
                            {formatDate(child.date_of_birth)}
                          </span>
                        </td>

                        <td>
                          <span className="management-child-cell">
                            {isVideoLearner(child) && <Play aria-hidden="true" />}
                            {child.preferred_learning_mode || "Not set"}
                          </span>
                        </td>

                        <td>
                          <div className="management-actions">

                            <button
                              type="button"
                              className="management-view-btn"
                              onClick={() => handleView(child.child_id)}
                            >
                              <Eye aria-hidden="true" /> View
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
                aria-label="Close child details"
              >
                <X aria-hidden="true" />
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
