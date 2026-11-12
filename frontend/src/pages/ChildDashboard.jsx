
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

  // LOAD CHILD PROFILE

  useEffect(() => {
    let isMounted = true;

    async function loadChild() {
      if (!childId) {
        setLoading(false);
        setError("Child profile could not be found.");
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await getChild(childId);

        if (isMounted) {
          setChild(response.child || response.data || response);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Unable to load child profile.");
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

  // CHILD DETAILS

  const childName =
    child?.child_name || child?.name || "Friend";

  const stars =
    child?.stars ?? child?.points ?? null;

  // PARENT DASHBOARD NAVIGATION

  function handleParentDashboard() {
    let parent = location.state?.parent || null;

    const storedParent =
      sessionStorage.getItem("user") ||
      localStorage.getItem("user");

    try {
      if (storedParent) {
        parent = JSON.parse(storedParent);
      }
    } catch (err) {
      console.error("Unable to read parent details:", err);
    }

    navigate("/parent-home", {
      state: {
        parent,
      },
    });
  }

  // LEARNING VIDEOS

  function handleVideosClick() {
    navigate(`/child-learning/${childId}`, {
      state: { child },
    });
  }

  // REWARDS

  function handleRewardsClick() {
    navigate(`/child-rewards/${childId}`, {
      state: { child },
    });
  }

  // LOADING

  if (loading) {
    return (
      <div className="child-dashboard-loading">
        <h2>Getting your learning world ready...</h2>
      </div>
    );
  }

  // ERROR

  if (error && !child) {
    return (
      <div className="child-dashboard-error">
        <h2>Oops! We couldn't open the dashboard.</h2>
        <p>{error}</p>

        <button
          type="button"
          onClick={handleParentDashboard}
        >
          Go Back
        </button>
      </div>
    );
  }

  // MAIN DASHBOARD

  return (
    <main
      className="child-dashboard-page"
      style={{
        "--dashboard-background": `url("${dashboardBg}")`,
      }}
    >
      <div className="child-dashboard-content">

        {/* HEADER */}

        <header className="child-dashboard-header">

          <div className="child-dashboard-brand">

            <img
              src={mindSpringLogo}
              alt="MindSpring Logo"
              className="mindspring-logo-image"
            />

            <button
              type="button"
              className="parent-dashboard-back-button"
              onClick={handleParentDashboard}
            >
              <span>←</span>
              Parent Dashboard
            </button>

          </div>

          <div className="child-dashboard-header-actions">

            <div className="child-profile-display">
              <span className="child-profile-avatar">🧒</span>
              <strong>{childName}</strong>
            </div>

            <div className="child-stars-display">
              <span>⭐</span>
              <strong>{stars ?? "—"}</strong>
            </div>

            <button
              type="button"
              className="child-settings-button"
              aria-label="Settings"
              onClick={() =>
                navigate(`/child-settings/${childId}`, {
                  state: { child },
                })
              }
            >
              ⚙️
            </button>

          </div>
        </header>

        {/* WELCOME SECTION */}

        <section className="child-welcome-section">

          <div className="child-welcome-text">
            <h1>
              Hi {childName}!
              <span className="welcome-wave">👋</span>
            </h1>

            <p>Let's learn something new today!</p>
          </div>

        </section>

        {/* DASHBOARD CARDS */}

        <section className="child-dashboard-cards">

          <button
            type="button"
            className="child-dashboard-card watch-videos-card"
            onClick={handleVideosClick}
          >
            <span className="dashboard-card-icon">
              ▶
            </span>

            <span className="dashboard-card-title">
              Watch Videos
            </span>
          </button>

          <button
            type="button"
            className="child-dashboard-card rewards-card"
            onClick={handleRewardsClick}
          >
            <span className="dashboard-card-icon">
              🏆
            </span>

            <span className="dashboard-card-title">
              My Rewards
            </span>
          </button>

        </section>

      </div>
    </main>
  );
}

export default ChildDashboard;
