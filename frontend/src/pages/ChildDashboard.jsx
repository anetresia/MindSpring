
import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";

import { getChild } from "../api";

import dashboardBg from "../assets/child-dashboard-bg.png";
import mindSpringLogo from "../assets/mindspring-logo.png";

import "../styles/child-dashboard.css";

function ChildDashboard() {
  const { childId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [child, setChild] = useState(location.state?.child || null);
  const [loading, setLoading] = useState(!location.state?.child);
  const [error, setError] = useState("");

  const [selectedCategory, setSelectedCategory] = useState(null);

  // ========================================
  // LOAD CHILD PROFILE
  // ========================================

  useEffect(() => {
    let isMounted = true;

    async function loadChild() {
      if (!childId) {
        setLoading(false);

        if (!location.state?.child) {
          setError("Child profile could not be found.");
        }

        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await getChild(childId);

        if (isMounted) {
          setChild(
            response.child ||
            response.data ||
            response
          );
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err.message || "Unable to load child profile."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadChild();

    return () => {
      isMounted = false;
    };
  }, [childId]);

  // ========================================
  // NAVIGATE TO SEPARATE LEARNING PAGE
  // ========================================

  function handleVideosClick() {
    navigate(`/child-learning/${childId}`, {
      state: { child },
    });
  }

  // ========================================
  // CHILD DETAILS
  // ========================================

  const childName =
    child?.child_name || child?.name || "Friend";

  const stars =
    child?.stars ?? child?.points ?? null;

  // ========================================
  // LOADING SCREEN
  // ========================================

  if (loading) {
    return (
      <div className="child-dashboard-loading">
        <div className="child-loading-icon">🌈</div>
        <h2>Getting your learning world ready...</h2>
      </div>
    );
  }

  // ========================================
  // ERROR SCREEN
  // ========================================

  if (error && !child) {
    return (
      <div className="child-dashboard-error">
        <span>🌻</span>
        <h2>Oops! We couldn't open the dashboard.</h2>
        <p>{error}</p>

        <button
          type="button"
          onClick={() => navigate(-1)}
        >
          Go Back
        </button>
      </div>
    );
  }

  // ========================================
  // MAIN DASHBOARD UI
  // ========================================

  return (
    <main
      className="child-dashboard-page"
      style={{
        "--dashboard-background": `url("${dashboardBg}")`,
      }}
    >
      <div className="dashboard-decoration decoration-left" />
      <div className="dashboard-decoration decoration-right" />

      <div className="child-dashboard-content">

        {/* HEADER */}

        <header className="child-dashboard-header">

          <div className="child-dashboard-logo">
            <img
              src={mindSpringLogo}
              alt="MindSpring Logo"
              className="mindspring-logo-image"
            />
          </div>

          <div className="child-dashboard-header-actions">

            <button
              type="button"
              className="child-profile-button"
              onClick={() => setSelectedCategory("My Profile")}
            >
              <span className="child-profile-avatar">
                🧒
              </span>

              <strong>{childName}</strong>

              <span className="profile-dropdown">
                ⌄
              </span>
            </button>

            <div className="child-stars-display">
              <span>⭐</span>
              <strong>{stars ?? "—"}</strong>
            </div>

            <button
              type="button"
              className="child-settings-button"
              aria-label="Settings"
              onClick={() => setSelectedCategory("Settings")}
            >
              ⚙️
            </button>

          </div>
        </header>

        {/* WELCOME HERO */}

        <section className="child-welcome-section">

          <div className="child-hero-illustration">

            <div className="hero-cloud hero-cloud-one" />
            <div className="hero-cloud hero-cloud-two" />

            <span className="hero-sparkle sparkle-one">
              ✦
            </span>

            <span className="hero-sparkle sparkle-two">
              ✧
            </span>

            <span className="hero-sparkle sparkle-three">
              ⭐
            </span>

          </div>

          <div className="child-welcome-text">

            <h1>
              Hi {childName}!
              <span className="welcome-wave">👋</span>
              <span className="welcome-star">⭐</span>
            </h1>

            <p>Let's watch and learn today!</p>

            <div className="welcome-decoration">
              ✦ ✨
            </div>

          </div>

        </section>

        {/* MY LEARNING VIDEOS BUTTON */}

        <section className="child-learning-section">

          <button
            type="button"
            className="my-learning-videos-button"
            onClick={handleVideosClick}
          >
            <span className="my-learning-icon">
              ▶
            </span>

            <span>My Learning Videos</span>

            <span className="my-learning-arrow">
              ›
            </span>

          </button>

        </section>

        {/* PROFILE / SETTINGS MESSAGE */}

        {selectedCategory && (
          <div
            className="child-selection-panel"
            role="status"
          >
            <div>
              <strong>{selectedCategory}</strong>

              <p>
                {selectedCategory === "My Profile"
                  ? `Welcome, ${childName}!`
                  : "Dashboard settings"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        )}

        {/* FOOTER */}

        <footer className="child-dashboard-footer">
          <span>🌈</span>
          Every little step is a big achievement!
          <span>💜</span>
        </footer>

      </div>
    </main>
  );
}

export default ChildDashboard;
