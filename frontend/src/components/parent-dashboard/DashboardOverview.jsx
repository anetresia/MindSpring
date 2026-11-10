
import "../../styles/parent-dashboard/dashboard-overview.css";

function DashboardOverview({
  parentName,
  children = [],
  rewardTotals = [],
  loading,
  error,
  onAddChild,
  onViewReports,
}) {
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

  function getChildImage(child) {
    return (
      child.profile_image ||
      child.profile_image_url ||
      child.image_url ||
      child.avatar_url ||
      ""
    );
  }

  function getChildName(child) {
    return child.child_name || child.name || "Child";
  }

  function getChildStars(child) {
    const childId = child.child_id || child.id;

    const reward = rewardTotals.find(
      (item) => Number(item.child_id) === Number(childId)
    );

    return Number(reward?.total_stars || 0);
  }

  return (
    <div className="dashboard-content">
      <section className="dashboard-welcome">
        <h1>
          Welcome Back, {parentName}! <span>👋</span>
        </h1>
        <p>Here's an overview of your child's learning journey.</p>
      </section>

      <section className="dashboard-stats">
        <div className="stat-card stat-green">
          <p>Lessons<br />Completed</p>
          <h2>—</h2>
        </div>

        <div className="stat-card stat-peach">
          <p>Children's<br />Rewards</p>
          <h2>{children.length}</h2>
        </div>

        <div className="stat-card stat-purple">
          <p>Active<br />Activities</p>
          <h2>—</h2>
        </div>

        <div className="stat-card stat-yellow">
          <p>👑 Subscription</p>
          <h2>Not Available</h2>
        </div>
      </section>

      <section className="dashboard-bottom-grid">
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
                            event.currentTarget.nextElementSibling.style.display = "flex";
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
            <p className="children-empty-message">
              No learning activities available yet.
            </p>
          </div>
        </div>
      </section>

      <footer className="dashboard-footer">
        Made with 💗 for little learners | MindSpring
      </footer>
    </div>
  );
}

export default DashboardOverview;
