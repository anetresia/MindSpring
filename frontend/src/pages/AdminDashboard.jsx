
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Baby, ChartNoAxesColumnIncreasing, Layers, Play, RefreshCw, Users } from "lucide-react";

import AdminSidebar from "../components/admin/AdminSidebar";
import AdminHeader from "../components/admin/AdminHeader";

import {
  getAdminChildren,
  getAdminLessons,
  getAdminLifeSkillTopics,
  getAdminParents,
} from "../api";

import welcomeArt from "../assets/hero-bg.png";
import videoArt from "../assets/watch-videos-icon.png";
import bookArt from "../assets/lessons-icon.png";
import parentArt from "../assets/admin-parent-and-child.svg";
import childArt from "../assets/reward-girl.png";
import "../styles/admin/admin-dashboard.css";

const statCards = [
  { label: "Total Videos", theme: "purple", icon: Play, art: videoArt, load: getAdminLessons },
  { label: "Life Skill Topics", theme: "pink", icon: Layers, art: bookArt, load: getAdminLifeSkillTopics },
  { label: "Registered Parents", theme: "peach", icon: Users, art: parentArt, load: getAdminParents },
  { label: "Registered Children", theme: "lavender", icon: Baby, art: childArt, load: getAdminChildren },
];

function AdminDashboard() {
  const navigate = useNavigate();

  const [totals, setTotals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboardData() {
    setLoading(true);
    setError("");

    try {
      const results = await Promise.allSettled(statCards.map(({ load }) => load()));
      const counts = results.map((result) => {
        if (result.status !== "fulfilled") return null;
        if (Array.isArray(result.value)) return result.value.length;
        return Number.isInteger(result.value?.total) && result.value.total >= 0
          ? result.value.total
          : null;
      });

      setTotals(counts);
      if (counts.includes(null)) {
        setError("Some dashboard totals could not be loaded. Select Refresh to try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <div className="admin-layout admin-dashboard-page">
      <AdminSidebar illustrated />

      <main className="admin-main">
        <AdminHeader title="Dashboard" />

        <div className="admin-dashboard-content">

          <section className="admin-welcome">
            <div className="admin-welcome-copy">
              <h2>Welcome to MindSpring Admin!</h2>
              <p>
                Manage learning videos and life skill content for children.
              </p>
            </div>

            <div className="admin-welcome-art" aria-hidden="true">
              <img src={welcomeArt} alt="" />
            </div>
          </section>

          <div className="admin-dashboard-toolbar">
            <div className="admin-overview-heading">
              <span className="admin-overview-icon"><ChartNoAxesColumnIncreasing aria-hidden="true" /></span>
              <div>
                <h2>Dashboard Overview</h2>
                <p>Here's an overview of your learning content.</p>
              </div>
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
            <div className="admin-dashboard-error" role="alert">
              {error}
            </div>
          )}

          <section className="admin-stat-grid" aria-label="Admin totals" aria-busy={loading}>
            {statCards.map(({ label, theme, icon: Icon, art }, index) => (
              <div key={label} className={`admin-stat-card stat-card-${theme}`}>
                <div className="admin-stat-icon"><Icon aria-hidden="true" /></div>
                <p>{label}</p>
                <strong className="admin-stat-total">
                  {loading ? "?" : totals[index] ?? <span>Unavailable</span>}
                </strong>
                <img className="admin-stat-art" src={art} alt="" />
              </div>
            ))}
          </section>

          <section className="admin-quick-panel">
            <div className="admin-quick-heading">
              <span className="admin-quick-icon"><Play aria-hidden="true" /></span>
              <div>
                <h2>Video Management</h2>
                <p>Add and manage learning videos for the selected Life Skill Topics.</p>
              </div>
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
