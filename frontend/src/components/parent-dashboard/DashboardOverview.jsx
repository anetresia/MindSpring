
import { useState } from "react";
import "../../styles/parent-dashboard/dashboard-overview.css";

import lessonsIcon from "../../assets/lessons-icon.png";
import brushingTeethIcon from "../../assets/brushing-teeth.svg";
import combingHairIcon from "../../assets/combing-hair.svg";
import rewardsIcon from "../../assets/rewards-icon.png";
import activityIcon from "../../assets/activity-icon.png";
import subscriptionIcon from "../../assets/subscription-icon.png";

function DashboardOverview({
  parentName,
  children = [],
  rewardTotals = [],
  rewardsLoading = false,
  rewardsError = "",
  recentActivities = [],
  activitiesLoading = false,
  activitiesError = "",
  dashboardStats = null,
  dashboardStatsLoading = false,
  subscriptionData = null,
  subscriptionLoading = false,
  loading,
  error,
  onAddChild,
  onViewReports,
}) {
  const [showChildLimitPopup, setShowChildLimitPopup] = useState(false);

  // ADD CHILD VALIDATION
  function handleAddChildClick() {
    if (children.length >= 2) {
      setShowChildLimitPopup(true);
      return;
    }

    onAddChild?.();
  }

  // CALCULATE CHILD AGE
  function calculateAge(dateOfBirth) {
    if (!dateOfBirth) return "";

    const today = new Date();
    const birthDate = new Date(`${dateOfBirth}T00:00:00`);

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();

    if (
      monthDifference < 0 ||
      (monthDifference === 0 &&
        today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age >= 0 ? age : "";
  }

  // GET CHILD IMAGE
  function getChildImage(child) {
    return (
      child.profile_image ||
      child.profile_image_url ||
      child.image_url ||
      child.avatar_url ||
      ""
    );
  }

  // GET CHILD NAME
  function getChildName(child) {
    return child.child_name || child.name || "Child";
  }

  // GET CHILD REWARD STARS
  function getChildStars(child) {
    const childId = child.child_id || child.id;

    const reward = rewardTotals.find(
      (item) =>
        Number(item.child_id) === Number(childId)
    );

    return Number(reward?.total_stars || 0);
  }

  // TOTAL STARS
  const parentChildIds = new Set(
    children.map((child) =>
      Number(child.child_id || child.id)
    )
  );

  const totalStars = rewardTotals
    .filter((reward) =>
      parentChildIds.has(Number(reward.child_id))
    )
    .reduce(
      (total, reward) =>
        total + Number(reward.total_stars || 0),
      0
    );

  // DASHBOARD STATISTICS
  const totalCompletedLessons = Number(
    dashboardStats?.completed_lessons || 0
  );

  const totalActivityAttempts = Number(
    dashboardStats?.total_activity_attempts || 0
  );

  // SUBSCRIPTION DETAILS
  const subscription =
    subscriptionData?.subscription ||
    subscriptionData ||
    null;

  const subscriptionPlan =
    subscription?.plan?.plan_name ||
    subscription?.plan_name ||
    subscription?.plan?.name ||
    "No Active Plan";

  const subscriptionStatus =
    subscription?.status || "Not Available";

  const remainingCredits =
    subscription?.credits?.remaining_credits ??
    subscription?.remaining_credits ??
    0;

  const totalCredits =
    subscription?.credits?.total_credits ??
    subscription?.total_credits ??
    0;

  // FORMAT ACTIVITY DATE
  function formatActivityDate(dateValue) {
    if (!dateValue) return "";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // GET ACTIVITY CHILD NAME
  function getActivityChildName(activity) {
    return (
      activity.child_name ||
      children.find(
        (child) =>
          Number(child.child_id || child.id) ===
          Number(activity.child_id)
      )?.child_name ||
      "Child"
    );
  }

  // NORMALIZE RECENT ACTIVITIES
  const activities = Array.isArray(recentActivities)
    ? recentActivities
    : Array.isArray(recentActivities?.activities)
    ? recentActivities.activities
    : Array.isArray(recentActivities?.data)
    ? recentActivities.data
    : [];

  function getActivityIcon(activity) {
    const title = activity.lesson_title?.toLowerCase() ?? "";

    if (/\b(?:hair|comb(?:ing)?)\b/.test(title)) return combingHairIcon;
    if (/\b(?:tooth|teeth|toothbrush|dental)\b/.test(title)) return brushingTeethIcon;

    return lessonsIcon;
  }

  return (
    <div className="dashboard-content">

      {/* WELCOME SECTION */}

      <section className="dashboard-welcome">

        <div className="welcome-text">


          <h1>
            Welcome Back, {parentName}! <span>👋</span>
          </h1>

          <p>
            Here's an overview of your child's learning journey.
          </p>

        </div>


      </section>

      {/* DASHBOARD STATISTICS */}

      <section className="dashboard-stats">

        {/* COMPLETED LESSONS */}

        <div className="stat-card stat-green">

          <div className="stat-icon">
            <img
              src={lessonsIcon}
              alt="Lessons"
            />
          </div>

          <div className="stat-info">

            <p>Lessons Completed</p>

            <h2>
              {dashboardStatsLoading
                ? "..."
                : totalCompletedLessons}
            </h2>

          </div>

          <span className="stat-decoration">
            ✦
          </span>

        </div>

        {/* CHILDREN REWARDS */}

        <div className="stat-card stat-peach">

          <div className="stat-icon">
            <img
              src={rewardsIcon}
              alt="Rewards"
            />
          </div>

          <div className="stat-info">

            <p>Children's Rewards</p>

            <h2>
              {rewardsLoading ? "..." : totalStars}
            </h2>

          </div>

          <span className="stat-decoration">
            ✦
          </span>

        </div>

        {/* ACTIVITY ATTEMPTS */}

        <div className="stat-card stat-purple">

          <div className="stat-icon">
            <img
              src={activityIcon}
              alt="Activity attempts"
            />
          </div>

          <div className="stat-info">

            <p>Activity Attempts</p>

            <h2>
              {dashboardStatsLoading
                ? "..."
                : totalActivityAttempts}
            </h2>

          </div>

          <span className="stat-decoration">
            ✦
          </span>

        </div>

        {/* SUBSCRIPTION */}

        <div className="stat-card stat-yellow">

          <div className="stat-icon">
            <img
              src={subscriptionIcon}
              alt="Subscription"
            />
          </div>

          <div className="stat-info subscription-info">

            <p>Subscription</p>

            {subscriptionLoading ? (
              <h2>Loading...</h2>
            ) : (
              <>
                <h2>{subscriptionPlan}</h2>

                <span className="subscription-status">
                  {subscriptionStatus}
                </span>

                <p className="subscription-credits">
                  Credits: {remainingCredits} / {totalCredits}
                </p>
              </>
            )}

          </div>

        </div>

      </section>

      {/* BOTTOM DASHBOARD GRID */}

      <section className="dashboard-bottom-grid">

        {/* MY CHILDREN */}

        <div className="dashboard-panel children-panel">

          <div className="panel-heading">

            <h2>
              <span className="panel-heading-icon">
                👨‍👩‍👧
              </span>

              My Children
            </h2>

            <button
              type="button"
              className="add-child-btn"
              onClick={handleAddChildClick}
            >
              <span>+</span> Add Child
            </button>

          </div>

          {loading ? (

            <p className="children-empty-message">
              Loading child details...
            </p>

          ) : error ? (

            <p
              className="children-error-message"
              role="alert"
            >
              {error}
            </p>

          ) : children.length === 0 ? (

            <div className="children-empty-state">

              <div className="children-empty-icon">
                👶
              </div>

              <h3>No Children Added Yet</h3>

              <p>
                Add your child's profile to begin their learning journey.
              </p>

              <button
                type="button"
                className="add-child-btn"
                onClick={handleAddChildClick}
              >
                + Add Child
              </button>

            </div>

          ) : (

            <div className="dashboard-children-list">

              {children.map((child) => {

                const childName = getChildName(child);
                const childImage = getChildImage(child);
                const childStars = getChildStars(child);
                const childAge = calculateAge(
                  child.date_of_birth
                );

                return (

                  <div
                    className="child-card"
                    key={child.child_id || child.id}
                  >

                    <div className="child-avatar">

                      {childImage ? (

                        <img
                          src={childImage}
                          alt={`${childName}'s profile`}
                          onError={(event) => {
                            event.currentTarget.style.display =
                              "none";

                            if (
                              event.currentTarget.nextElementSibling
                            ) {
                              event.currentTarget.nextElementSibling.style.display =
                                "flex";
                            }
                          }}
                        />

                      ) : null}

                      <span
                        className="child-avatar-initial"
                        style={{
                          display: childImage ? "none" : "flex",
                        }}
                      >
                        {childName.charAt(0).toUpperCase()}
                      </span>

                    </div>

                    <div className="child-main-info">

                      <h3>{childName}</h3>

                      <p className="child-age">
                        {childAge !== ""
                          ? `${childAge} years old`
                          : "Age not available"}
                      </p>

                      <div className="child-info">

                        <span>
                          🖼️ Image
                        </span>

                        <span>
                          ▶️ Video
                        </span>

                        <span className="child-reward-stars">
                          ⭐ {childStars} Stars Earned
                        </span>

                      </div>

                    </div>

                  </div>

                );

              })}

            </div>

          )}

        </div>

        {/* RECENT ACTIVITY */}

        <div className="dashboard-panel activity-panel">

          <div className="panel-heading">

            <h2>
              <span className="panel-heading-icon">
                🕒
              </span>

              Recent Activity
            </h2>

            <button
              type="button"
              className="view-all-btn"
              onClick={onViewReports}
            >
              View All
            </button>

          </div>

          <div className="activity-list">

            {activitiesLoading ? (

              <p className="children-empty-message">
                Loading recent activities...
              </p>

            ) : activitiesError ? (

              <p
                className="children-error-message"
                role="alert"
              >
                {activitiesError}
              </p>

            ) : activities.length === 0 ? (

              <p className="children-empty-message">
                No learning activities available yet.
              </p>

            ) : (

              activities.map((activity, index) => {

                const correctAnswers = Number(
                  activity.correct_answers ??
                  activity.score ??
                  0
                );

                const totalQuestions = Number(
                  activity.total_questions ?? 0
                );

                const activityDate = formatActivityDate(
                  activity.completed_at ||
                  activity.response_time
                );

                return (

                  <div
                    className="activity-item"
                    key={
                      activity.attempt_id ||
                      `${activity.child_id}-${activity.lesson_id}-${index}`
                    }
                  >

                    <div className="activity-icon">
                      <img src={getActivityIcon(activity)} alt="" />
                    </div>

                    <div className="activity-details">

                      <h3>
                        {getActivityChildName(activity)}
                      </h3>

                      <p>
                        {activity.lesson_title ||
                          "Learning Activity"}
                      </p>

                      <span className="activity-date">
                        {activityDate}
                      </span>

                    </div>

                    <div className="activity-result">

                      <span className="activity-status activity-success">
                        {activity.status || "Completed"}
                      </span>

                      <span className="activity-score">
                        {correctAnswers} / {totalQuestions} Correct
                      </span>

                    </div>

                  </div>

                );

              })

            )}

          </div>

        </div>

      </section>

      {/* FOOTER */}

      <footer className="dashboard-footer">
        Made with 💗 for little learners | MindSpring
      </footer>

      {/* CHILD LIMIT POPUP */}

      {showChildLimitPopup && (

        <div
          className="child-limit-overlay"
          onClick={() => setShowChildLimitPopup(false)}
        >

          <div
            className="child-limit-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="child-limit-title"
            aria-describedby="child-limit-description"
            onClick={(event) => event.stopPropagation()}
          >

            <div className="child-limit-icon">
              <span>🌸</span>
            </div>

            <h2 id="child-limit-title">
              Child Limit Reached!
            </h2>

            <p id="child-limit-description">
              You cannot add more than 2 child profiles.
            </p>

            <button
              type="button"
              className="child-limit-ok-btn"
              onClick={() => setShowChildLimitPopup(false)}
              autoFocus
            >
              Okay
            </button>

          </div>

        </div>

      )}

    </div>
  );
}

export default DashboardOverview;
