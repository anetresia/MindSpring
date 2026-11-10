
import { useNavigate } from "react-router-dom";

import AdminSidebar from "../components/admin/AdminSidebar";
import AdminHeader from "../components/admin/AdminHeader";

import "../styles/admin/admin-dashboard.css";

function AdminDashboard() {
  const navigate = useNavigate();

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

          <section className="admin-stat-grid">

            <div className="admin-stat-card stat-card-purple">
              <div className="admin-stat-icon">▶</div>
              <p>Total Videos</p>
              <h3>—</h3>
              <span>Learning content</span>
            </div>

            <div className="admin-stat-card stat-card-green">
              <div className="admin-stat-icon">▤</div>
              <p>Life Skill Topics</p>
              <h3>—</h3>
              <span>Available topics</span>
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
