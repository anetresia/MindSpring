
import { useEffect, useState } from "react";
import { Baby, CalendarDays, Eye, Heart, Mail, Phone, Search, Star, Users, X } from "lucide-react";

import AdminSidebar from "../components/admin/AdminSidebar";
import AdminHeader from "../components/admin/AdminHeader";

import { getAdminParents, getAdminParent } from "../api";

import parentAndChild from "../assets/admin-parent-and-child.svg";
import "../styles/admin/admin-dashboard.css";
import "../styles/admin/admin-parents.css";

function AdminParents() {
  const [parents, setParents] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedParent, setSelectedParent] = useState(null);
  const [showModal, setShowModal] = useState(false);

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

      setSelectedParent(response.parent);
      setShowModal(true);
    } catch (err) {
      setError(err.message || "Unable to load parent details.");
    }
  }

  // ========================================
  // CLOSE MODAL
  // ========================================

  function closeModal() {
    setShowModal(false);
    setSelectedParent(null);
  }

  // ========================================
  // FORMAT DATE
  // ========================================

  function formatDate(dateValue) {
    if (!dateValue) return "—";

    return new Date(dateValue).toLocaleDateString();
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="admin-layout admin-dashboard-page admin-parents-page">
      <AdminSidebar illustrated />

      <main className="admin-main">
        <AdminHeader title="Parent Management" />

        <div className="admin-dashboard-content">

          {/* PAGE INTRO */}

          <section className="management-welcome">
            <div className="management-welcome-copy">
              <h2>Parent Management</h2>

              <p>
                View registered parents and their
                children's information.
              </p>
            </div>

            <div className="management-welcome-art" aria-hidden="true">
              <Heart className="management-welcome-heart" />
              <Star className="management-welcome-star" />
              <img src={parentAndChild} alt="" />
            </div>
          </section>

          {/* STATISTICS */}

          <section className="management-stat-grid">

            <div className="management-parent-stat">
              <div className="management-icon-badge"><Users aria-hidden="true" /></div>
              <div>
                <p>Total Parents</p>
                <strong>{parents.length}</strong>
                <span>Registered parents</span>
              </div>
              <Users className="management-stat-art" aria-hidden="true" />
            </div>

          </section>

          {/* PARENT LIST */}

          <section className="management-list-panel">

            <div className="management-list-heading">
              <span className="management-icon-badge"><Users aria-hidden="true" /></span>
              <div>
                <h2>Registered Parents</h2>

                <p>
                  View parent information and associated children.
                </p>
              </div>
            </div>

            {/* SEARCH */}

            <div className="management-search">
              <Search aria-hidden="true" />

              <input
                type="text"
                value={search}
                onChange={handleSearch}
                aria-label="Search by name, email or phone"
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
                      <td
                        colSpan="6"
                        className="management-message"
                      >
                        Loading parents...
                      </td>
                    </tr>
                  ) : parents.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="management-message"
                      >
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

                        <td>
                          <span className="management-cell-with-icon">
                            <Mail aria-hidden="true" />{parent.email || "—"}
                          </span>
                        </td>

                        <td>
                          <span className="management-cell-with-icon">
                            <Phone aria-hidden="true" />{parent.phone || "—"}
                          </span>
                        </td>

                        <td>
                          <span className="management-count">
                            <Baby aria-hidden="true" />
                            {parent.children_count ?? 0} {parent.children_count === 1 ? "Child" : "Children"}
                          </span>
                        </td>

                        <td>
                          <span className="management-cell-with-icon">
                            <CalendarDays aria-hidden="true" />{formatDate(parent.created_at)}
                          </span>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="management-view-btn"
                            onClick={() =>
                              handleViewParent(parent.parent_id)
                            }
                          >
                            <Eye aria-hidden="true" /> View Details
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
          PARENT DETAILS MODAL - VIEW ONLY
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

            {/* MODAL HEADER */}

            <div className="management-modal-header">
              <div>
                <h2>Parent Details</h2>

                <p>
                  View parent information and registered children.
                </p>
              </div>

              <button
                type="button"
                className="management-close-btn"
                onClick={closeModal}
                aria-label="Close parent details"
              >
                <X aria-hidden="true" />
              </button>
            </div>

            {error && (
              <div className="management-error">
                {error}
              </div>
            )}

            {/* PARENT INFORMATION - READ ONLY */}

            <div className="management-form-grid">

              <div className="management-form-group">
                <label>Parent Name</label>

                <input
                  type="text"
                  value={selectedParent.name || "—"}
                  disabled
                  readOnly
                />
              </div>

              <div className="management-form-group">
                <label>Email Address</label>

                <input
                  type="email"
                  value={selectedParent.email || "—"}
                  disabled
                  readOnly
                />
              </div>

              <div className="management-form-group">
                <label>Phone Number</label>

                <input
                  type="text"
                  value={selectedParent.phone || "—"}
                  disabled
                  readOnly
                />
              </div>

              <div className="management-form-group">
                <label>Registered Date</label>

                <input
                  type="text"
                  value={formatDate(selectedParent.created_at)}
                  disabled
                  readOnly
                />
              </div>

            </div>

            {/* ASSOCIATED CHILDREN */}

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
      )}

    </div>
  );
}

export default AdminParents;
