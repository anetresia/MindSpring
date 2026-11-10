
export const API_URL = "http://127.0.0.1:8000";

// ========================================
// GET SAVED ACCESS TOKEN
// ========================================

function getAccessToken() {
  return (
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token")
  );
}

// ========================================
// COMMON API RESPONSE HANDLER
// ========================================

async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    let message = "Something went wrong. Please try again.";

    if (typeof data.detail === "string") {
      message = data.detail;
    } else if (Array.isArray(data.detail)) {
      message = data.detail
        .map((error) => error.msg)
        .join(", ");
    } else if (data.message) {
      message = data.message;
    }

    throw new Error(message);
  }

  return data;
}

// ========================================
// COMMON AUTHENTICATED HEADERS
// ========================================

export function getAuthHeaders(includeContentType = true) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("Please login to continue.");
  }

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  if (includeContentType) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

// ========================================
// COMMON API REQUEST
// ========================================

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(
        options.body !== undefined &&
        !(options.body instanceof FormData)
      ),
      ...options.headers,
    },
  });

  return handleResponse(response);
}

// ========================================
// PARENT REGISTRATION - SEND OTP
// ========================================

export async function registerParent(parentData) {
  const response = await fetch(`${API_URL}/auth/send-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: parentData.name.trim(),
      email: parentData.email.trim(),
      password: parentData.password,
    }),
  });

  return handleResponse(response);
}

// ========================================
// VERIFY OTP
// ========================================

export async function verifyParentOtp({ email, otp }) {
  const response = await fetch(`${API_URL}/auth/verify-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: email.trim(),
      otp: otp.trim(),
    }),
  });

  return handleResponse(response);
}

// ========================================
// RESEND OTP
// ========================================

export async function resendParentOtp(email) {
  const response = await fetch(
    `${API_URL}/auth/resend-otp?email=${encodeURIComponent(
      email.trim()
    )}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return handleResponse(response);
}

// ========================================
// PARENT LOGIN
// ========================================

export async function loginParent({ email, password }) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: email.trim(),
      password,
    }),
  });

  return handleResponse(response);
}

// ========================================
// GOOGLE LOGIN / REGISTRATION
// ========================================

export async function googleLogin(credential) {
  const response = await fetch(`${API_URL}/auth/google`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      credential,
    }),
  });

  return handleResponse(response);
}

// ========================================
// GET ALL CHILDREN
// ========================================

export async function getChildren() {
  return apiRequest("/parent/children", {
    method: "GET",
  });
}

// ========================================
// CREATE CHILD
// ========================================

export async function createChild(childData) {
  return apiRequest("/parent/children", {
    method: "POST",
    body: JSON.stringify(childData),
  });
}

// ========================================
// GET CHILD BY ID
// ========================================

export async function getChild(childId) {
  return apiRequest(
    `/parent/children/${encodeURIComponent(childId)}`,
    { method: "GET" }
  );
}

// ========================================
// UPDATE CHILD
// ========================================

export async function updateChild(childId, childData) {
  return apiRequest(
    `/parent/children/${encodeURIComponent(childId)}`,
    {
      method: "PUT",
      body: JSON.stringify(childData),
    }
  );
}

// ========================================
// DELETE CHILD
// ========================================

export async function deleteChild(childId) {
  return apiRequest(
    `/parent/children/${encodeURIComponent(childId)}`,
    { method: "DELETE" }
  );
}

// ========================================
// GET LEARNING PREFERENCES
// ========================================

export async function getLearningPreferences(childId) {
  if (!childId) {
    throw new Error("Please select a child.");
  }

  return apiRequest(
    `/parent/children/${encodeURIComponent(childId)}/learning-preferences`,
    { method: "GET" }
  );
}

// ========================================
// GET LEARNING PREFERENCE OPTIONS
// ========================================

export async function getLearningPreferenceOptions() {
  return apiRequest("/parent/learning-preference-options", {
    method: "GET",
  });
}

// ========================================
// UPDATE LEARNING PREFERENCES
// ========================================

export async function updateLearningPreferences(
  childId,
  preferences
) {
  if (!childId) {
    throw new Error("Please select a child.");
  }

  return apiRequest(
    `/parent/children/${encodeURIComponent(childId)}/learning-preferences`,
    {
      method: "PUT",
      body: JSON.stringify({
        learning_method: preferences.learningMethod,
        communication_method: preferences.communicationMethod,
      }),
    }
  );
}

// ========================================
// GET LIFE SKILL TOPICS - PARENT
// ========================================

export async function getLifeSkillTopics(categoryId = null) {
  const query =
    categoryId !== null
      ? `?category_id=${encodeURIComponent(categoryId)}`
      : "";

  return apiRequest(
    `/parent/life-skill-topics/${query}`,
    { method: "GET" }
  );
}

// ========================================
// ADMIN - CATEGORY MANAGEMENT
// ========================================

// GET ALL CATEGORIES

export async function getAdminCategories() {
  return apiRequest("/admin/life-skill-categories/", {
    method: "GET",
  });
}

// GET CATEGORY BY ID

export async function getAdminCategory(categoryId) {
  return apiRequest(
    `/admin/life-skill-categories/${encodeURIComponent(categoryId)}`,
    { method: "GET" }
  );
}

// CREATE CATEGORY

export async function createAdminCategory(categoryData) {
  if (!categoryData.category_name?.trim()) {
    throw new Error("Category name is required.");
  }

  return apiRequest("/admin/life-skill-categories/", {
    method: "POST",
    body: JSON.stringify({
      category_name: categoryData.category_name.trim(),
      description: categoryData.description?.trim() || "",
      is_active: categoryData.is_active ?? true,
    }),
  });
}

// UPDATE CATEGORY

export async function updateAdminCategory(
  categoryId,
  categoryData
) {
  return apiRequest(
    `/admin/life-skill-categories/${encodeURIComponent(categoryId)}`,
    {
      method: "PUT",
      body: JSON.stringify(categoryData),
    }
  );
}

// ========================================
// ADMIN - SUBTOPIC MANAGEMENT
// ========================================

// GET ALL SUBTOPICS

export async function getAdminLifeSkillTopics(categoryId = null) {
  const query =
    categoryId !== null
      ? `?category_id=${encodeURIComponent(categoryId)}`
      : "";

  return apiRequest(
    `/admin/life-skill-topics/${query}`,
    { method: "GET" }
  );
}

// GET SUBTOPIC BY ID

export async function getAdminLifeSkillTopic(topicId) {
  return apiRequest(
    `/admin/life-skill-topics/${encodeURIComponent(topicId)}`,
    { method: "GET" }
  );
}

// CREATE SUBTOPIC

export async function createAdminLifeSkillTopic(topicData) {
  if (!topicData.category_id || !topicData.topic_name?.trim()) {
    throw new Error("Category and subtopic name are required.");
  }

  return apiRequest("/admin/life-skill-topics/", {
    method: "POST",
    body: JSON.stringify({
      category_id: Number(topicData.category_id),
      topic_name: topicData.topic_name.trim(),
      description: topicData.description?.trim() || "",
      is_active: topicData.is_active ?? true,
    }),
  });
}

// UPDATE SUBTOPIC

export async function updateAdminLifeSkillTopic(
  topicId,
  topicData
) {
  return apiRequest(
    `/admin/life-skill-topics/${encodeURIComponent(topicId)}`,
    {
      method: "PUT",
      body: JSON.stringify(topicData),
    }
  );
}

// ========================================
// ADMIN - LESSON / VIDEO MANAGEMENT
// ========================================

// GET ALL LESSONS

export async function getAdminLessons() {
  return apiRequest("/admin/lessons/", {
    method: "GET",
  });
}

// GET LESSON BY ID

export async function getAdminLesson(lessonId) {
  return apiRequest(
    `/admin/lessons/${encodeURIComponent(lessonId)}`,
    { method: "GET" }
  );
}

// CREATE LESSON

export async function createAdminLesson(lessonData) {
  if (
    !lessonData.topic_id ||
    !lessonData.title?.trim() ||
    !lessonData.video_url?.trim()
  ) {
    throw new Error("Please fill all required lesson fields.");
  }

  return apiRequest("/admin/lessons/", {
    method: "POST",
    body: JSON.stringify({
      topic_id: Number(lessonData.topic_id),
      title: lessonData.title.trim(),
      video_url: lessonData.video_url.trim(),
      lesson_script: lessonData.lesson_script || "",
      is_premium: Boolean(lessonData.is_premium),
    }),
  });
}

// UPDATE LESSON

export async function updateAdminLesson(
  lessonId,
  lessonData
) {
  return apiRequest(
    `/admin/lessons/${encodeURIComponent(lessonId)}`,
    {
      method: "PUT",
      body: JSON.stringify({
        ...lessonData,
        ...(lessonData.topic_id !== undefined && {
          topic_id: Number(lessonData.topic_id),
        }),
      }),
    }
  );
}

// DELETE LESSON

export async function deleteAdminLesson(lessonId) {
  return apiRequest(
    `/admin/lessons/${encodeURIComponent(lessonId)}`,
    { method: "DELETE" }
  );
}

// ========================================
// CHILD - SELECTED TOPICS
// ========================================

// GET CHILD'S SELECTED TOPICS

export async function getChildSelectedTopics(childId) {
  if (!childId) {
    throw new Error("Please select a child.");
  }

  return apiRequest(
    `/parent/children/${encodeURIComponent(childId)}/selected-topics`,
    { method: "GET" }
  );
}

// ADD TOPIC FOR CHILD

export async function addChildSelectedTopic(childId, topicId) {
  if (!childId || !topicId) {
    throw new Error("Child ID and Topic ID are required.");
  }

  return apiRequest(
    `/parent/children/${encodeURIComponent(childId)}/selected-topics`,
    {
      method: "POST",
      body: JSON.stringify({
        topic_id: Number(topicId),
      }),
    }
  );
}

// REMOVE SELECTED TOPIC

export async function removeChildSelectedTopic(childId, topicId) {
  if (!childId || !topicId) {
    throw new Error("Child ID and Topic ID are required.");
  }

  return apiRequest(
    `/parent/children/${encodeURIComponent(childId)}/selected-topics/${encodeURIComponent(topicId)}`,
    { method: "DELETE" }
  );
}

// ========================================
// PARENT PROFILE
// ========================================

// GET PARENT PROFILE

export async function getParentProfile() {
  return apiRequest("/auth/me", {
    method: "GET",
  });
}

// UPDATE PARENT PROFILE

export async function updateParentProfile(profileData) {
  return apiRequest("/auth/profile", {
    method: "PUT",
    body: JSON.stringify({
      name: profileData.name.trim(),
      phone: profileData.phone?.trim() || null,
    }),
  });
}

// UPLOAD PARENT PROFILE IMAGE

export async function uploadParentProfileImage(imageFile) {
  const formData = new FormData();
  formData.append("file", imageFile);

  const response = await fetch(`${API_URL}/auth/profile/image`, {
    method: "POST",
    headers: getAuthHeaders(false),
    body: formData,
  });

  return handleResponse(response);
}

// ========================================
// CHILD - GET LESSONS BY SELECTED TOPIC
// ========================================

export async function getChildTopicLessons(childId, topicId) {
  if (!childId || !topicId) {
    throw new Error("Child ID and Topic ID are required.");
  }

  return apiRequest(
    `/admin/lessons/child/${encodeURIComponent(childId)}/topics/${encodeURIComponent(topicId)}`,
    {
      method: "GET",
    }
  );
}

// ========================================
// CHILD - GET QUESTIONS AFTER VIDEO
// ========================================

export async function getChildLessonQuestions(childId, lessonId) {
  if (!childId || !lessonId) {
    throw new Error("Child ID and Lesson ID are required.");
  }

  return apiRequest(
    `/child/lessons/${encodeURIComponent(childId)}/${encodeURIComponent(lessonId)}/questions`,
    {
      method: "GET",
    }
  );
}

// ========================================
// CHILD - AUTOMATICALLY CHECK QUIZ ANSWERS
// ========================================

export async function checkChildAnswers(
  childId,
  lessonId,
  answers
) {
  if (!childId || !lessonId) {
    throw new Error("Child ID and Lesson ID are required.");
  }

  if (!Array.isArray(answers) || answers.length === 0) {
    throw new Error("Please select your answers.");
  }

  return apiRequest(
    `/child/lessons/${encodeURIComponent(childId)}/${encodeURIComponent(lessonId)}/check-answers`,
    {
      method: "POST",
      body: JSON.stringify(answers),
    }
  );
}

// ========================================
// PARENT - GET EACH CHILD'S TOTAL STARS
// ========================================

export async function getChildrenRewardTotals() {
  return apiRequest("/parent/rewards/children", {
    method: "GET",
  });
}

// ========================================
// PARENT - GET SELECTED CHILD'S REWARDS
// ========================================

export async function getChildRewards(childId) {
  if (!childId) {
    throw new Error("Please select a child.");
  }

  return apiRequest(
    `/parent/rewards/${encodeURIComponent(childId)}`,
    {
      method: "GET",
    }
  );
}
