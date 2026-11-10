
import { useEffect, useState } from "react";
import { getLifeSkillTopics } from "../../api";

import "../../styles/parent-dashboard/topic-selection.css";

function TopicSelection({
  childId,
  selectedTopics = [],
  onChange,
  categoryId = null,
}) {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadTopics() {
      try {
        setLoading(true);
        setError("");

        const response = await getLifeSkillTopics(categoryId);

        if (isMounted) {
          setTopics(Array.isArray(response) ? response : []);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err.message || "Unable to load Life Skill Topics."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadTopics();

    return () => {
      isMounted = false;
    };
  }, [categoryId]);

  const activeTopics = topics.filter(
    (topic) => topic.is_active === true
  );

  const selectedIds = selectedTopics.map((item) =>
    Number(typeof item === "object" ? item.topic_id : item)
  );

  function handleTopicChange(topicId) {
    const id = Number(topicId);

    if (selectedIds.includes(id)) {
      onChange?.(selectedIds.filter((item) => item !== id));
    } else {
      onChange?.([...selectedIds, id]);
    }
  }

  return (
    <section className="topic-selection">
      <div className="topic-selection-heading">
        <h3>Choose Life Skill Topics</h3>
        <p>
          Select the topics you want your child to learn.
          You can choose more than one topic.
        </p>
      </div>

      {loading && (
        <p className="topic-selection-message">
          Loading Life Skill Topics...
        </p>
      )}

      {!loading && error && (
        <div className="topic-selection-error" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && activeTopics.length === 0 && (
        <p className="topic-selection-message">
          No active Life Skill Topics are available.
        </p>
      )}

      {!loading && !error && activeTopics.length > 0 && (
        <>
          <p className="topic-selection-count">
            {selectedIds.length} topic(s) selected
          </p>

          <div className="topic-selection-list">
            {activeTopics.map((topic) => {
              const topicId = Number(topic.topic_id);
              const isSelected = selectedIds.includes(topicId);

              return (
                <label
                  key={topic.topic_id}
                  className={`topic-selection-card ${
                    isSelected ? "selected" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleTopicChange(topicId)}
                  />

                  <div className="topic-selection-card-content">
                    <strong>{topic.topic_name}</strong>

                    {topic.description && (
                      <p>{topic.description}</p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

export default TopicSelection;
