
import { useEffect, useState } from "react";
import { getChildRewards } from "../../api";

import "../../styles/parent-dashboard/rewards.css";

// ========================================
// TROPHY VECTOR ICON
// ========================================

function TrophyIcon({ size = 110 }) {
  return (
    <svg
      className="rewards-trophy-icon"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Trophy"
      role="img"
    >
      <path
        d="M27 19H73V48C73 62 63 72 50 72C37 72 27 62 27 48V19Z"
        fill="#FFC928"
        stroke="#E6A500"
        strokeWidth="3"
      />

      <path
        d="M27 27H15V39C15 51 23 57 34 57"
        stroke="#E6A500"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      />

      <path
        d="M73 27H85V39C85 51 77 57 66 57"
        stroke="#E6A500"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      />

      <path
        d="M50 33L55 43H66L57 50L60 61L50 54L40 61L43 50L34 43H45L50 33Z"
        fill="#FFF9E8"
      />

      <path
        d="M44 72H56V84H44V72Z"
        fill="#E6A500"
      />

      <path
        d="M34 84H66V91H34V84Z"
        fill="#7542C8"
      />

      <path
        d="M50 8V14M31 12L35 18M69 12L65 18"
        stroke="#F5B51B"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ========================================
// STAR VECTOR ICON
// ========================================

function StarIcon({ size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="#FFC928"
      stroke="#A87900"
      strokeWidth="1.5"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2.5L14.9 8.4L21.5 9.3L16.75 13.9L17.9 20.5L12 17.4L6.1 20.5L7.25 13.9L2.5 9.3L9.1 8.4L12 2.5Z" />
    </svg>
  );
}

// ========================================
// REWARDS COMPONENT
// ========================================

function Rewards({ children = [] }) {
  const [selectedChild, setSelectedChild] = useState("");
  const [rewardData, setRewardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Select first child automatically
  useEffect(() => {
    if (children.length > 0 && !selectedChild) {
      setSelectedChild(
        String(children[0].child_id || children[0].id)
      );
    }
  }, [children, selectedChild]);

  // Load selected child's rewards
  useEffect(() => {
    if (!selectedChild) {
      setRewardData(null);
      return;
    }

    let cancelled = false;

    async function loadRewards() {
      try {
        setLoading(true);
        setError("");
        setRewardData(null);

        const data = await getChildRewards(selectedChild);

        if (!cancelled) {
          setRewardData(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load rewards.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadRewards();

    return () => {
      cancelled = true;
    };
  }, [selectedChild]);

  return (
    <div className="rewards-page">

      {/* HEADER */}
      <section className="rewards-header">
        <h1>Rewards</h1>
        <p>
          Celebrate your child's learning achievements.
        </p>
      </section>

      {children.length === 0 ? (
        <div className="dashboard-panel">
          <p className="children-empty-message">
            No children added yet.
          </p>
        </div>
      ) : (
        <>
          {/* CHILD SELECTOR */}
          <section className="dashboard-panel rewards-child-selector">
            <label htmlFor="rewards-child-select">
              Select Child
            </label>

            <select
              id="rewards-child-select"
              value={selectedChild}
              onChange={(event) =>
                setSelectedChild(event.target.value)
              }
            >
              {children.map((child) => {
                const childId =
                  child.child_id || child.id;

                return (
                  <option
                    key={childId}
                    value={String(childId)}
                  >
                    {child.child_name ||
                      child.name ||
                      "Child"}
                  </option>
                );
              })}
            </select>
          </section>

          {/* LOADING */}
          {loading && (
            <p className="children-empty-message">
              Loading rewards...
            </p>
          )}

          {/* ERROR */}
          {error && (
            <p
              className="children-error-message"
              role="alert"
            >
              {error}
            </p>
          )}

          {/* REWARDS CONTENT */}
          {!loading && !error && rewardData && (
            <div className="rewards-content">

              {/* TOTAL STARS */}
              <section className="dashboard-panel rewards-summary">
                <h2>
                  {rewardData.child_name}'s Rewards
                </h2>

                <div className="rewards-total-stars">
                  <TrophyIcon size={110} />

                  <strong>
                    {rewardData.total_stars || 0}
                  </strong>

                  <p>Total Stars Earned</p>
                </div>
              </section>

              {/* TOPICS AND LESSONS */}
              {rewardData.topics?.length > 0 ? (
                rewardData.topics.map((topic) => (
                  <section
                    className="dashboard-panel rewards-topic-card"
                    key={topic.topic_id}
                  >
                    <h2>{topic.topic_name}</h2>

                    <div className="rewards-lesson-list">
                      {topic.lessons?.map((lesson) => (
                        <div
                          className="rewards-lesson-card"
                          key={lesson.lesson_id}
                        >
                          <div className="rewards-lesson-details">
                            <h3>
                              {lesson.lesson_title}
                            </h3>

                            <p>
                              {lesson.completed
                                ? "Completed"
                                : "Not completed yet"}
                            </p>
                          </div>

                          <div className="rewards-lesson-stars">
                            <StarIcon size={22} />

                            <strong>
                              {lesson.stars_earned || 0}
                            </strong>

                            <small>
                              / {lesson.total_questions || 0}
                            </small>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))
              ) : (
                <div className="dashboard-panel">
                  <p className="children-empty-message">
                    No topic rewards available yet.
                  </p>
                </div>
              )}

            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Rewards;
