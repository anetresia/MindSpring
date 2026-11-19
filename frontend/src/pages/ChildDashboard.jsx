
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";

import { getChild, getChildRewards, getLearningSessionStatus } from "../api";

import dashboardBg from "../assets/child-dashboard-bg.png";
import mindSpringLogo from "../assets/mindspring-logo.png";
import watchVideosIcon from "../assets/watch-videos-icon.png";
import myRewardsIcon from "../assets/my-rewards-icon.png";
import rewardGirl from "../assets/reward-girl.png";

import "../styles/child-dashboard.css";

function hasCompletedDailyLearning(status, child) {
  const data = status?.data ?? status;
  if (data?.limit_reached === true) return true;
  if (Number.isFinite(data?.remaining_seconds)) return data.remaining_seconds <= 0;

  if (data?.limit_reached === false) return false;

  const limitMinutes = Number(child?.daily_learning_limit);
  if (limitMinutes > 0 && Number.isFinite(data?.total_seconds)) {
    return data.total_seconds >= limitMinutes * 60;
  }

  throw new Error("Learning session status is unavailable.");
}

function ChildDashboard() {
  const { childId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [child, setChild] = useState(location.state?.child || null);
  const [loading, setLoading] = useState(!location.state?.child);
  const [error, setError] = useState("");
  const [showDailyCompletion, setShowDailyCompletion] = useState(
    location.state?.dailyLearningCompleted === true
  );
  const [checkingLearning, setCheckingLearning] = useState(false);
  const [learningStatusError, setLearningStatusError] = useState("");
  const dailyCompletionRef = useRef(null);
  const learningStatusRequest = useRef(0);

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
        setCheckingLearning(false);
        setLearningStatusError("");

        const response = await getChild(childId);
        const childData = response.child || response.data || response;
        if (!isMounted) return;

        setChild(childData);

        try {
          const status = await getLearningSessionStatus(childId);
          if (isMounted) {
            setShowDailyCompletion(hasCompletedDailyLearning(status, childData));
          }
        } catch (err) {
          console.error("Unable to check learning time:", err);
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
      learningStatusRequest.current += 1;
    };
  }, [childId]);

  useEffect(() => {
    if (location.state?.dailyLearningCompleted) {
      navigate(location.pathname, {
        replace: true,
        state: { ...location.state, dailyLearningCompleted: false },
      });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    const dialog = dailyCompletionRef.current;
    if (showDailyCompletion && !loading && dialog && !dialog.open) {
      dialog.showModal();
    }
  }, [showDailyCompletion, loading]);

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
  async function handleVideosClick() {
    if (checkingLearning) return;

    const request = ++learningStatusRequest.current;
    setCheckingLearning(true);
    setLearningStatusError("");

    try {
      const status = await getLearningSessionStatus(childId);
      if (request !== learningStatusRequest.current) return;

      if (hasCompletedDailyLearning(status, child)) {
        setShowDailyCompletion(true);
        return;
      }

      navigate(`/child-learning/${childId}`, {
        state: { child },
      });
    } catch {
      if (request === learningStatusRequest.current) {
        setLearningStatusError("We couldn't check your learning time. Please try again.");
      }
    } finally {
      if (request === learningStatusRequest.current) {
        setCheckingLearning(false);
      }
    }
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
            disabled={checkingLearning}
          >
            <span className="dashboard-card-icon">
              <img
                src={watchVideosIcon}
                alt="Watch Videos"
              />
            </span>

            <span className="dashboard-card-title">
              {checkingLearning ? "Checking learning time?" : "Watch Videos"}
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

        {learningStatusError && (
          <p className="child-learning-status-error" role="alert">{learningStatusError}</p>
        )}
      </div>

      {showDailyCompletion && (
        <dialog
          ref={dailyCompletionRef}
          className="child-daily-completion-dialog"
          aria-labelledby="child-daily-completion-title"
          aria-describedby="child-daily-completion-message"
          onClose={() => setShowDailyCompletion(false)}
        >
          <img src={rewardGirl} alt="" />
          <div>
            <img className="child-daily-completion-logo" src={mindSpringLogo} alt="MindSpring" />
            <h2 id="child-daily-completion-title">Daily Learning Time Completed!</h2>
            <p id="child-daily-completion-message">
              Great job! You have completed your learning time for today. Come back tomorrow for more fun learning!
            </p>
            <button
              type="button"
              className="child-rewards-done-button"
              onClick={handleParentDashboard}
            >
              See You Tomorrow!
            </button>
          </div>
        </dialog>
      )}

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
