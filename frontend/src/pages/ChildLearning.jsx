
import { useEffect, useRef, useState } from "react";

import {
  useParams,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  getChild,
  getChildSelectedTopics,
  getChildTopicLessons,
  getChildLessonQuestions,
  checkChildAnswers,
  API_URL,
} from "../api";

import learningVideosBg from "../assets/learning-videos-bg.png";
import mindspringLogo from "../assets/mindspring-logo.png";

import "../styles/child-learning.css";

function ChildLearning() {
  const { childId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const videoSectionRef = useRef(null);

  const [child, setChild] = useState(location.state?.child || null);
  const [topics, setTopics] = useState([]);
  const [lessons, setLessons] = useState([]);

  const [selectedTopic, setSelectedTopic] = useState(null);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [questions, setQuestions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [checkingAnswers, setCheckingAnswers] = useState(false);

  const [videoCompleted, setVideoCompleted] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [answerResults, setAnswerResults] = useState(null);

  const [error, setError] = useState("");
  const [questionError, setQuestionError] = useState("");

  // Load child and topics
  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [childResponse, topicsResponse] = await Promise.all([
          getChild(childId),
          getChildSelectedTopics(childId),
        ]);

        const childData =
          childResponse.child ||
          childResponse.data ||
          childResponse;

        const topicData = Array.isArray(topicsResponse)
          ? topicsResponse
          : topicsResponse?.data ||
            topicsResponse?.selected_topics ||
            [];

        if (active) {
          setChild(childData);
          setTopics(topicData);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Unable to load learning content.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    if (childId) loadData();

    return () => {
      active = false;
    };
  }, [childId]);

  // Scroll video section into the visible screen
  useEffect(() => {
    if (!currentLesson) return;

    const scrollTimer = window.setTimeout(() => {
      videoSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 150);

    return () => window.clearTimeout(scrollTimer);
  }, [currentLesson?.lesson_id]);

  // Reset question data
  function resetQuestionData() {
    setQuestions([]);
    setSelectedAnswers({});
    setAnswerResults(null);
    setVideoCompleted(false);
    setQuestionsLoading(false);
    setCheckingAnswers(false);
    setQuestionError("");
  }

  // Load lessons when topic is selected
  async function handleTopicClick(topic) {
    try {
      setSelectedTopic(topic);
      setLessons([]);
      setCurrentLesson(null);

      resetQuestionData();
      setError("");
      setLessonsLoading(true);

      const response = await getChildTopicLessons(
        childId,
        topic.topic_id
      );

      const lessonData = Array.isArray(response)
        ? response
        : response?.data || response?.lessons || [];

      setLessons(lessonData);

      if (lessonData.length > 0) {
        setCurrentLesson(lessonData[0]);
      }
    } catch (err) {
      setError(err.message || "Unable to load videos.");
    } finally {
      setLessonsLoading(false);
    }
  }

  // Change current lesson
  function handleLessonClick(lesson) {
    if (currentLesson?.lesson_id === lesson.lesson_id) {
      videoSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
    }

    setCurrentLesson(lesson);
    resetQuestionData();
  }

  // Video URL
  function getVideoSource(videoUrl) {
    if (!videoUrl) return "";

    try {
      return new URL(videoUrl, API_URL).href;
    } catch {
      return videoUrl;
    }
  }

  // Question image URL
  function getQuestionImageSource(imageUrl) {
    if (!imageUrl) return "";

    try {
      return new URL(imageUrl, API_URL).href;
    } catch {
      return imageUrl;
    }
  }

  // Load questions after video ends
  async function handleVideoEnded() {
    if (!currentLesson || videoCompleted) return;

    const lessonId = currentLesson.lesson_id;

    try {
      setVideoCompleted(true);
      setQuestions([]);
      setSelectedAnswers({});
      setAnswerResults(null);
      setQuestionError("");
      setQuestionsLoading(true);

      const response = await getChildLessonQuestions(
        childId,
        lessonId
      );

      const questionData = Array.isArray(response)
        ? response
        : response?.data || response?.questions || [];

      const sortedQuestions = [...questionData].sort(
        (a, b) =>
          (a.question_order || 0) -
          (b.question_order || 0)
      );

      setCurrentLesson((current) => {
        if (current?.lesson_id !== lessonId) return current;

        setQuestions(sortedQuestions);
        return current;
      });
    } catch (err) {
      setQuestionError(err.message || "Unable to load questions.");
    } finally {
      setQuestionsLoading(false);
    }
  }

  // Automatic answer checking
  async function submitAnswersAutomatically(
    updatedAnswers,
    currentQuestions
  ) {
    if (!currentLesson || checkingAnswers) return;

    const lessonId = currentLesson.lesson_id;

    try {
      setCheckingAnswers(true);
      setQuestionError("");

      const answers = currentQuestions.map((question) => ({
        question_id: question.question_id,
        selected_answer: updatedAnswers[question.question_id],
      }));

      const response = await checkChildAnswers(
        childId,
        lessonId,
        answers
      );

      if (currentLesson?.lesson_id !== lessonId) return;

      const resultData = response?.data || response;
      setAnswerResults(resultData);
    } catch (err) {
      setQuestionError(
        err.message || "Unable to check answers. Please try again."
      );
    } finally {
      setCheckingAnswers(false);
    }
  }

  // Select answer
  function handleAnswerSelect(questionId, optionId) {
    if (answerResults || checkingAnswers) return;

    const updatedAnswers = {
      ...selectedAnswers,
      [questionId]: optionId,
    };

    setSelectedAnswers(updatedAnswers);

    if (
      questions.length > 0 &&
      questions.every(
        (question) => updatedAnswers[question.question_id]
      )
    ) {
      submitAnswersAutomatically(updatedAnswers, questions);
    }
  }

  if (loading) {
    return (
      <div className="child-learning-status">
        <h3>🌈 Loading your learning space...</h3>
      </div>
    );
  }

  const childName =
    child?.child_name || child?.name || "Friend";

  const childStars =
    child?.stars ?? child?.points ?? 0;

  return (
    <main
      className="child-learning-page"
      style={{
        "--learning-background": `url("${learningVideosBg}")`,
      }}
    >
      <div className="child-learning-shell">

        {/* HEADER */}
        <header className="learning-hero">
          <div className="learning-topbar">
            <div className="learning-brand-area">
              <div className="learning-logo">
                <img
                  src={mindspringLogo}
                  alt="MindSpring"
                  className="learning-logo-image"
                />
              </div>

              <button
                type="button"
                className="child-learning-back-btn"
                onClick={() =>
                  navigate(`/child-dashboard/${childId}`, {
                    state: { child },
                  })
                }
              >
                <span aria-hidden="true">←</span>
                Back to Dashboard
              </button>
            </div>

            <div className="learning-profile-actions">
              <div className="learning-child-pill">
                <span className="learning-avatar">🧒</span>
                <strong>{childName}</strong>
              </div>

              <div className="learning-stars-pill">
                <span>⭐</span>
                <strong>{childStars}</strong>
              </div>

              <div
                className="learning-settings-pill"
                aria-label="Settings"
              >
                ⚙
              </div>
            </div>
          </div>

          <div className="learning-hero-content">
            <div
              className="learning-hero-decoration learning-hero-left"
              aria-hidden="true"
            >
              📚
            </div>

            <div className="learning-hero-title-wrap">
              <div className="learning-clapper" aria-hidden="true">
                🎬
              </div>

              <h1>My Learning Videos</h1>

              <p>
                Welcome {childName}! Let's learn something new today!
              </p>
            </div>

            <div
              className="learning-hero-decoration learning-hero-right"
              aria-hidden="true"
            >
              🤖
            </div>
          </div>
        </header>

        {error && (
          <div className="child-learning-warning">
            {error}
          </div>
        )}

        {/* TOPICS */}
        <section className="child-learning-topics learning-wide-card">
          <div className="learning-section-heading">
            <span className="learning-heading-icon">📚</span>
            <h3>Choose Your Topic</h3>
          </div>

          {topics.length === 0 ? (
            <p className="child-learning-message">
              No topics selected yet. Please ask your parent to select your learning topics.
            </p>
          ) : (
            <div className="child-learning-topic-list">
              {topics.map((topic) => (
                <button
                  key={topic.topic_id}
                  type="button"
                  className={`child-learning-topic-btn ${
                    selectedTopic?.topic_id === topic.topic_id
                      ? "active"
                      : ""
                  }`}
                  onClick={() => handleTopicClick(topic)}
                >
                  {topic.topic_name || `Topic ${topic.topic_id}`}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* LESSONS */}
        {selectedTopic && (
          <section className="child-learning-lessons learning-wide-card">
            <div className="learning-section-heading">
              <span className="learning-heading-icon">📺</span>
              <h3>
                Videos - {selectedTopic.topic_name || "Selected Topic"}
              </h3>
            </div>

            {lessonsLoading ? (
              <p className="child-learning-message">
                Loading videos...
              </p>
            ) : lessons.length === 0 ? (
              <p className="child-learning-message">
                No videos are available for this topic yet.
              </p>
            ) : (
              <div className="child-learning-lesson-list">
                {lessons.map((lesson) => (
                  <button
                    key={lesson.lesson_id}
                    type="button"
                    className={`child-learning-lesson-btn ${
                      currentLesson?.lesson_id === lesson.lesson_id
                        ? "active"
                        : ""
                    }`}
                    onClick={() => handleLessonClick(lesson)}
                  >
                    ▶ {lesson.title}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* VIDEO AND QUESTIONS */}
        {currentLesson && (
          <section
            className="child-learning-split-layout"
            ref={videoSectionRef}
            id="learning-video-section"
          >
            <div className="child-learning-video-section learning-panel">
              <div className="child-learning-video-heading">
                <span>🎬</span>
                <h3>{currentLesson.title}</h3>
              </div>

              <video
                key={currentLesson.lesson_id}
                className="child-learning-main-video"
                controls
                preload="metadata"
                playsInline
                onEnded={handleVideoEnded}
              >
                <source
                  src={getVideoSource(currentLesson.video_url)}
                  type="video/mp4"
                />
                Your browser does not support video playback.
              </video>

              {currentLesson.lesson_script && (
                <div className="child-learning-video-description">
                  <h4>About this lesson</h4>
                  <p>{currentLesson.lesson_script}</p>
                </div>
              )}
            </div>

            {/* QUESTIONS */}
            <aside className="child-learning-questions-section learning-panel">
              <div className="child-learning-questions-heading">
                <span>✏️</span>
                <h3>Questions</h3>
              </div>

              {!videoCompleted && (
                <div className="child-learning-empty-questions">
                  <span>📋</span>
                  <p>
                    Watch the complete video to see your questions!
                  </p>
                </div>
              )}

              {videoCompleted && questionsLoading && (
                <div className="child-learning-empty-questions">
                  <span>⏳</span>
                  <p>Loading your questions...</p>
                </div>
              )}

              {videoCompleted &&
                !questionsLoading &&
                questionError && (
                  <div className="child-learning-warning">
                    {questionError}
                  </div>
                )}

              {videoCompleted &&
                !questionsLoading &&
                !questionError &&
                questions.length === 0 && (
                  <div className="child-learning-empty-questions">
                    <span>💡</span>
                    <p>
                      No questions are available for this lesson yet.
                    </p>
                  </div>
                )}

              {videoCompleted &&
                !questionsLoading &&
                questions.length > 0 && (
                  <div className="child-learning-question-list">
                    {questions.map((question, index) => {
                      const selectedAnswer =
                        selectedAnswers[question.question_id];

                      const questionResult =
                        answerResults?.results?.find(
                          (result) =>
                            result.question_id === question.question_id
                        );

                      const correctAnswer =
                        questionResult?.correct_answer;

                      return (
                        <div
                          className="child-learning-question-card"
                          key={question.question_id}
                        >
                          <h4 className="child-learning-question-number">
                            Question {index + 1}
                          </h4>

                          <p className="child-learning-question-text">
                            {question.question_text}
                          </p>

                          <div className="child-learning-answer-options">
                            {(question.answer_options || []).map((option) => {
                              const isSelected =
                                selectedAnswer === option.id;

                              const isCorrectOption =
                                answerResults &&
                                correctAnswer === option.id;

                              const isWrongSelected =
                                answerResults &&
                                isSelected &&
                                !questionResult?.is_correct;

                              let optionClass =
                                "child-learning-answer-option";

                              if (isCorrectOption) {
                                optionClass += " correct";
                              } else if (isWrongSelected) {
                                optionClass += " incorrect";
                              } else if (isSelected) {
                                optionClass += " selected";
                              }

                              return (
                                <button
                                  type="button"
                                  className={optionClass}
                                  key={option.id}
                                  onClick={() =>
                                    handleAnswerSelect(
                                      question.question_id,
                                      option.id
                                    )
                                  }
                                  disabled={
                                    Boolean(answerResults) ||
                                    checkingAnswers
                                  }
                                  aria-pressed={isSelected}
                                >
                                  <span className="child-learning-option-label">
                                    {option.id}
                                  </span>

                                  {option.image_url ? (
                                    <img
                                      src={getQuestionImageSource(
                                        option.image_url
                                      )}
                                      alt={`Option ${option.id}`}
                                      className="child-learning-option-image"
                                    />
                                  ) : (
                                    <div className="child-learning-option-no-image">
                                      Image not available
                                    </div>
                                  )}

                                  {isCorrectOption && (
                                    <span className="child-learning-answer-feedback">
                                      ✓ Correct
                                    </span>
                                  )}

                                  {isWrongSelected && (
                                    <span className="child-learning-answer-feedback">
                                      ✗ Try Again
                                    </span>
                                  )}

                                  {!answerResults && isSelected && (
                                    <span className="child-learning-selected-indicator">
                                      ✓ Selected
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {checkingAnswers && (
                      <div className="child-learning-empty-questions">
                        <span>⏳</span>
                        <p>Checking your answers...</p>
                      </div>
                    )}

                    {answerResults && (() => {
                      const earnedStars = Math.max(
                        0,
                        Math.min(
                          Number(answerResults.score) || 0,
                          Number(answerResults.total_questions) || 0
                        )
                      );

                      const totalQuestions =
                        Number(answerResults.total_questions) || 0;

                      return (
                        <div className="child-learning-result">
                          <h3>🌟 Great Learning!</h3>

                          <div
                            className="child-learning-earned-stars"
                            aria-label={`${earnedStars} stars earned`}
                          >
                            {Array.from(
                              { length: earnedStars },
                              (_, index) => (
                                <span key={index}>⭐</span>
                              )
                            )}
                          </div>

                          <h2>
                            {earnedStars} / {totalQuestions} Stars
                          </h2>

                          <p>
                            {earnedStars} correct answers = {earnedStars} earned stars
                          </p>

                          <p>
                            You got <strong>{earnedStars}</strong> out of{" "}
                            <strong>{totalQuestions}</strong> correct answers.
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                )}
            </aside>
          </section>
        )}
      </div>
    </main>
  );
}

export default ChildLearning;
