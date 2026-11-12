
import "../../styles/parent-dashboard/dashboard-overview.css";

function DashboardOverview({
  parentName,
  children = [],
  rewardTotals = [],
  recentActivities = [],
  activitiesLoading = false,
  activitiesError = "",
  loading,
  error,
  onAddChild,
  onViewReports,
}) {
  // ==========================================
  // CALCULATE CHILD AGE
  // ==========================================

  function calculateAge(dateOfBirth) {
    if (!dateOfBirth) return "";

    const today = new Date();
    const birthDate = new Date(`${dateOfBirth}T00:00:00`);

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();

    if (
      monthDifference < 0 ||
      (monthDifference === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age >= 0 ? age : "";
  }

  // ==========================================
  // GET CHILD IMAGE
  // ==========================================

  function getChildImage(child) {
    return (
      child.profile_image ||
      child.profile_image_url ||
      child.image_url ||
      child.avatar_url ||
      ""
    );
  }

  // ==========================================
  // GET CHILD NAME
  // ==========================================

  function getChildName(child) {
    return child.child_name || child.name || "Child";
  }

  // ==========================================
  // GET CHILD REWARD STARS
  // ==========================================

  function getChildStars(child) {
    const childId = child.child_id || child.id;

    const reward = rewardTotals.find(
      (item) => Number(item.child_id) === Number(childId)
    );

    return Number(reward?.total_stars || 0);
  }

  // ==========================================
  // FORMAT ACTIVITY DATE
  // ==========================================

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

  // ==========================================
  // GET ACTIVITY CHILD NAME
  // ==========================================

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

  // ==========================================
  // GET RECENT ACTIVITIES
  // ==========================================

  const activities = Array.isArray(recentActivities)
    ? recentActivities
    : Array.isArray(recentActivities?.activities)
      ? recentActivities.activities
      : Array.isArray(recentActivities?.data)
        ? recentActivities.data
        : [];

  // ==========================================
  // COUNT UNIQUE COMPLETED LESSONS
  // ==========================================

  const uniqueCompletedLessons = new Set(
    activities
      .filter((activity) => activity.lesson_id != null)
      .map(
        (activity) =>
          `${activity.child_id}-${activity.lesson_id}`
      )
  );

  // ==========================================
  // COUNT ACTIVITY ATTEMPTS
  // ==========================================

  const activeActivityCount = activities.length;

  // ==========================================
  // RENDER DASHBOARD
  // ==========================================

  return (
    <div className="dashboard-content">

      {/* WELCOME SECTION */}

      <section className="dashboard-welcome">
        <h1>
          Welcome Back, {parentName}! <span>👋</span>
        </h1>

        <p>
          Here's an overview of your child's learning journey.
        </p>
      </section>


      {/* DASHBOARD STATISTICS */}

      <section className="dashboard-stats">

        <div className="stat-card stat-green">
          <p>
            Lessons
            <br />
            Completed
          </p>

          <h2>
            {activitiesLoading ? "..." : uniqueCompletedLessons.size}
          </h2>
        </div>


        <div className="stat-card stat-peach">
          <p>
            Children's
            <br />
            Rewards
          </p>

          <h2>{children.length}</h2>
        </div>


        <div className="stat-card stat-purple">
          <p>
            Activity
            <br />
            Attempts
          </p>

          <h2>
            {activitiesLoading ? "..." : activeActivityCount}
          </h2>
        </div>


        <div className="stat-card stat-yellow">
          <p>👑 Subscription</p>

          <h2>Not Available</h2>
        </div>

      </section>


      {/* BOTTOM DASHBOARD GRID */}

      <section className="dashboard-bottom-grid">

        {/* ======================================
            MY CHILDREN
        ====================================== */}

        <div className="dashboard-panel">

          <div className="panel-heading">
            <h2>My Children</h2>

            <button
              type="button"
              className="add-child-btn"
              onClick={onAddChild}
            >
              + Add Child
            </button>
          </div>


          {loading ? (

            <p className="children-empty-message">
              Loading child details...
            </p>

          ) : error ? (

            <p className="children-error-message" role="alert">
              {error}
            </p>

          ) : children.length === 0 ? (

            <div className="children-empty-state">

              <div className="children-empty-icon"> </div>

              <h3>No Children Added Yet</h3>

              <p>
                Add your child's profile to begin their learning journey.
              </p>

              <button
                type="button"
                className="add-child-btn"
                onClick={onAddChild}
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
                            event.currentTarget.style.display = "none";

                            if (event.currentTarget.nextElementSibling) {
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


                    <h3>{childName}</h3>


                    <p className="child-age">
                      {calculateAge(child.date_of_birth) !== ""
                        ? `${calculateAge(child.date_of_birth)} years old`
                        : ""}
                    </p>


                    <div className="child-info">

                      <p>
                        💬 {child.communication_method || "Not selected"}
                      </p>

                      <p>
                        📚 {child.preferred_learning_mode || "Video Learning"}
                      </p>

                      <p className="child-reward-stars">
                        ⭐ {childStars} Stars Earned
                      </p>

                    </div>

                  </div>

                );

              })}

            </div>

          )}

        </div>


        {/* ======================================
            RECENT ACTIVITY
        ====================================== */}

        <div className="dashboard-panel activity-panel">

          <div className="panel-heading">

            <h2>Recent Activity</h2>

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

              <p className="children-error-message" role="alert">
                {activitiesError}
              </p>

            ) : activities.length === 0 ? (

              <p className="children-empty-message">
                No learning activities available yet.
              </p>

            ) : (

              activities.map((activity, index) => {

                const correctAnswers = Number(
                  activity.correct_answers ?? activity.score ?? 0
                );

                const totalQuestions = Number(
                  activity.total_questions ?? 0
                );

                const activityDate = formatActivityDate(
                  activity.completed_at || activity.response_time
                );

                return (

                  <div
                    className="activity-item"
                    key={
                      activity.attempt_id ||
                      `${activity.child_id}-${activity.lesson_id}-${index}`
                    }
                  >

                    {/* ACTIVITY ICON */}

                    <div className="activity-icon">
                      ⭐
                    </div>


                    {/* ACTIVITY DETAILS */}

                    <div className="activity-details">

                      <h3>
                        {getActivityChildName(activity)}
                      </h3>

                      <p>
                        {activity.lesson_title || "Learning Activity"}
                      </p>

                      <span className="activity-date">
                        {activityDate}
                      </span>

                    </div>


                    {/* ACTIVITY RESULT */}

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

    </div>
  );
}

export default DashboardOverview;
