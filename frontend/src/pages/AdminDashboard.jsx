
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import AdminSidebar from "../components/admin/AdminSidebar";
import AdminHeader from "../components/admin/AdminHeader";

import { getAdminLessons, getAdminLifeSkillTopics } from "../api";
import "../styles/admin/admin-dashboard.css";

function AdminDashboard() {
  const navigate = useNavigate();

  const [totalVideos, setTotalVideos] = useState(0);
  const [totalTopics, setTotalTopics] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboardData() {
    try {
      setLoading(true);
      setError("");

      const [lessonsData, topicsData] = await Promise.all([
        getAdminLessons(),
        getAdminLifeSkillTopics(),
      ]);

      setTotalVideos(
        Array.isArray(lessonsData) ? lessonsData.length : 0
      );

      // Count ALL topics, including active and inactive topics.
      setTotalTopics(
        Array.isArray(topicsData) ? topicsData.length : 0
      );
    } catch (err) {
      setError(err.message || "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <main className="admin-main">
        <AdminHeader title="Dashboard" />

        <div className="admin-dashboard-content">

          <section className="admin-welcome">
            <div>
              <h2>Welcome to MindSpring Admin!</h2>
              <p>
                Manage learning videos and life skill content
                for children.
              </p>
            </div>

            <div className="admin-welcome-icon">✦</div>
          </section>

          <div className="admin-dashboard-toolbar">
            <div>
              <h2>Dashboard Overview</h2>
              <p>Here's an overview of your learning content.</p>
            </div>

            <button
              type="button"
              className="admin-dashboard-refresh"
              onClick={loadDashboardData}
              disabled={loading}
            >
              {loading ? "Loading..." : "↻ Refresh"}
            </button>
          </div>

          {error && (
            <div className="admin-dashboard-error">
              {error}
            </div>
          )}

          <section className="admin-stat-grid">

            <div className="admin-stat-card stat-card-purple">
              <div className="admin-stat-icon">▶</div>

              <p>Total Videos</p>

              <h3>
                {loading ? "—" : totalVideos}
              </h3>

              <span>Learning videos</span>
            </div>

            <div className="admin-stat-card stat-card-pink">
              <div className="admin-stat-icon">▤</div>

              <p>Life Skill Topics</p>

              <h3>
                {loading ? "—" : totalTopics}
              </h3>

              <span>Active and inactive topics</span>
            </div>

            <div className="admin-stat-card stat-card-peach">
              <div className="admin-stat-icon">＋</div>

              <p>Content Management</p>

              <h3>Manage</h3>

              <span>Videos and lessons</span>
            </div>

          </section>

          <section className="admin-quick-panel">
            <div>
              <h2>Video Management</h2>

              <p>
                Add and manage learning videos for the
                selected Life Skill Topics.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/admin-content")}
            >
              Manage Videos
              <span> →</span>
            </button>
          </section>

          <section className="admin-instruction-panel">
            <h2>Getting Started</h2>

            <div className="admin-instruction-item">
              <span>01</span>

              <div>
                <h3>Select a Life Skill Topic</h3>
                <p>
                  Choose the topic to which the learning video
                  belongs.
                </p>
              </div>
            </div>

            <div className="admin-instruction-item">
              <span>02</span>

              <div>
                <h3>Add a Learning Video</h3>
                <p>
                  Enter the video title, video URL and optional
                  lesson script.
                </p>
              </div>
            </div>

            <div className="admin-instruction-item">
              <span>03</span>

              <div>
                <h3>Make Content Available</h3>
                <p>
                  Saved videos can be displayed to children
                  under their selected topics.
                </p>
              </div>
            </div>
          </section>

          <footer className="admin-footer">
            Made with care for little learners | MindSpring
          </footer>

        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;
