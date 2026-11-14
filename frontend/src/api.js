
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

export async function getAdminCategories() {
  return apiRequest("/admin/life-skill-categories/", {
    method: "GET",
  });
}

export async function getAdminCategory(categoryId) {
  return apiRequest(
    `/admin/life-skill-categories/${encodeURIComponent(categoryId)}`,
    { method: "GET" }
  );
}

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

export async function getAdminLifeSkillTopic(topicId) {
  return apiRequest(
    `/admin/life-skill-topics/${encodeURIComponent(topicId)}`,
    { method: "GET" }
  );
}

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

export async function getAdminLessons() {
  return apiRequest("/admin/lessons/", {
    method: "GET",
  });
}

export async function getAdminLesson(lessonId) {
  return apiRequest(
    `/admin/lessons/${encodeURIComponent(lessonId)}`,
    { method: "GET" }
  );
}

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

export async function deleteAdminLesson(lessonId) {
  return apiRequest(
    `/admin/lessons/${encodeURIComponent(lessonId)}`,
    { method: "DELETE" }
  );
}

// ========================================
// CHILD - SELECTED TOPICS
// ========================================

export async function getChildSelectedTopics(childId) {
  if (!childId) {
    throw new Error("Please select a child.");
  }

  return apiRequest(
    `/parent/children/${encodeURIComponent(childId)}/selected-topics`,
    { method: "GET" }
  );
}

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

export async function getParentProfile() {
  return apiRequest("/auth/me", {
    method: "GET",
  });
}

export async function updateParentProfile(profileData) {
  return apiRequest("/auth/profile", {
    method: "PUT",
    body: JSON.stringify({
      name: profileData.name.trim(),
      phone: profileData.phone?.trim() || null,
    }),
  });
}

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
// CHILD - VIDEO COMPLETION
// ========================================

export async function completeChildVideo(
  childId,
  lessonId,
  idempotencyKey
) {
  if (!childId || !lessonId) {
    throw new Error("Child ID and Lesson ID are required.");
  }

  if (!idempotencyKey?.trim()) {
    throw new Error("Idempotency key is required.");
  }

  return apiRequest(
    `/admin/lessons/child/${encodeURIComponent(childId)}/lessons/${encodeURIComponent(lessonId)}/video-complete`,
    {
      method: "POST",
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
    }
  );
}

// ========================================
// CHILD - AUTOMATICALLY CHECK QUIZ ANSWERS
// ========================================

export async function checkChildAnswers(
  childId,
  lessonId,
  answers,
  idempotencyKey
) {
  if (!childId || !lessonId) {
    throw new Error("Child ID and Lesson ID are required.");
  }

  if (!Array.isArray(answers) || answers.length === 0) {
    throw new Error("Please select your answers.");
  }

  if (!idempotencyKey?.trim()) {
    throw new Error("Idempotency key is required.");
  }

  return apiRequest(
    `/child/lessons/${encodeURIComponent(childId)}/${encodeURIComponent(lessonId)}/check-answers`,
    {
      method: "POST",
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
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
// PARENT - GET RECENT LEARNING ACTIVITIES
// ========================================

export async function getRecentActivities() {
  return apiRequest("/parent/activities/recent", {
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

// ========================================
// ADMIN - PARENT MANAGEMENT
// ========================================

export async function getAdminParents(search = "") {
  const query = search.trim()
    ? `?search=${encodeURIComponent(search.trim())}`
    : "";

  return apiRequest(`/admin/management/parents${query}`, {
    method: "GET",
  });
}

export async function getAdminParent(parentId) {
  return apiRequest(
    `/admin/management/parents/${encodeURIComponent(parentId)}`,
    {
      method: "GET",
    }
  );
}

export async function updateAdminParent(parentId, parentData) {
  return apiRequest(
    `/admin/management/parents/${encodeURIComponent(parentId)}`,
    {
      method: "PUT",
      body: JSON.stringify(parentData),
    }
  );
}

// ========================================
// ADMIN - CHILD MANAGEMENT
// ========================================

export async function getAdminChildren(search = "") {
  const query = search.trim()
    ? `?search=${encodeURIComponent(search.trim())}`
    : "";

  return apiRequest(`/admin/management/children${query}`, {
    method: "GET",
  });
}

export async function getAdminChild(childId) {
  return apiRequest(
    `/admin/management/children/${encodeURIComponent(childId)}`,
    { method: "GET" }
  );
}

export async function updateAdminChild(childId, childData) {
  return apiRequest(
    `/admin/management/children/${encodeURIComponent(childId)}`,
    {
      method: "PUT",
      body: JSON.stringify(childData),
    }
  );
}

// ========================================
// SUBSCRIPTION - GET AVAILABLE PLANS
// ========================================

export async function getSubscriptionPlans() {
  return apiRequest("/subscriptions/plans/", {
    method: "GET",
  });
}

// ========================================
// SUBSCRIPTION - GET CURRENT PARENT PLAN
// ========================================

export async function getMySubscription() {
  return apiRequest("/subscriptions/my-subscription/", {
    method: "GET",
  });
}

// ========================================
// SUBSCRIPTION - CREATE STRIPE CHECKOUT
// ========================================

export async function createStripeCheckout(planId, idempotencyKey) {
  if (!planId) {
    throw new Error("Please select a subscription plan.");
  }

  if (!idempotencyKey?.trim()) {
    throw new Error("Idempotency key is required.");
  }

  return apiRequest("/subscriptions/stripe-checkout/", {
    method: "POST",
    headers: {
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      plan_id: Number(planId),
    }),
  });
}
