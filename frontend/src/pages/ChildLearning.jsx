
import { useEffect, useState } from "react";

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

import "../styles/child-learning.css";


function ChildLearning() {
  const { childId } = useParams();

  const location = useLocation();
  const navigate = useNavigate();

  const [child, setChild] = useState(
    location.state?.child || null
  );

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

  // Selected answers
  const [selectedAnswers, setSelectedAnswers] = useState({});

  // Backend checking results
  const [answerResults, setAnswerResults] = useState(null);

  const [error, setError] = useState("");
  const [questionError, setQuestionError] = useState("");


  // ========================================
  // LOAD CHILD AND SELECTED TOPICS
  // ========================================

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [childResponse, topicsResponse] =
          await Promise.all([
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
          setError(
            err.message || "Unable to load learning content."
          );
        }

      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    if (childId) {
      loadData();
    }

    return () => {
      active = false;
    };

  }, [childId]);


  // ========================================
  // RESET QUESTION DATA
  // ========================================

  function resetQuestionData() {
    setQuestions([]);
    setSelectedAnswers({});
    setAnswerResults(null);
    setVideoCompleted(false);
    setQuestionsLoading(false);
    setCheckingAnswers(false);
    setQuestionError("");
  }


  // ========================================
  // LOAD LESSONS WHEN A TOPIC IS SELECTED
  // ========================================

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
      setError(
        err.message || "Unable to load videos."
      );

    } finally {
      setLessonsLoading(false);
    }
  }


  // ========================================
  // CHANGE CURRENT LESSON
  // ========================================

  function handleLessonClick(lesson) {
    setCurrentLesson(lesson);
    resetQuestionData();
  }


  // ========================================
  // VIDEO URL
  // ========================================

  function getVideoSource(videoUrl) {
    if (!videoUrl) return "";

    try {
      return new URL(videoUrl, API_URL).href;
    } catch {
      return videoUrl;
    }
  }


  // ========================================
  // QUESTION IMAGE URL
  // ========================================

  function getQuestionImageSource(imageUrl) {
    if (!imageUrl) return "";

    try {
      return new URL(imageUrl, API_URL).href;
    } catch {
      return imageUrl;
    }
  }


  // ========================================
  // LOAD QUESTIONS AFTER VIDEO ENDS
  // ========================================

  async function handleVideoEnded() {
    if (!currentLesson || videoCompleted) {
      return;
    }

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
        : response?.data ||
          response?.questions ||
          [];

      const sortedQuestions = [...questionData].sort(
        (a, b) =>
          (a.question_order || 0) -
          (b.question_order || 0)
      );

      setCurrentLesson((current) => {
        if (current?.lesson_id !== lessonId) {
          return current;
        }

        setQuestions(sortedQuestions);
        return current;
      });

    } catch (err) {
      setQuestionError(
        err.message || "Unable to load questions."
      );

    } finally {
      setQuestionsLoading(false);
    }
  }


  // ========================================
  // AUTOMATIC ANSWER CHECKING
  // ========================================

  async function submitAnswersAutomatically(
    updatedAnswers,
    currentQuestions
  ) {
    if (!currentLesson || checkingAnswers) {
      return;
    }

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

      // Prevent old lesson results from updating new lesson
      if (
        currentLesson?.lesson_id !== lessonId
      ) {
        return;
      }

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


  // ========================================
  // SELECT ANSWER
  // ========================================

  function handleAnswerSelect(questionId, optionId) {
    // Do not allow changes after all answers are checked
    if (answerResults || checkingAnswers) {
      return;
    }

    const updatedAnswers = {
      ...selectedAnswers,
      [questionId]: optionId,
    };

    setSelectedAnswers(updatedAnswers);

    // Check automatically when every question is answered
    if (
      questions.length > 0 &&
      questions.every(
        (question) =>
          updatedAnswers[question.question_id]
      )
    ) {
      submitAnswersAutomatically(
        updatedAnswers,
        questions
      );
    }
  }


  // ========================================
  // LOADING SCREEN
  // ========================================

  if (loading) {
    return (
      <div className="child-learning-status">
        <h3>🌈 Loading your learning space...</h3>
      </div>
    );
  }


  // ========================================
  // MAIN PAGE
  // ========================================

  return (
    <main className="child-learning-page">

      {/* HEADER */}

      <header className="child-learning-header">

        <button
          type="button"
          className="child-learning-back-btn"
          onClick={() =>
            navigate(`/child-dashboard/${childId}`)
          }
        >
          ← Back to Dashboard
        </button>

        <h2>My Learning Videos 🌈</h2>

        <p>
          Welcome{" "}
          {child?.child_name || child?.name || "Friend"}!
          Let's learn something new today.
        </p>

      </header>


      {/* GENERAL ERROR */}

      {error && (
        <div className="child-learning-warning">
          {error}
        </div>
      )}


      {/* TOPIC SELECTION */}

      <section className="child-learning-topics">

        <h3>Choose Your Topic</h3>

        {topics.length === 0 ? (
          <p className="child-learning-message">
            No topics selected yet. Please ask your parent
            to select your learning topics.
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


      {/* LESSON LIST */}

      {selectedTopic && (

        <section className="child-learning-lessons">

          <h3>
            Videos -{" "}
            {selectedTopic.topic_name || "Selected Topic"}
          </h3>

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


      {/* VIDEO AND QUESTIONS SECTION */}

      {currentLesson && (

        <section className="child-learning-split-layout">

          {/* LEFT SIDE - VIDEO */}

          <div className="child-learning-video-section">

            <div className="child-learning-video-heading">

              <span>🎬</span>

              <h3>{currentLesson.title}</h3>

            </div>


            {/* VIDEO PLAYER */}

            <video
              key={currentLesson.lesson_id}
              className="child-learning-main-video"
              controls
              preload="metadata"
              onEnded={handleVideoEnded}
            >

              <source
                src={getVideoSource(currentLesson.video_url)}
                type="video/mp4"
              />

              Your browser does not support video playback.

            </video>


            {/* VIDEO DESCRIPTION */}

            {currentLesson.lesson_script && (

              <div className="child-learning-video-description">

                <h4>About this lesson</h4>

                <p>{currentLesson.lesson_script}</p>

              </div>

            )}

          </div>


          {/* RIGHT SIDE - QUESTIONS */}

          <aside className="child-learning-questions-section">

            <div className="child-learning-questions-heading">

              <span>✏️</span>

              <h3>Questions</h3>

            </div>


            {/* BEFORE VIDEO COMPLETION */}

            {!videoCompleted && (

              <div className="child-learning-empty-questions">

                <span>💡</span>

                <p>
                  Watch the complete video to see your questions!
                </p>

              </div>

            )}


            {/* QUESTIONS LOADING */}

            {videoCompleted && questionsLoading && (

              <div className="child-learning-empty-questions">

                <span>⏳</span>

                <p>Loading your questions...</p>

              </div>

            )}


            {/* QUESTION ERROR */}

            {videoCompleted && !questionsLoading && questionError && (

              <div className="child-learning-warning">
                {questionError}
              </div>

            )}


            {/* NO QUESTIONS */}

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


            {/* DISPLAY QUESTIONS */}

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

                        {/* QUESTION NUMBER */}

                        <h4 className="child-learning-question-number">
                          Question {index + 1}
                        </h4>


                        {/* QUESTION TEXT */}

                        <p className="child-learning-question-text">
                          {question.question_text}
                        </p>


                        {/* IMAGE OPTIONS A / B / C */}

                        <div className="child-learning-answer-options">

                          {(question.answer_options || []).map(
                            (option) => {

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
                            }
                          )}

                        </div>

                      </div>

                    );
                  })}


                  {/* AUTOMATIC CHECKING MESSAGE */}

                  {checkingAnswers && (

                    <div className="child-learning-empty-questions">
                      <span>⏳</span>
                      <p>Checking your answers...</p>
                    </div>

                  )}


                  {/* FINAL SCORE */}

                  {answerResults && (

                    <div className="child-learning-result">

                      <h3>🌟 Great Learning!</h3>

                      <p>
                        You got{" "}
                        <strong>
                          {answerResults.score}
                        </strong>
                        {" "}out of{" "}
                        <strong>
                          {answerResults.total_questions}
                        </strong>
                        {" "}correct answers.
                      </p>

                    </div>

                  )}

                </div>

              )}

          </aside>

        </section>

      )}

    </main>
  );
}

export default ChildLearning;
