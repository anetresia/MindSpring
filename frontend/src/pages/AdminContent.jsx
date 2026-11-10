import { useEffect, useMemo, useState } from "react";
import AdminSidebar from "../components/admin/AdminSidebar";
import AdminHeader from "../components/admin/AdminHeader";
import { API_URL, getAuthHeaders } from "../api";
import "../styles/admin/admin-content.css";

const emptyCategory = {
  category_name: "",
  description: "",
  is_active: true,
};

const emptyTopic = {
  category_id: "",
  topic_name: "",
  description: "",
  is_active: true,
};

const emptyLesson = {
  topic_id: "",
  title: "",
  video_url: "",
  lesson_script: "",
  is_premium: false,
};

const emptyQuestion = {
  lesson_id: "",
  question_text: "",
  answer_options: [
    { id: "A", image_url: "" },
    { id: "B", image_url: "" },
    { id: "C", image_url: "" },
  ],
  correct_answer: "A",
  question_type: "Image",
  question_order: 1,
};

function AdminContent() {
  const [activeTab, setActiveTab] = useState("categories");
  const [categories, setCategories] = useState([]);
  const [topics, setTopics] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [selectedQuestionLessonId, setSelectedQuestionLessonId] =
    useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [topicForm, setTopicForm] = useState(emptyTopic);
  const [lessonForm, setLessonForm] = useState(emptyLesson);
  const [questionForm, setQuestionForm] = useState(emptyQuestion);

  const [questionImageFiles, setQuestionImageFiles] = useState([
    null,
    null,
    null,
  ]);

  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingTopicId, setEditingTopicId] = useState(null);
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [editingQuestionId, setEditingQuestionId] = useState(null);

  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [showQuestionForm, setShowQuestionForm] = useState(false);

  const [selectedVideo, setSelectedVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function requestApi(path, options = {}) {
    const isFormData = options.body instanceof FormData;

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...getAuthHeaders(!isFormData),
        ...(options.headers || {}),
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      let message = "Something went wrong.";

      if (typeof data?.detail === "string") {
        message = data.detail;
      } else if (Array.isArray(data?.detail)) {
        message = data.detail.map((item) => item.msg).join(", ");
      }

      throw new Error(message);
    }

    return data;
  }

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [categoryData, topicData, lessonData] = await Promise.all([
        requestApi("/admin/life-skill-categories/"),
        requestApi("/admin/life-skill-topics/"),
        requestApi("/admin/lessons/"),
      ]);

      const categoryList = Array.isArray(categoryData)
        ? categoryData
        : [];

      setCategories(categoryList);
      setTopics(Array.isArray(topicData) ? topicData : []);
      setLessons(Array.isArray(lessonData) ? lessonData : []);

      setSelectedCategoryId((previous) => {
        if (
          previous &&
          categoryList.some((item) => item.category_id === previous)
        ) {
          return previous;
        }

        return categoryList[0]?.category_id ?? null;
      });
    } catch (err) {
      console.error("Admin loading error:", err);
      setError(err.message || "Unable to load admin content.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const selectedCategory = categories.find(
    (category) => category.category_id === selectedCategoryId
  );

  const selectedTopics = useMemo(
    () =>
      topics.filter((topic) => topic.category_id === selectedCategoryId),
    [topics, selectedCategoryId]
  );

  const activeCategories = categories.filter(
    (category) => category.is_active !== false
  );

  const activeTopics = topics.filter(
    (topic) => topic.is_active !== false
  );

  function openAddCategory() {
    setCategoryForm(emptyCategory);
    setEditingCategoryId(null);
    setShowCategoryForm(true);
    setError("");
    setSuccess("");
  }

  function openEditCategory(category) {
    setCategoryForm({
      category_name: category.category_name || "",
      description: category.description || "",
      is_active: category.is_active !== false,
    });

    setEditingCategoryId(category.category_id);
    setShowCategoryForm(true);
    setError("");
    setSuccess("");
  }

  async function handleCategorySubmit(event) {
    event.preventDefault();

    if (!categoryForm.category_name.trim()) {
      setError("Please enter a category name.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        category_name: categoryForm.category_name.trim(),
        description: categoryForm.description.trim(),
        is_active: categoryForm.is_active,
      };

      if (editingCategoryId) {
        await requestApi(
          `/admin/life-skill-categories/${editingCategoryId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        setSuccess("Category updated successfully.");
      } else {
        await requestApi("/admin/life-skill-categories/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        setSuccess("Category added successfully.");
      }

      setShowCategoryForm(false);
      setCategoryForm(emptyCategory);
      setEditingCategoryId(null);
      await loadData();
    } catch (err) {
      setError(err.message || "Unable to save category.");
    } finally {
      setSaving(false);
    }
  }

  function openAddTopic() {
    setTopicForm({
      ...emptyTopic,
      category_id: selectedCategoryId
        ? String(selectedCategoryId)
        : "",
    });

    setEditingTopicId(null);
    setShowTopicForm(true);
    setError("");
    setSuccess("");
  }

  function openEditTopic(topic) {
    setTopicForm({
      category_id: String(topic.category_id),
      topic_name: topic.topic_name || "",
      description: topic.description || "",
      is_active: topic.is_active !== false,
    });

    setEditingTopicId(topic.topic_id);
    setShowTopicForm(true);
    setError("");
    setSuccess("");
  }

  async function handleTopicSubmit(event) {
    event.preventDefault();

    if (!topicForm.category_id || !topicForm.topic_name.trim()) {
      setError("Please select a category and enter a topic name.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        category_id: Number(topicForm.category_id),
        topic_name: topicForm.topic_name.trim(),
        description: topicForm.description.trim(),
        is_active: topicForm.is_active,
      };

      if (editingTopicId) {
        await requestApi(
          `/admin/life-skill-topics/${editingTopicId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        setSuccess("Topic updated successfully.");
      } else {
        await requestApi("/admin/life-skill-topics/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        setSuccess("Topic added successfully.");
      }

      setShowTopicForm(false);
      setTopicForm(emptyTopic);
      setEditingTopicId(null);
      await loadData();
    } catch (err) {
      setError(err.message || "Unable to save topic.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleTopicStatus(topic) {
    const nextStatus = topic.is_active === false;

    try {
      setError("");
      setSuccess("");

      await requestApi(
        `/admin/life-skill-topics/${topic.topic_id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            is_active: nextStatus,
          }),
        }
      );

      setSuccess(
        nextStatus
          ? "Topic activated successfully."
          : "Topic deactivated successfully."
      );

      await loadData();
    } catch (err) {
      setError(err.message || "Unable to update topic status.");
    }
  }

  async function toggleCategoryStatus(category) {
    const nextStatus = category.is_active === false;

    try {
      setError("");
      setSuccess("");

      await requestApi(
        `/admin/life-skill-categories/${category.category_id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            is_active: nextStatus,
          }),
        }
      );

      setSuccess(
        nextStatus
          ? "Category activated successfully."
          : "Category deactivated successfully."
      );

      await loadData();
    } catch (err) {
      setError(err.message || "Unable to update category.");
    }
  }

  function openAddLesson(topicId = "") {
    setSelectedVideo(null);

    setLessonForm({
      ...emptyLesson,
      topic_id: topicId ? String(topicId) : "",
    });

    setEditingLessonId(null);
    setShowLessonForm(true);
    setError("");
    setSuccess("");
  }

  function openEditLesson(lesson) {
    setSelectedVideo(null);

    setLessonForm({
      topic_id: String(lesson.topic_id),
      title: lesson.title || "",
      video_url: lesson.video_url || "",
      lesson_script: lesson.lesson_script || "",
      is_premium: Boolean(lesson.is_premium),
    });

    setEditingLessonId(lesson.lesson_id);
    setShowLessonForm(true);
    setError("");
    setSuccess("");
  }

  function handleVideoSelection(event) {
    const file = event.target.files?.[0] || null;

    setError("");
    setSelectedVideo(null);

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".mp4")) {
      setError("Please select an MP4 video file.");
      event.target.value = "";
      return;
    }

    if (file.size > 200 * 1024 * 1024) {
      setError("Video size must be below 200 MB.");
      event.target.value = "";
      return;
    }

    setSelectedVideo(file);
  }

  async function uploadVideo(file) {
    const formData = new FormData();
    formData.append("file", file);

    const result = await requestApi("/admin/videos/upload", {
      method: "POST",
      body: formData,
    });

    if (!result?.video_url) {
      throw new Error("Video upload failed. Video URL was not returned.");
    }

    return result.video_url;
  }

  async function handleLessonSubmit(event) {
    event.preventDefault();

    if (!lessonForm.topic_id || !lessonForm.title.trim()) {
      setError("Please select a topic and enter a lesson title.");
      return;
    }

    if (!selectedVideo && !lessonForm.video_url.trim()) {
      setError("Please upload an MP4 video or enter a video URL.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      let videoUrl = lessonForm.video_url.trim();

      if (selectedVideo) {
        videoUrl = await uploadVideo(selectedVideo);
      }

      const payload = {
        topic_id: Number(lessonForm.topic_id),
        title: lessonForm.title.trim(),
        video_url: videoUrl,
        lesson_script: lessonForm.lesson_script.trim() || null,
        is_premium: lessonForm.is_premium,
      };

      if (editingLessonId) {
        await requestApi(
          `/admin/lessons/${editingLessonId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        setSuccess("Lesson updated successfully.");
      } else {
        await requestApi("/admin/lessons/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        setSuccess("Lesson added successfully.");
      }

      setShowLessonForm(false);
      setLessonForm(emptyLesson);
      setSelectedVideo(null);
      setEditingLessonId(null);
      await loadData();
    } catch (err) {
      setError(err.message || "Unable to save lesson.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteLesson(lessonId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this lesson?"
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await requestApi(`/admin/lessons/${lessonId}`, {
        method: "DELETE",
      });

      setSuccess("Lesson deleted successfully.");
      await loadData();
    } catch (err) {
      setError(err.message || "Unable to delete lesson.");
    }
  }

  async function loadQuestions(lessonId = selectedQuestionLessonId) {
    if (!lessonId) {
      setQuestions([]);
      return;
    }

    try {
      const data = await requestApi(
        `/admin/quizzes/lessons/${lessonId}/questions`
      );

      setQuestions(Array.isArray(data) ? data : []);
    } catch (err) {
      setQuestions([]);
      setError(err.message || "Unable to load questions.");
    }
  }

  function openAddQuestion() {
    setQuestionForm({
      ...emptyQuestion,
      answer_options: emptyQuestion.answer_options.map((option) => ({
        ...option,
      })),
      lesson_id: String(selectedQuestionLessonId || ""),
      question_order: questions.length + 1,
    });

    setQuestionImageFiles([null, null, null]);
    setEditingQuestionId(null);
    setShowQuestionForm(true);
    setError("");
    setSuccess("");
  }

  function openEditQuestion(question) {
    const options = Array.isArray(question.answer_options)
      ? question.answer_options
      : [];

    setQuestionForm({
      lesson_id: String(
        question.lesson_id || selectedQuestionLessonId || ""
      ),
      question_text: question.question_text || "",
      answer_options: ["A", "B", "C"].map((id) => {
        const option = options.find((item) => item.id === id);
        return {
          id,
          image_url: option?.image_url || "",
        };
      }),
      correct_answer: ["A", "B", "C"].includes(question.correct_answer)
        ? question.correct_answer
        : "A",
      question_type: question.question_type || "Image",
      question_order: Number(question.question_order || 1),
    });

    setQuestionImageFiles([null, null, null]);
    setEditingQuestionId(question.question_id);
    setShowQuestionForm(true);
    setError("");
    setSuccess("");
  }

  function handleQuestionImageSelection(index, file) {
    setError("");

    if (!file) {
      setQuestionImageFiles((previous) =>
        previous.map((item, i) => (i === index ? null : item))
      );
      return;
    }

    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      setError("Question option images must be PNG or JPG files.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Each question image must be 5 MB or smaller.");
      return;
    }

    setQuestionImageFiles((previous) =>
      previous.map((item, i) => (i === index ? file : item))
    );
  }

  async function uploadQuestionImage(file) {
    const formData = new FormData();
    formData.append("file", file);

    const result = await requestApi(
      "/admin/quizzes/upload-question-image",
      {
        method: "POST",
        body: formData,
      }
    );

    if (!result?.image_url) {
      throw new Error(
        "Question image upload failed. Image URL was not returned."
      );
    }

    return result.image_url;
  }

  async function handleQuestionSubmit(event) {
    event.preventDefault();

    if (!questionForm.lesson_id || !questionForm.question_text.trim()) {
      setError("Please select a lesson and enter the question.");
      return;
    }

    const questionOrder = Number(questionForm.question_order);

    if (
      !Number.isInteger(questionOrder) ||
      questionOrder < 1 ||
      questionOrder > 5
    ) {
      setError("Question Order must be a whole number between 1 and 5.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const answerOptions = await Promise.all(
        questionForm.answer_options.map(async (option, index) => ({
          id: option.id,
          image_url: questionImageFiles[index]
            ? await uploadQuestionImage(questionImageFiles[index])
            : option.image_url,
        }))
      );

      if (answerOptions.some((option) => !option.image_url)) {
        throw new Error(
          "Please upload an image for all three options (A–C)."
        );
      }

      const payload = {
        ...(!editingQuestionId && {
          lesson_id: Number(questionForm.lesson_id),
        }),
        question_text: questionForm.question_text.trim(),
        answer_options: answerOptions,
        correct_answer: questionForm.correct_answer,
        question_type: "Image",
        question_order: questionOrder,
      };

      if (editingQuestionId) {
        await requestApi(
          `/admin/quizzes/questions/${editingQuestionId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        setSuccess("Question updated successfully.");
      } else {
        await requestApi("/admin/quizzes/questions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        setSuccess("Question added successfully.");
      }

      setShowQuestionForm(false);
      setQuestionForm(emptyQuestion);
      setQuestionImageFiles([null, null, null]);
      setEditingQuestionId(null);
      await loadQuestions(questionForm.lesson_id);
    } catch (err) {
      setError(err.message || "Unable to save question.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteQuestion(questionId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this question?"
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await requestApi(`/admin/quizzes/questions/${questionId}`, {
        method: "DELETE",
      });

      setSuccess("Question deleted successfully.");
      await loadQuestions();
    } catch (err) {
      setError(err.message || "Unable to delete question.");
    }
  }

  function getTopicLessonCount(topicId) {
    return lessons.filter(
      (lesson) => lesson.topic_id === topicId
    ).length;
  }

  function getCategoryLessonCount(categoryId) {
    const categoryTopicIds = topics
      .filter((topic) => topic.category_id === categoryId)
      .map((topic) => topic.topic_id);

    return lessons.filter((lesson) =>
      categoryTopicIds.includes(lesson.topic_id)
    ).length;
  }

  function getTopicName(topicId) {
    return (
      topics.find((topic) => topic.topic_id === topicId)?.topic_name ||
      `Topic ${topicId}`
    );
  }

  function getCategoryName(categoryId) {
    return (
      categories.find(
        (category) => category.category_id === categoryId
      )?.category_name || "Unassigned"
    );
  }

  function getVideoUrl(videoUrl) {
    if (!videoUrl) return "";

    if (
      videoUrl.startsWith("http://") ||
      videoUrl.startsWith("https://")
    ) {
      return videoUrl;
    }

    return `${API_URL}${videoUrl.startsWith("/") ? "" : "/"}${videoUrl}`;
  }

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <main className="admin-main">
        <AdminHeader title="Content Management" />

        <div className="admin-content-page">
          <div className="admin-content-heading">
            <div>
              <h2>Manage Learning Content</h2>
              <p>Organize categories, topics and learning videos.</p>
            </div>

            <div className="admin-video-count">
              {categories.length} Categories · {topics.length} Topics ·{" "}
              {lessons.length} Lessons
            </div>
          </div>

          {error && (
            <div className="admin-message admin-error">{error}</div>
          )}

          {success && (
            <div className="admin-message admin-success">{success}</div>
          )}

          <div className="admin-content-tabs">
            <button
              type="button"
              className={activeTab === "categories" ? "active" : ""}
              onClick={() => {
                setActiveTab("categories");
                setError("");
              }}
            >
              Categories
            </button>

            <button
              type="button"
              className={activeTab === "lessons" ? "active" : ""}
              onClick={() => {
                setActiveTab("lessons");
                setError("");
              }}
            >
              Lessons
            </button>

            <button
              type="button"
              className={activeTab === "questions" ? "active" : ""}
              onClick={() => {
                setActiveTab("questions");
                setError("");

                if (lessons.length && !selectedQuestionLessonId) {
                  const firstLessonId = String(lessons[0].lesson_id);
                  setSelectedQuestionLessonId(firstLessonId);
                  loadQuestions(firstLessonId);
                } else if (selectedQuestionLessonId) {
                  loadQuestions(selectedQuestionLessonId);
                }
              }}
            >
              Questions
            </button>

            <button
              type="button"
              className="admin-refresh-btn"
              onClick={loadData}
              disabled={loading}
            >
              ↻ Refresh
            </button>
          </div>

          {loading ? (
            <div className="admin-video-list-card">
              <p className="admin-empty-message">Loading content...</p>
            </div>
          ) : (
            <>
              {activeTab === "categories" && (
                <section className="admin-category-layout">
                  <div className="admin-category-panel">
                    <div className="admin-panel-heading">
                      <div>
                        <h2>Categories</h2>
                        <p>{categories.length} main categories</p>
                      </div>
                    </div>

                    <div className="admin-category-list">
                      {categories.length === 0 ? (
                        <p className="admin-empty-message">
                          No categories added yet.
                        </p>
                      ) : (
                        categories.map((category, index) => (
                          <div
                            key={category.category_id}
                            className={`admin-category-item ${
                              selectedCategoryId === category.category_id
                                ? "selected"
                                : ""
                            } ${
                              category.is_active === false ? "inactive" : ""
                            }`}
                          >
                            <button
                              type="button"
                              className="admin-category-select"
                              onClick={() =>
                                setSelectedCategoryId(category.category_id)
                              }
                            >
                              <span className="admin-category-icon">
                                {
                                  ["⭐", "🧩", "❤️", "🏠", "💬", "🌞", "📚"][
                                    index % 7
                                  ]
                                }
                              </span>

                              <span className="admin-category-details">
                                <strong>{category.category_name}</strong>
                                <small>
                                  {getCategoryLessonCount(
                                    category.category_id
                                  )}{" "}
                                  lessons
                                </small>
                              </span>
                            </button>

                            <button
                              type="button"
                              className="admin-category-edit"
                              onClick={() => openEditCategory(category)}
                              title="Edit category"
                            >
                              ✎
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    <button
                      type="button"
                      className="admin-add-category-btn"
                      onClick={openAddCategory}
                    >
                      + Add Category
                    </button>
                  </div>

                  <div className="admin-topic-panel">
                    {selectedCategory ? (
                      <>
                        <div className="admin-topic-panel-heading">
                          <div>
                            <div className="admin-selected-category-title">
                              <h2>{selectedCategory.category_name}</h2>

                              <button
                                type="button"
                                onClick={() =>
                                  openEditCategory(selectedCategory)
                                }
                                title="Edit category"
                              >
                                ✎
                              </button>
                            </div>

                            <p>
                              {getCategoryLessonCount(
                                selectedCategory.category_id
                              )}{" "}
                              lessons
                            </p>
                          </div>

                          <button
                            type="button"
                            className="admin-add-lesson-btn"
                            onClick={() => openAddLesson()}
                            disabled={activeTopics.length === 0}
                          >
                            + Add Lesson
                          </button>
                        </div>

                        <div className="admin-topic-list">
                          {selectedTopics.length === 0 ? (
                            <p className="admin-empty-message">
                              No topics added to this category. Add your first
                              topic below.
                            </p>
                          ) : (
                            selectedTopics.map((topic, index) => (
                              <div
                                className="admin-topic-card"
                                key={topic.topic_id}
                              >
                                <div className="admin-topic-icon">
                                  {
                                    ["🦷", "🧼", "🛁", "👕", "⭐", "📖"][
                                      index % 6
                                    ]
                                  }
                                </div>

                                <div className="admin-topic-info">
                                  <strong>{topic.topic_name}</strong>
                                  <small>
                                    {getTopicLessonCount(topic.topic_id)}{" "}
                                    activities
                                  </small>
                                </div>

                                <span
                                  className={`admin-status ${
                                    topic.is_active === false
                                      ? "inactive"
                                      : "active"
                                  }`}
                                >
                                  {topic.is_active === false
                                    ? "Inactive"
                                    : "Active"}
                                </span>

                                <button
                                  type="button"
                                  className="admin-topic-edit-btn"
                                  onClick={() => openEditTopic(topic)}
                                >
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  className="admin-topic-status-btn"
                                  onClick={() => toggleTopicStatus(topic)}
                                  title={
                                    topic.is_active === false
                                      ? "Activate topic"
                                      : "Deactivate topic"
                                  }
                                >
                                  ⋮
                                </button>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="admin-topic-bottom-actions">
                          <button
                            type="button"
                            className="admin-add-category-btn"
                            onClick={openAddTopic}
                          >
                            + Add Topic
                          </button>

                          <button
                            type="button"
                            className="admin-secondary-btn"
                            onClick={() =>
                              toggleCategoryStatus(selectedCategory)
                            }
                          >
                            {selectedCategory.is_active === false
                              ? "Activate Category"
                              : "Deactivate Category"}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="admin-no-category">
                        <h2>Select a Category</h2>
                        <p>
                          Select a category to manage its topics and lessons.
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {activeTab === "lessons" && (
                <section className="admin-video-list-card">
                  <div className="admin-video-list-heading">
                    <div>
                      <h2>Learning Lessons</h2>
                      <p className="admin-subtitle">
                        Manage all learning videos.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="admin-add-lesson-btn"
                      onClick={() => openAddLesson()}
                      disabled={activeTopics.length === 0}
                    >
                      + Add Lesson
                    </button>
                  </div>

                  {lessons.length === 0 ? (
                    <p className="admin-empty-message">
                      No lessons added yet.
                    </p>
                  ) : (
                    <div className="admin-video-table-wrapper">
                      <table className="admin-video-table">
                        <thead>
                          <tr>
                            <th>Lesson</th>
                            <th>Category</th>
                            <th>Topic</th>
                            <th>Type</th>
                            <th>Actions</th>
                          </tr>
                        </thead>

                        <tbody>
                          {lessons.map((lesson) => {
                            const topic = topics.find(
                              (item) => item.topic_id === lesson.topic_id
                            );

                            return (
                              <tr key={lesson.lesson_id}>
                                <td>
                                  <strong>{lesson.title}</strong>
                                  <a
                                    href={getVideoUrl(lesson.video_url)}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    Open video
                                  </a>
                                </td>

                                <td>
                                  {getCategoryName(topic?.category_id)}
                                </td>

                                <td>{getTopicName(lesson.topic_id)}</td>

                                <td>
                                  {lesson.is_premium ? "Premium" : "Free"}
                                </td>

                                <td>
                                  <div className="admin-table-actions">
                                    <button
                                      type="button"
                                      onClick={() => openEditLesson(lesson)}
                                    >
                                      Edit
                                    </button>

                                    <button
                                      type="button"
                                      className="delete"
                                      onClick={() =>
                                        handleDeleteLesson(lesson.lesson_id)
                                      }
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}

              {activeTab === "questions" && (
                <section className="admin-video-list-card">
                  <div className="admin-video-list-heading">
                    <div>
                      <h2>Lesson Questions</h2>
                      <p className="admin-subtitle">
                        Add image-based quiz questions to a lesson.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="admin-add-lesson-btn"
                      onClick={openAddQuestion}
                      disabled={
                        !selectedQuestionLessonId || questions.length >= 5
                      }
                    >
                      + Add Question
                    </button>
                  </div>

                  <div
                    className="admin-form-group"
                    style={{ maxWidth: "420px", marginBottom: "18px" }}
                  >
                    <label>Select Lesson *</label>

                    <select
                      value={selectedQuestionLessonId}
                      onChange={(event) => {
                        const lessonId = event.target.value;
                        setSelectedQuestionLessonId(lessonId);
                        loadQuestions(lessonId);
                      }}
                    >
                      <option value="">Select a lesson</option>

                      {lessons.map((lesson) => (
                        <option
                          key={lesson.lesson_id}
                          value={lesson.lesson_id}
                        >
                          {lesson.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedQuestionLessonId && (
                    <p
                      className="admin-subtitle"
                      style={{ marginBottom: "14px" }}
                    >
                      {questions.length} / 5 questions added for this lesson.
                    </p>
                  )}

                  {!lessons.length ? (
                    <p className="admin-empty-message">
                      Add a lesson before creating questions.
                    </p>
                  ) : !selectedQuestionLessonId ? (
                    <p className="admin-empty-message">
                      Select a lesson to view its questions.
                    </p>
                  ) : questions.length === 0 ? (
                    <p className="admin-empty-message">
                      No questions added to this lesson yet.
                    </p>
                  ) : (
                    <div className="admin-video-table-wrapper">
                      <table className="admin-video-table">
                        <thead>
                          <tr>
                            <th>Order</th>
                            <th>Question</th>
                            <th>Options</th>
                            <th>Correct Answer</th>
                            <th>Actions</th>
                          </tr>
                        </thead>

                        <tbody>
                          {questions.map((question) => (
                            <tr key={question.question_id}>
                              <td>{question.question_order}</td>
                              <td>
                                <strong>{question.question_text}</strong>
                              </td>

                              <td>
                                <div className="admin-question-option-thumbs">
                                  {(question.answer_options || []).map(
                                    (option) => (
                                      <span
                                        key={option.id}
                                        title={`Option ${option.id}`}
                                      >
                                        {option.id}

                                        {option.image_url ? (
                                          <img
                                            src={getVideoUrl(option.image_url)}
                                            alt={`Option ${option.id}`}
                                          />
                                        ) : null}
                                      </span>
                                    )
                                  )}
                                </div>
                              </td>

                              <td>{question.correct_answer}</td>

                              <td>
                                <div className="admin-table-actions">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openEditQuestion(question)
                                    }
                                  >
                                    Edit
                                  </button>

                                  <button
                                    type="button"
                                    className="delete"
                                    onClick={() =>
                                      handleDeleteQuestion(
                                        question.question_id
                                      )
                                    }
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}
            </>
          )}

          {showQuestionForm && (
            <div className="admin-modal-overlay">
              <section className="admin-modal-card admin-question-modal">
                <div className="admin-modal-heading">
                  <div>
                    <h2>
                      {editingQuestionId ? "Edit Question" : "Add Question"}
                    </h2>
                    <p>Enter a question and upload three option images.</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowQuestionForm(false)}
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleQuestionSubmit}>
                  <div className="admin-form-grid">
                    <div className="admin-form-group full-width">
                      <label>Lesson *</label>

                      <select
                        value={questionForm.lesson_id}
                        onChange={(event) =>
                          setQuestionForm({
                            ...questionForm,
                            lesson_id: event.target.value,
                          })
                        }
                        disabled={Boolean(editingQuestionId)}
                        required
                      >
                        <option value="">Select a lesson</option>

                        {lessons.map((lesson) => (
                          <option
                            key={lesson.lesson_id}
                            value={lesson.lesson_id}
                          >
                            {lesson.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="admin-form-group full-width">
                      <label>Question *</label>

                      <textarea
                        value={questionForm.question_text}
                        onChange={(event) =>
                          setQuestionForm({
                            ...questionForm,
                            question_text: event.target.value,
                          })
                        }
                        placeholder="Enter your question..."
                        rows={3}
                        required
                      />
                    </div>

                    {questionForm.answer_options.map((option, index) => (
                      <div className="admin-form-group" key={option.id}>
                        <label>Option {option.id} Image *</label>

                        <input
                          type="file"
                          accept="image/png,image/jpeg,.jpg,.jpeg,.png"
                          onChange={(event) =>
                            handleQuestionImageSelection(
                              index,
                              event.target.files?.[0] || null
                            )
                          }
                          disabled={saving}
                        />

                        {questionImageFiles[index] ? (
                          <small className="admin-video-selected">
                            Selected: {questionImageFiles[index].name}
                          </small>
                        ) : option.image_url ? (
                          <img
                            className="admin-question-preview"
                            src={getVideoUrl(option.image_url)}
                            alt={`Option ${option.id}`}
                          />
                        ) : (
                          <small>PNG / JPG · Maximum 5 MB</small>
                        )}
                      </div>
                    ))}

                    <div className="admin-form-group">
                      <label>Correct Answer *</label>

                      <select
                        value={questionForm.correct_answer}
                        onChange={(event) =>
                          setQuestionForm({
                            ...questionForm,
                            correct_answer: event.target.value,
                          })
                        }
                        required
                      >
                        {["A", "B", "C"].map((option) => (
                          <option key={option} value={option}>
                            Option {option}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="admin-form-group">
                      <label>Question Order (1–5)</label>

                      <input
                        type="number"
                        min="1"
                        max="5"
                        step="1"
                        value={questionForm.question_order}
                        onChange={(event) => {
                          const value = event.target.value;

                          setQuestionForm({
                            ...questionForm,
                            question_order:
                              value === ""
                                ? ""
                                : Math.min(5, Math.max(1, Number(value))),
                          });
                        }}
                        onBlur={() => {
                          const value = Number(questionForm.question_order);

                          setQuestionForm({
                            ...questionForm,
                            question_order:
                              !Number.isInteger(value) || value < 1
                                ? 1
                                : value > 5
                                ? 5
                                : value,
                          });
                        }}
                        required
                      />

                      <small>Enter a whole number from 1 to 5.</small>
                    </div>
                  </div>

                  <div className="admin-form-actions">
                    <button
                      type="button"
                      className="admin-cancel-btn"
                      onClick={() => setShowQuestionForm(false)}
                      disabled={saving}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="admin-submit-btn"
                      disabled={saving}
                    >
                      {saving
                        ? "Uploading / Saving..."
                        : editingQuestionId
                        ? "Update Question"
                        : "Add Question"}
                    </button>
                  </div>
                </form>
              </section>
            </div>
          )}

          {showCategoryForm && (
            <div className="admin-modal-overlay">
              <section className="admin-modal-card">
                <div className="admin-modal-heading">
                  <div>
                    <h2>
                      {editingCategoryId ? "Edit Category" : "Add Category"}
                    </h2>
                    <p>Enter category details.</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowCategoryForm(false)}
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleCategorySubmit}>
                  <div className="admin-form-grid">
                    <div className="admin-form-group full-width">
                      <label>Category Name *</label>

                      <input
                        type="text"
                        value={categoryForm.category_name}
                        onChange={(event) =>
                          setCategoryForm({
                            ...categoryForm,
                            category_name: event.target.value,
                          })
                        }
                        placeholder="Enter category name"
                        maxLength={100}
                        required
                      />
                    </div>

                    <div className="admin-form-group full-width">
                      <label>Description</label>

                      <textarea
                        value={categoryForm.description}
                        onChange={(event) =>
                          setCategoryForm({
                            ...categoryForm,
                            description: event.target.value,
                          })
                        }
                        placeholder="Enter category description"
                        rows={3}
                      />
                    </div>

                    <div className="admin-form-group full-width">
                      <label className="admin-checkbox-label">
                        <input
                          type="checkbox"
                          checked={categoryForm.is_active}
                          onChange={(event) =>
                            setCategoryForm({
                              ...categoryForm,
                              is_active: event.target.checked,
                            })
                          }
                        />
                        Active Category
                      </label>
                    </div>
                  </div>

                  <div className="admin-form-actions">
                    <button
                      type="button"
                      className="admin-cancel-btn"
                      onClick={() => setShowCategoryForm(false)}
                      disabled={saving}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="admin-submit-btn"
                      disabled={saving}
                    >
                      {saving
                        ? "Saving..."
                        : editingCategoryId
                        ? "Update Category"
                        : "Add Category"}
                    </button>
                  </div>
                </form>
              </section>
            </div>
          )}

          {showTopicForm && (
            <div className="admin-modal-overlay">
              <section className="admin-modal-card">
                <div className="admin-modal-heading">
                  <div>
                    <h2>
                      {editingTopicId ? "Edit Topic" : "Add Topic"}
                    </h2>
                    <p>Manage category subtopics.</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowTopicForm(false)}
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleTopicSubmit}>
                  <div className="admin-form-grid">
                    <div className="admin-form-group full-width">
                      <label>Category *</label>

                      <select
                        value={topicForm.category_id}
                        onChange={(event) =>
                          setTopicForm({
                            ...topicForm,
                            category_id: event.target.value,
                          })
                        }
                        required
                      >
                        <option value="">Select Category</option>

                        {activeCategories.map((category) => (
                          <option
                            key={category.category_id}
                            value={category.category_id}
                          >
                            {category.category_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="admin-form-group full-width">
                      <label>Topic Name *</label>

                      <input
                        type="text"
                        value={topicForm.topic_name}
                        onChange={(event) =>
                          setTopicForm({
                            ...topicForm,
                            topic_name: event.target.value,
                          })
                        }
                        placeholder="Enter topic name"
                        maxLength={150}
                        required
                      />
                    </div>

                    <div className="admin-form-group full-width">
                      <label>Description</label>

                      <textarea
                        value={topicForm.description}
                        onChange={(event) =>
                          setTopicForm({
                            ...topicForm,
                            description: event.target.value,
                          })
                        }
                        placeholder="Enter topic description"
                        rows={3}
                      />
                    </div>

                    <div className="admin-form-group full-width">
                      <label className="admin-checkbox-label">
                        <input
                          type="checkbox"
                          checked={topicForm.is_active}
                          onChange={(event) =>
                            setTopicForm({
                              ...topicForm,
                              is_active: event.target.checked,
                            })
                          }
                        />
                        Active Topic
                      </label>
                    </div>
                  </div>

                  <div className="admin-form-actions">
                    <button
                      type="button"
                      className="admin-cancel-btn"
                      onClick={() => setShowTopicForm(false)}
                      disabled={saving}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="admin-submit-btn"
                      disabled={saving || activeCategories.length === 0}
                    >
                      {saving
                        ? "Saving..."
                        : editingTopicId
                        ? "Update Topic"
                        : "Add Topic"}
                    </button>
                  </div>
                </form>
              </section>
            </div>
          )}

          {showLessonForm && (
            <div className="admin-modal-overlay">
              <section className="admin-modal-card">
                <div className="admin-modal-heading">
                  <div>
                    <h2>
                      {editingLessonId ? "Edit Lesson" : "Add Lesson"}
                    </h2>
                    <p>Add a learning video to a topic.</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowLessonForm(false);
                      setSelectedVideo(null);
                    }}
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleLessonSubmit}>
                  <div className="admin-form-grid">
                    <div className="admin-form-group full-width">
                      <label>Life Skill Topic *</label>

                      <select
                        value={lessonForm.topic_id}
                        onChange={(event) =>
                          setLessonForm({
                            ...lessonForm,
                            topic_id: event.target.value,
                          })
                        }
                        required
                      >
                        <option value="">Select a topic</option>

                        {activeTopics.map((topic) => (
                          <option
                            key={topic.topic_id}
                            value={topic.topic_id}
                          >
                            {getCategoryName(topic.category_id)} —{" "}
                            {topic.topic_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="admin-form-group full-width">
                      <label>Lesson Title *</label>

                      <input
                        type="text"
                        value={lessonForm.title}
                        onChange={(event) =>
                          setLessonForm({
                            ...lessonForm,
                            title: event.target.value,
                          })
                        }
                        placeholder="Enter lesson title"
                        maxLength={150}
                        required
                      />
                    </div>

                    <div className="admin-form-group full-width">
                      <label>Upload Google Flow Video (MP4)</label>

                      <input
                        type="file"
                        accept=".mp4,video/mp4"
                        onChange={handleVideoSelection}
                        disabled={saving}
                      />

                      {selectedVideo && (
                        <small className="admin-video-selected">
                          Selected: {selectedVideo.name} (
                          {(selectedVideo.size / (1024 * 1024)).toFixed(1)}{" "}
                          MB)
                        </small>
                      )}

                      <small>
                        Select an MP4 video from your computer. Maximum size:
                        200 MB.
                      </small>
                    </div>

                    <div className="admin-form-group full-width">
                      <label>Video URL (Optional)</label>

                      <input
                        type="url"
                        value={lessonForm.video_url}
                        onChange={(event) =>
                          setLessonForm({
                            ...lessonForm,
                            video_url: event.target.value,
                          })
                        }
                        placeholder="Or enter an existing video URL"
                        maxLength={500}
                        disabled={Boolean(selectedVideo) || saving}
                      />

                      <small>
                        If you select an MP4 file, the uploaded file will be
                        used instead of this URL.
                      </small>
                    </div>

                    <div className="admin-form-group full-width">
                      <label>Lesson Script</label>

                      <textarea
                        value={lessonForm.lesson_script}
                        onChange={(event) =>
                          setLessonForm({
                            ...lessonForm,
                            lesson_script: event.target.value,
                          })
                        }
                        placeholder="Enter lesson script..."
                        rows={4}
                      />
                    </div>

                    <div className="admin-form-group full-width">
                      <label className="admin-checkbox-label">
                        <input
                          type="checkbox"
                          checked={lessonForm.is_premium}
                          onChange={(event) =>
                            setLessonForm({
                              ...lessonForm,
                              is_premium: event.target.checked,
                            })
                          }
                        />
                        Premium Lesson
                      </label>
                    </div>
                  </div>

                  <div className="admin-form-actions">
                    <button
                      type="button"
                      className="admin-cancel-btn"
                      onClick={() => {
                        setShowLessonForm(false);
                        setSelectedVideo(null);
                      }}
                      disabled={saving}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="admin-submit-btn"
                      disabled={saving || activeTopics.length === 0}
                    >
                      {saving
                        ? "Uploading / Saving..."
                        : editingLessonId
                        ? "Update Lesson"
                        : "Add Lesson"}
                    </button>
                  </div>
                </form>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default AdminContent;