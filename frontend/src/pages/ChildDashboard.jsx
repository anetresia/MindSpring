
import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";

import { getChild, getChildRewards } from "../api";

import dashboardBg from "../assets/child-dashboard-bg.png";
import mindSpringLogo from "../assets/mindspring-logo.png";
import watchVideosIcon from "../assets/watch-videos-icon.png";
import myRewardsIcon from "../assets/my-rewards-icon.png";
import rewardGirl from "../assets/reward-girl.png";

import "../styles/child-dashboard.css";

function ChildDashboard() {
  const { childId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [child, setChild] = useState(location.state?.child || null);
  const [loading, setLoading] = useState(!location.state?.child);
  const [error, setError] = useState("");

  // TOTAL REWARD STARS
  const [totalStars, setTotalStars] = useState(0);
  const [rewardsLoading, setRewardsLoading] = useState(false);

  // REWARDS POPUP
  const [showRewards, setShowRewards] = useState(false);

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

  // LOAD CHILD TOTAL REWARD STARS
  useEffect(() => {
    let isMounted = true;

    async function loadChildRewards() {
      if (!childId) {
        setTotalStars(0);
        return;
      }

      try {
        setRewardsLoading(true);

        const rewardData = await getChildRewards(childId);

        if (isMounted) {
          setTotalStars(rewardData?.total_stars ?? 0);
        }
      } catch (err) {
        console.error("Unable to load child rewards:", err);

        if (isMounted) {
          setTotalStars(0);
        }
      } finally {
        if (isMounted) {
          setRewardsLoading(false);
        }
      }
    }

    loadChildRewards();

    return () => {
      isMounted = false;
    };
  }, [childId]);

  // CHILD DETAILS
  const childName =
    child?.child_name || child?.name || "Friend";

  const childInitial =
    childName.trim().charAt(0).toUpperCase();

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

  // OPEN REWARDS POPUP
  function handleRewardsClick() {
    setShowRewards(true);
  }

  // CLOSE REWARDS POPUP
  function handleCloseRewards() {
    setShowRewards(false);
  }

  // CLOSE POPUP WITH ESCAPE KEY
  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape") {
        setShowRewards(false);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

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

            {/* CHILD PROFILE */}
            <div className="child-profile-display">
              <span className="child-profile-avatar">
                {childInitial}
              </span>

              <strong>{childName}</strong>
            </div>

            {/* TOTAL REWARD POINTS */}
            <div className="child-stars-display">
              <span>⭐</span>
              <strong>
                {rewardsLoading ? "..." : totalStars}
              </strong>
            </div>

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

          {/* WATCH VIDEOS CARD */}
          <button
            type="button"
            className="child-dashboard-card watch-videos-card"
            onClick={handleVideosClick}
          >
            <span className="dashboard-card-icon">
              <img
                src={watchVideosIcon}
                alt="Watch Videos"
              />
            </span>

            <span className="dashboard-card-title">
              Watch Videos
            </span>
          </button>

          {/* MY REWARDS CARD */}
          <button
            type="button"
            className="child-dashboard-card rewards-card"
            onClick={handleRewardsClick}
          >
            <span className="dashboard-card-icon">
              <img
                src={myRewardsIcon}
                alt="My Rewards"
              />
            </span>

            <span className="dashboard-card-title">
              My Rewards
            </span>
          </button>

        </section>

      </div>

      {/* MY REWARDS POPUP */}
      {showRewards && (
        <div
          className="child-rewards-modal-overlay"
          onClick={handleCloseRewards}
        >
          <div
            className="child-rewards-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="child-rewards-title"
            onClick={(event) => event.stopPropagation()}
          >

            {/* CLOSE BUTTON */}
            <button
              type="button"
              className="child-rewards-close-button"
              onClick={handleCloseRewards}
              aria-label="Close rewards popup"
            >
              ×
            </button>

            {/* GIRL ILLUSTRATION */}
            <div className="child-rewards-girl">
              <img
                src={rewardGirl}
                alt="Happy girl celebrating rewards"
              />
            </div>

            {/* REWARDS DETAILS */}
            <div className="child-rewards-details">

              <p className="child-rewards-welcome">
                Amazing work!
              </p>

              <h2 id="child-rewards-title">
                {childName}'s Rewards
              </h2>

              <p className="child-rewards-message">
                Keep learning and collecting stars!
              </p>

              <div className="child-rewards-total">
                <span className="child-rewards-star">⭐</span>

                <strong>
                  {rewardsLoading ? "..." : totalStars}
                </strong>

                <span className="child-rewards-total-label">
                  Total Stars Earned
                </span>
              </div>

              <p className="child-rewards-encouragement">
                You're doing great! Keep it up!
              </p>

              <button
                type="button"
                className="child-rewards-done-button"
                onClick={handleCloseRewards}
              >
                Continue Learning
              </button>

            </div>

          </div>
        </div>
      )}

    </main>
  );
}

export default ChildDashboard;
