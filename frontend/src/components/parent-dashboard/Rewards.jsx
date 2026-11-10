
import { useEffect, useState } from "react";
import { getChildRewards } from "../../api";

import "../../styles/parent-dashboard/rewards.css";

function Rewards({ children = [] }) {
  const [selectedChild, setSelectedChild] = useState("");
  const [rewardData, setRewardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (children.length > 0 && !selectedChild) {
      setSelectedChild(
        String(children[0].child_id || children[0].id)
      );
    }
  }, [children, selectedChild]);

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
      <section className="rewards-header">
        <h1>Rewards ⭐</h1>
        <p>Celebrate your child's learning achievements.</p>
      </section>

      {children.length === 0 ? (
        <div className="dashboard-panel">
          <p className="children-empty-message">
            No children added yet.
          </p>
        </div>
      ) : (
        <>
          <section className="dashboard-panel rewards-child-selector">
            <label htmlFor="rewards-child-select">
              Select Child
            </label>

            <select
              id="rewards-child-select"
              value={selectedChild}
              onChange={(event) => setSelectedChild(event.target.value)}
            >
              {children.map((child) => {
                const childId = child.child_id || child.id;

                return (
                  <option key={childId} value={String(childId)}>
                    {child.child_name || child.name || "Child"}
                  </option>
                );
              })}
            </select>
          </section>

          {loading && (
            <p className="children-empty-message">
              Loading rewards...
            </p>
          )}

          {error && (
            <p className="children-error-message" role="alert">
              {error}
            </p>
          )}

          {!loading && !error && rewardData && (
            <div className="rewards-content">
              <section className="dashboard-panel rewards-summary">
                <h2>{rewardData.child_name}'s Rewards</h2>

                <div className="rewards-total-stars">
                  <span>⭐</span>
                  <strong>
                    {rewardData.total_stars || 0}
                  </strong>
                  <p>Total Stars Earned</p>
                </div>
              </section>

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
                            <h3>{lesson.lesson_title}</h3>

                            <p>
                              {lesson.completed
                                ? "Completed"
                                : "Not completed yet"}
                            </p>
                          </div>

                          <div className="rewards-lesson-stars">
                            <span>⭐</span>
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
