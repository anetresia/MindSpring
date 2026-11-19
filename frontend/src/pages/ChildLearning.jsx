
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles, Star, X } from "lucide-react";

import {
  useParams,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  getChild,
  getChildRewards,
  getChildSelectedTopics,
  getChildTopicLessons,
  getChildLessonQuestions,
  completeChildVideo,
  checkChildAnswers,
  checkChildVoiceAnswer,
  checkChildVoiceCompletion,
  startLearningSession,
  sendLearningSessionHeartbeat,
  stopLearningSession,
  stopLearningSessionOnExit,
  API_URL,
} from "../api";

import mindSpringLogo from "../assets/mindspring-logo.png";
import brushingTeethIllustration from "../assets/lesson-brushing-teeth.svg";
import combingHairIllustration from "../assets/lesson-combing-hair.svg";
import learningBook from "../assets/lessons-icon.png";
import learningClapper from "../assets/watch-videos-icon.png";
import activityRewardGirl from "../assets/activity-reward-girl.png";

import "../styles/child-learning.css";

function getLessonIllustration(lesson, topic) {
  for (const title of [lesson?.title, topic?.topic_name || topic?.name || topic?.title]) {
    if (/\b(?:tooth|teeth|dental|toothbrush)\b/i.test(title || "")) {
      return brushingTeethIllustration;
    }
    if (/\b(?:hair|comb(?:ing)?)\b/i.test(title || "")) {
      return combingHairIllustration;
    }
  }

  return learningBook;
}

function ChildLearning() {
  const { childId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const videoSectionRef = useRef(null);
  const rewardsDialogRef = useRef(null);
  const attemptKeyRef = useRef(null);
  const videoEndedRef = useRef(false);

  // Learning timer refs
  const timerStartedRef = useRef(false);
  const timerStartRequestRef = useRef(false);
  const timerLockedRef = useRef(false);
  const leavingLearningRef = useRef(false);
  const previousRemainingSecondsRef = useRef(null);
  const fiveMinuteWarningShownRef = useRef(false);
  const oneMinuteWarningShownRef = useRef(false);

  // Voice recording refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const mediaStreamRef = useRef(null);
  const recordingQuestionRef = useRef(null);

  const [timerStarted, setTimerStarted] = useState(false);
  const [learningLimitReached, setLearningLimitReached] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [timerPopup, setTimerPopup] = useState(null);

  // Voice states
  const [recordingQuestionId, setRecordingQuestionId] = useState(null);
  const [voiceCheckingQuestionId, setVoiceCheckingQuestionId] = useState(null);
  const [voiceFeedback, setVoiceFeedback] = useState({});
  const [voiceErrors, setVoiceErrors] = useState({});
  const [voiceAnswers, setVoiceAnswers] = useState({});

  // Create one idempotency key for each lesson attempt.
  function createAttemptKey() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    return `${childId}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;
  }

  const [child, setChild] = useState(location.state?.child || null);
  const [rewardBalance, setRewardBalance] = useState(null);
  const [topics, setTopics] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [topicLessonGroups, setTopicLessonGroups] = useState([]);
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0);

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

  const [showRewardsPopup, setShowRewardsPopup] = useState(false);

  const [error, setError] = useState("");
  const [questionError, setQuestionError] = useState("");

  // ========================================
  // VOICE - STOP MEDIA STREAM
  // ========================================

  function stopMediaStream() {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });

      mediaStreamRef.current = null;
    }
  }

  // ========================================
  // VOICE - CHECK ANSWER
  // ========================================

  async function processVoiceAnswer(questionId, audioBlob) {
    if (!audioBlob || audioBlob.size === 0) {
      setVoiceErrors((previous) => ({
        ...previous,
        [questionId]: "No audio recorded. Please try again.",
      }));
      return;
    }

    const lessonId = currentLesson?.lesson_id;

    if (!lessonId) return;

    try {
      setVoiceCheckingQuestionId(questionId);

      setVoiceErrors((previous) => ({
        ...previous,
        [questionId]: "",
      }));

      setVoiceFeedback((previous) => ({
        ...previous,
        [questionId]: null,
      }));

      const response = await checkChildVoiceAnswer(
        childId,
        lessonId,
        questionId,
        audioBlob
      );

      if (currentLesson?.lesson_id !== lessonId) return;

      const result = response?.data || response;

      const transcript = String(
        result.transcribed_text ||
          result.transcript ||
          result.text ||
          ""
      ).trim();

      // No speech or an empty transcript is not a completed answer.
      if (!transcript) {
        setVoiceErrors((previous) => ({
          ...previous,
          [questionId]:
            result.message ||
            "I couldn't hear your answer. Please try again.",
        }));

        return;
      }

      const updatedVoiceAnswers = {
        ...voiceAnswers,
        [questionId]: transcript,
      };

      setVoiceAnswers(updatedVoiceAnswers);

      setVoiceFeedback((previous) => ({
        ...previous,
        [questionId]: {
          isCorrect: Boolean(result.is_correct),
          transcript,
          message: result.is_correct
            ? result.message || "Correct answer! Well done!"
            : result.message ||
              "Answer recorded. Moving to the next question.",
        },
      }));

      const allQuestionsAnswered =
        questions.length > 0 &&
        questions.every(
          (question) => Boolean(updatedVoiceAnswers[question.question_id])
        );

      if (allQuestionsAnswered) {
        await submitVoiceAnswersAutomatically(
          updatedVoiceAnswers,
          questions,
          lessonId
        );
      }
      // Wrong answers are recorded too, so the next unanswered question
      // appears automatically without asking the child to retry.
    } catch (err) {
      setVoiceErrors((previous) => ({
        ...previous,
        [questionId]:
          err.message ||
          "Unable to check your voice answer. Please try again.",
      }));
    } finally {
      setVoiceCheckingQuestionId(null);
    }
  }

  async function submitVoiceAnswersAutomatically(
    completedVoiceAnswers,
    currentQuestions,
    lessonId
  ) {
    if (checkingAnswers || learningLimitReached) return;

    try {
      setCheckingAnswers(true);
      setQuestionError("");

      if (!attemptKeyRef.current) {
        attemptKeyRef.current = createAttemptKey();
      }

      const answers = currentQuestions.map((question) => ({
        question_id: question.question_id,
        transcript: completedVoiceAnswers[question.question_id],
      }));

      const response = await checkChildVoiceCompletion(
        childId,
        lessonId,
        answers,
        attemptKeyRef.current
      );

      if (currentLesson?.lesson_id !== lessonId) return;

      const resultData = response?.data || response;
      setAnswerResults(resultData);
    } catch (err) {
      setQuestionError(
        err.message ||
          "Unable to save your voice answers. Please try again."
      );
    } finally {
      setCheckingAnswers(false);
    }
  }

  // ========================================
  // VOICE - START RECORDING
  // ========================================

  async function startVoiceRecording(questionId) {
    if (
      answerResults ||
      checkingAnswers ||
      learningLimitReached ||
      recordingQuestionId ||
      voiceCheckingQuestionId ||
      voiceAnswers[questionId] ||
      questionId !== currentVoiceQuestionId
    ) {
      return;
    }

    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setVoiceErrors((previous) => ({
        ...previous,
        [questionId]:
          "Your browser does not support voice recording. Please use a supported browser.",
      }));

      return;
    }

    try {
      setVoiceErrors((previous) => ({
        ...previous,
        [questionId]: "",
      }));

      setVoiceFeedback((previous) => ({
        ...previous,
        [questionId]: null,
      }));

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      mediaStreamRef.current = stream;

      let recorder;

      const preferredTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ];

      const supportedType = preferredTypes.find((type) =>
        MediaRecorder.isTypeSupported(type)
      );

      if (supportedType) {
        recorder = new MediaRecorder(stream, {
          mimeType: supportedType,
        });
      } else {
        recorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = recorder;
      recordingQuestionRef.current = questionId;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setVoiceErrors((previous) => ({
          ...previous,
          [questionId]: "Recording failed. Please try again.",
        }));

        setRecordingQuestionId(null);
        stopMediaStream();
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        audioChunksRef.current = [];

        stopMediaStream();

        setRecordingQuestionId(null);
        recordingQuestionRef.current = null;

        await processVoiceAnswer(questionId, audioBlob);
      };

      recorder.start();

      setRecordingQuestionId(questionId);
    } catch (err) {
      stopMediaStream();

      setRecordingQuestionId(null);

      let message = "Unable to access microphone. Please try again.";

      if (err.name === "NotAllowedError") {
        message =
          "Microphone permission denied. Please allow microphone access.";
      } else if (err.name === "NotFoundError") {
        message = "No microphone found on this device.";
      } else if (err.name === "NotReadableError") {
        message = "Microphone is currently being used by another application.";
      }

      setVoiceErrors((previous) => ({
        ...previous,
        [questionId]: message,
      }));
    }
  }

  // ========================================
  // VOICE - STOP RECORDING
  // ========================================

  function stopVoiceRecording() {
    const recorder = mediaRecorderRef.current;

    if (
      recorder &&
      recorder.state !== "inactive"
    ) {
      recorder.stop();
    }
  }

  // ========================================
  // VOICE - CLEANUP
  // ========================================

  useEffect(() => {
    return () => {
      const recorder = mediaRecorderRef.current;

      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.stop();
      }

      stopMediaStream();
    };
  }, []);

  // ========================================
  // LEARNING TIMER - STOP VIDEO AND RECORDING
  // ========================================

  function stopLearningMedia() {
    const video = document.querySelector(
      ".child-learning-main-video"
    );

    video?.pause();

    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }

    mediaRecorderRef.current = null;
    recordingQuestionRef.current = null;
    audioChunksRef.current = [];

    stopMediaStream();

    setRecordingQuestionId(null);
    setVoiceCheckingQuestionId(null);
  }

  

  function getRemainingLearningSeconds(response) {
    if (Number.isFinite(response.remaining_seconds)) {
      return Math.max(0, response.remaining_seconds);
    }

    const limitMinutes = Number(child?.daily_learning_limit);
    if (limitMinutes > 0 && Number.isFinite(response.total_seconds)) {
      return Math.max(0, limitMinutes * 60 - response.total_seconds);
    }

    return null;
  }

  function finishDailyLearning() {
    if (timerLockedRef.current) return;

    timerLockedRef.current = true;
    setLearningLimitReached(true);
    setRemainingSeconds(0);
    setTimerPopup(null);
    stopLearningMedia();
    void handleBackToDashboard();
  }

  // ========================================
  // LEARNING TIMER - START
  // ========================================

  async function handleVideoPlay(event) {
    if (timerLockedRef.current || leavingLearningRef.current) {
      event.currentTarget.pause();
      return;
    }

    if (timerStartedRef.current || timerStartRequestRef.current) return;

    timerStartRequestRef.current = true;

    try {
      const response = await startLearningSession(childId);

      const remaining = getRemainingLearningSeconds(response);

      if (response.limit_reached || remaining === 0) {
        finishDailyLearning();
        return;
      }

      timerStartedRef.current = true;
      setTimerStarted(true);

      if (remaining !== null) {
        setRemainingSeconds(remaining);
        previousRemainingSecondsRef.current = remaining;
      }
    } catch (err) {
      setError(
        err.message || "Unable to start your learning timer."
      );

      const video = document.querySelector(
        ".child-learning-main-video"
      );

      video?.pause();
    } finally {
      timerStartRequestRef.current = false;
    }
  }

  // ========================================
  // LEARNING TIMER - HEARTBEAT
  // ========================================

  useEffect(() => {
    if (!timerStarted || !childId || learningLimitReached) {
      return;
    }

    let active = true;

    const heartbeatInterval = window.setInterval(async () => {
      try {
        const response = await sendLearningSessionHeartbeat(childId);

        if (!active) return;

        const newRemainingSeconds = getRemainingLearningSeconds(response);

        if (response.limit_reached || newRemainingSeconds === 0) {
          finishDailyLearning();
        } else if (newRemainingSeconds !== null) {
          setRemainingSeconds(newRemainingSeconds);
        }
      } catch (err) {
        console.error("Learning timer heartbeat failed:", err);
      }
    }, 10000);

    return () => {
      active = false;
      window.clearInterval(heartbeatInterval);
    };
  }, [timerStarted, childId, learningLimitReached, child]);

  // ========================================
  // LEARNING TIMER - WARNING POPUPS
  // ========================================

  useEffect(() => {
    if (
      remainingSeconds === null ||
      learningLimitReached
    ) {
      return;
    }

    const previousSeconds = previousRemainingSecondsRef.current;

    if (previousSeconds === null) {
      previousRemainingSecondsRef.current = remainingSeconds;
      return;
    }

    // Show 5-minute warning only when crossing from above 5 minutes.
    if (
      previousSeconds > 300 &&
      remainingSeconds <= 300 &&
      remainingSeconds > 60 &&
      !fiveMinuteWarningShownRef.current
    ) {
      fiveMinuteWarningShownRef.current = true;
      setTimerPopup("five");
    }

    // Show 1-minute warning only when crossing from above 1 minute.
    if (
      previousSeconds > 60 &&
      remainingSeconds <= 60 &&
      remainingSeconds > 0 &&
      !oneMinuteWarningShownRef.current
    ) {
      oneMinuteWarningShownRef.current = true;
      setTimerPopup("one");
    }

    previousRemainingSecondsRef.current = remainingSeconds;
  }, [remainingSeconds, learningLimitReached]);

  // ========================================
  // LEARNING TIMER - PAGE EXIT
  // ========================================

  useEffect(() => {
    function handlePageHide() {
      if (timerStartedRef.current) {
        stopLearningSessionOnExit(childId);
      }
    }

    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);

      if (timerStartedRef.current) {
        stopLearningSessionOnExit(childId);
      }
    };
  }, [childId]);

  // ========================================
  // LOAD CHILD AND TOPICS
  // ========================================

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

        // Keep every selected topic and its lessons in a separate group.
        // Promise.all preserves the parent's selected topic order.
        const loadedTopicGroups = await Promise.all(
          topicData.map(async (topic) => {
            const lessonResponse = await getChildTopicLessons(
              childId,
              topic.topic_id
            );

            const topicLessons = Array.isArray(lessonResponse)
              ? lessonResponse
              : lessonResponse?.data || lessonResponse?.lessons || [];

            return {
              topic,
              lessons: topicLessons,
            };
          })
        );

        const availableTopicGroups = loadedTopicGroups.filter(
          (group) => group.lessons.length > 0
        );

        const firstGroup = availableTopicGroups[0];

        if (active) {
          setChild(childData);
          setTopics(topicData);
          setTopicLessonGroups(availableTopicGroups);
          setCurrentTopicIndex(0);
          setSelectedTopic(firstGroup?.topic || null);
          setLessons(firstGroup?.lessons || []);

          if (firstGroup?.lessons?.length > 0) {
            setCurrentLesson(firstGroup.lessons[0]);
            attemptKeyRef.current = createAttemptKey();
            videoEndedRef.current = false;
          } else {
            setCurrentLesson(null);
          }
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

  // Refresh the accumulated balance after either answer mode saves its result.
  useEffect(() => {
    if (!childId) return;

    let active = true;

    async function loadRewardBalance() {
      try {
        const rewards = await getChildRewards(childId);
        if (active) {
          setRewardBalance({
            childId,
            total: Number.isFinite(rewards?.total_stars) ? rewards.total_stars : null,
          });
        }
      } catch (err) {
        if (active) {
          setRewardBalance({ childId, total: null });
          console.error("Unable to load child rewards:", err);
        }
      }
    }

    loadRewardBalance();
    return () => {
      active = false;
    };
  }, [childId, answerResults]);

  // Show rewards only after the answer-checking request has completed.
  useEffect(() => {
    if (answerResults) {
      setShowRewardsPopup(true);
    }
  }, [answerResults]);

  useEffect(() => {
    const dialog = rewardsDialogRef.current;
    if (showRewardsPopup && answerResults && !timerPopup && !learningLimitReached && dialog && !dialog.open) {
      dialog.showModal();
    }
  }, [showRewardsPopup, answerResults, timerPopup, learningLimitReached]);

  // ========================================
  // SCROLL VIDEO SECTION
  // ========================================

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

  // ========================================
  // RESET QUESTION DATA
  // ========================================

  function resetQuestionData() {
    // Stop an active recording when changing lesson/topic.
    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }

    stopMediaStream();

    mediaRecorderRef.current = null;
    recordingQuestionRef.current = null;
    audioChunksRef.current = [];

    setRecordingQuestionId(null);
    setVoiceCheckingQuestionId(null);
    setVoiceFeedback({});
    setVoiceErrors({});
    setVoiceAnswers({});

    setQuestions([]);
    setSelectedAnswers({});
    setAnswerResults(null);
    setVideoCompleted(false);
    setQuestionsLoading(false);
    setCheckingAnswers(false);
    setQuestionError("");
  }

  // ========================================
  // SELECT TOPIC
  // ========================================

  async function handleTopicClick(topic) {
    // Children cannot jump ahead to a locked topic.
    const activeGroup = topicLessonGroups[currentTopicIndex];

    if (
      learningLimitReached ||
      !activeGroup ||
      Number(topic.topic_id) !== Number(activeGroup.topic.topic_id)
    ) {
      return;
    }

    // The current topic is already loaded. Keep its lessons visible.
    setSelectedTopic(activeGroup.topic);
    setLessons(activeGroup.lessons);
  }

  // ========================================
  // CHANGE CURRENT LESSON
  // ========================================

  function handleLessonClick(lesson) {
    if (learningLimitReached) return;

    if (currentLesson?.lesson_id === lesson.lesson_id) {
      videoSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      return;
    }

    resetQuestionData();

    setCurrentLesson(lesson);

    attemptKeyRef.current = createAttemptKey();
    videoEndedRef.current = false;
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
  // VIDEO COMPLETION AND LOAD QUESTIONS
  // ========================================

  async function handleVideoEnded() {
    if (
      !currentLesson ||
      videoCompleted ||
      videoEndedRef.current ||
      learningLimitReached
    ) {
      return;
    }

    const lessonId = currentLesson.lesson_id;

    if (!attemptKeyRef.current) {
      attemptKeyRef.current = createAttemptKey();
    }

    const idempotencyKey = attemptKeyRef.current;

    videoEndedRef.current = true;

    try {
      setQuestions([]);
      setSelectedAnswers({});
      setAnswerResults(null);
      setQuestionError("");
      setQuestionsLoading(true);

      setVoiceFeedback({});
      setVoiceErrors({});
      setVoiceAnswers({});

      await completeChildVideo(
        childId,
        lessonId,
        idempotencyKey
      );

      setVideoCompleted(true);

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
      videoEndedRef.current = false;

      setQuestionError(
        err.message ||
          "Unable to record video completion or load questions."
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
    if (
      !currentLesson ||
      checkingAnswers ||
      learningLimitReached
    ) {
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

      if (!attemptKeyRef.current) {
        attemptKeyRef.current = createAttemptKey();
      }

      const response = await checkChildAnswers(
        childId,
        lessonId,
        answers,
        attemptKeyRef.current
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

  // ========================================
  // SELECT IMAGE ANSWER
  // ========================================

  function handleAnswerSelect(questionId, optionId) {
    if (
      answerResults ||
      checkingAnswers ||
      learningLimitReached ||
      recordingQuestionId ||
      voiceCheckingQuestionId
    ) {
      return;
    }

    const updatedAnswers = {
      ...selectedAnswers,
      [questionId]: optionId,
    };

    setSelectedAnswers(updatedAnswers);

    const allQuestionsAnswered =
      questions.length > 0 &&
      questions.every(
        (question) => updatedAnswers[question.question_id]
      );

    if (allQuestionsAnswered) {
      submitAnswersAutomatically(updatedAnswers, questions);
    }
  }

  // ========================================
  // NEXT ACTIVITY AFTER REWARDS
  // ========================================

  function handleNextActivity() {
    setShowRewardsPopup(false);

    // Continue to the next lesson inside the current topic first.
    if (nextLesson) {
      resetQuestionData();
      setCurrentLesson(nextLesson);
      attemptKeyRef.current = createAttemptKey();
      videoEndedRef.current = false;
      return;
    }

    // Only after every lesson in this topic is completed, unlock next topic.
    if (nextTopicGroup) {
      resetQuestionData();
      setCurrentTopicIndex(nextTopicIndex);
      setSelectedTopic(nextTopicGroup.topic);
      setLessons(nextTopicGroup.lessons);
      setCurrentLesson(nextTopicGroup.lessons[0]);
      attemptKeyRef.current = createAttemptKey();
      videoEndedRef.current = false;
      return;
    }

    // All selected topics have been completed.
    handleBackToDashboard();
  }

  // ========================================
  // BACK TO DASHBOARD
  // ========================================

  async function handleBackToDashboard() {
    if (leavingLearningRef.current) return;
    leavingLearningRef.current = true;

    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }

    stopMediaStream();

    if (timerStartedRef.current) {
      try {
        await stopLearningSession(childId);
      } catch (err) {
        console.error("Unable to stop learning timer:", err);
      }

      timerStartedRef.current = false;
      setTimerStarted(false);
    }

    const dailyLearningCompleted = timerLockedRef.current;
    navigate(`/child-dashboard/${childId}`, {
      replace: dailyLearningCompleted,
      state: { child, dailyLearningCompleted },
    });
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

  const childName =
    child?.child_name || child?.name || "Friend";

  const childInitial = Array.from((child?.child_name || child?.name || "").trim())[0]?.toUpperCase();
  const currentRewardBalance = rewardBalance?.childId === childId ? rewardBalance : null;
  const totalStars = currentRewardBalance?.total;

  const isVoiceMode =
    String(child?.communication_method || "").toLowerCase() === "voice";

  const currentVoiceQuestionId =
    questions.find(
      (question) => !voiceAnswers[question.question_id]
    )?.question_id ?? null;

  const currentLessonIndex = lessons.findIndex(
    (lesson) => lesson.lesson_id === currentLesson?.lesson_id
  );
  const nextLesson =
    currentLessonIndex >= 0 ? lessons[currentLessonIndex + 1] : undefined;
  const nextTopicIndex = currentTopicIndex + 1;
  const nextTopicGroup = topicLessonGroups[nextTopicIndex];
  const hasNextActivity = Boolean(nextLesson || nextTopicGroup);
  const earnedStars = Math.max(
    0,
    Math.min(
      Number(answerResults?.score) || 0,
      Number(answerResults?.total_questions) || 0
    )
  );

  return (
    <main className="child-learning-page">
      <div className="child-learning-shell">

        {/* HEADER */}

        <header className="learning-hero">
          <div className="learning-topbar">
            <button
              type="button"
              className="child-learning-back-btn"
              onClick={handleBackToDashboard}
            >
              <ArrowLeft aria-hidden="true" /> Back to Dashboard
            </button>

            <div className="learning-logo">
              <img src={mindSpringLogo} alt="MindSpring" className="learning-logo-image" />
            </div>

            <div className="learning-hero-title-wrap">
              <h1><Sparkles aria-hidden="true" /> Learning Time</h1>
              <p>Watch, Learn and Do Fun Activities!</p>
            </div>

            <div className="learning-hero-decoration" aria-hidden="true">
              <img src={activityRewardGirl} alt="" />
            </div>

            <div className="learning-profile-actions">
              <div className="learning-child-pill">
                {childInitial && <span className="learning-avatar" aria-hidden="true">{childInitial}</span>}
                <strong>{childName}</strong>
              </div>

              <div className="learning-stars-pill" role="status" aria-atomic="true">
                <Star className="learning-total-star-icon" aria-hidden="true" />
                <strong>
                  {totalStars != null ? (
                    <><span className="learning-sr-only">Total earned stars: </span>{totalStars}</>
                  ) : currentRewardBalance ? (
                    <span title="Total earned stars unavailable">Unavailable</span>
                  ) : (
                    <span aria-label="Loading total earned stars">...</span>
                  )}
                </strong>
              </div>
            </div>
          </div>
        </header>

        {/* DAILY LEARNING LIMIT MESSAGE */}

        {learningLimitReached && (
          <div
            className="child-learning-warning"
            role="alert"
          >
            ⏰ Your daily learning time is over! Please come back tomorrow.
          </div>
        )}

        {/* TIMER DISPLAY */}

        {timerStarted && !learningLimitReached && (
          <div
            className="child-learning-warning"
            aria-live="polite"
          >
            ⏱️ Learning session is active.
            {remainingSeconds !== null && (
              <strong>
                {" "}
                Remaining time: {Math.ceil(remainingSeconds / 60)} minutes
              </strong>
            )}
          </div>
        )}

        {error && (
          <div className="child-learning-warning">
            {error}
          </div>
        )}

        {/* VIDEO AND ACTIVITY */}

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
                onPlay={handleVideoPlay}
                onEnded={handleVideoEnded}
              >
                <source
                  src={getVideoSource(currentLesson.video_url)}
                  type="video/mp4"
                />
                Your browser does not support video playback.
              </video>

              <div className="child-learning-video-description">
                <div>
                  <h3><img src={learningClapper} alt="" /> {currentLesson.title}</h3>
                  {currentLesson.lesson_script && <p>{currentLesson.lesson_script}</p>}
                </div>
                <img
                  className="learning-description-decoration"
                  src={getLessonIllustration(currentLesson, selectedTopic)}
                  alt=""
                />
              </div>
            </div>

            {/* ACTIVITY */}

            <aside className="child-learning-questions-section learning-panel">
              <div className="child-learning-questions-heading">
                <span>🌸</span>
                <h3>Activity</h3>
              </div>

              {!videoCompleted && (
                <div className="child-learning-empty-questions">
                  <span>📋</span>
                  <p>
                    Watch the complete video to see your activity!
                  </p>
                </div>
              )}

              {videoCompleted && questionsLoading && (
                <div className="child-learning-empty-questions">
                  <span>⏳</span>
                  <p>Loading your activity...</p>
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

                      const isCorrectOption = (option) =>
                        answerResults &&
                        correctAnswer === option.id;

                      const isWrongSelected = (option) =>
                        answerResults &&
                        selectedAnswer === option.id &&
                        !questionResult?.is_correct;

                      const voiceResult =
                        voiceFeedback[question.question_id];

                      const isRecording =
                        recordingQuestionId === question.question_id;

                      const isVoiceChecking =
                        voiceCheckingQuestionId === question.question_id;

                      return (
                        <div
                          className="child-learning-question-card"
                          key={question.question_id}
                        >
                          <h3 className="child-learning-question-text">
                            <span className="child-learning-question-number">{index + 1}</span>
                            <span>{question.question_text}</span>
                          </h3>

                          {/* IMAGE ANSWER OPTIONS - visible in both modes */}

                          <div className="child-learning-answer-options">
                            {(question.answer_options || []).map((option) => {
                              const isSelected =
                                selectedAnswer === option.id;

                              const optionIsCorrect =
                                isCorrectOption(option);

                              const optionIsWrong =
                                isWrongSelected(option);

                              const optionLabel = option.answer_text || option.id;
                              let optionClass =
                                "child-learning-answer-option";

                              if (optionIsCorrect) {
                                optionClass += " correct";
                              } else if (optionIsWrong) {
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
                                    isVoiceMode ||
                                    Boolean(answerResults) ||
                                    checkingAnswers ||
                                    learningLimitReached ||
                                    Boolean(recordingQuestionId) ||
                                    Boolean(voiceCheckingQuestionId)
                                  }
                                  aria-pressed={isSelected}
                                >
                                  <span className="child-learning-option-marker" aria-hidden="true">
                                    {isSelected && <Check />}
                                  </span>

                                  {option.image_url && (
                                    <img
                                      src={getQuestionImageSource(
                                        option.image_url
                                      )}
                                      alt=""
                                      className="child-learning-option-image"
                                    />
                                  )}

                                  <span className="child-learning-option-label">
                                    {optionLabel}
                                  </span>

                                  {optionIsCorrect && (
                                    <span className="child-learning-answer-feedback">
                                      <Check aria-hidden="true" /> Correct
                                    </span>
                                  )}

                                  {optionIsWrong && (
                                    <span className="child-learning-answer-feedback">
                                      <X aria-hidden="true" /> Try Again
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {/* VOICE ANSWER SECTION */}

                          {isVoiceMode && (
                            <div className="child-learning-voice-section">
                              <p className="child-learning-voice-instruction">
                                🎤 Or say your answer in Tamil or English
                              </p>

                              {!isRecording ? (
                                <button
                                  type="button"
                                  className="child-learning-voice-btn"
                                  onClick={() =>
                                    startVoiceRecording(question.question_id)
                                  }
                                  disabled={
                                    Boolean(answerResults) ||
                                    checkingAnswers ||
                                    learningLimitReached ||
                                    Boolean(recordingQuestionId) ||
                                    Boolean(voiceCheckingQuestionId) ||
                                    question.question_id !== currentVoiceQuestionId ||
                                    Boolean(voiceAnswers[question.question_id])
                                  }
                                >
                                  🎤 Speak Your Answer
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="child-learning-voice-btn recording"
                                  onClick={stopVoiceRecording}
                                >
                                  ⏹ Stop Recording
                                </button>
                              )}

                              {isRecording && (
                                <p className="child-learning-recording-message">
                                  🔴 Listening... Speak your answer now.
                                </p>
                              )}

                              {isVoiceChecking && (
                                <p className="child-learning-voice-loading">
                                  ⏳ Checking your voice answer...
                                </p>
                              )}

                              {voiceErrors[question.question_id] && (
                                <p
                                  className="child-learning-voice-error"
                                  role="alert"
                                >
                                  {voiceErrors[question.question_id]}
                                </p>
                              )}

                              {voiceResult && (
                                <div
                                  className={`child-learning-voice-feedback ${
                                    voiceResult.isCorrect
                                      ? "correct"
                                      : "incorrect"
                                  }`}
                                  role="status"
                                >
                                  {voiceResult.transcript && (
                                    <p>
                                      <strong>You said:</strong>{" "}
                                      {voiceResult.transcript}
                                    </p>
                                  )}

                                  <p>
                                    {voiceResult.isCorrect ? "✅" : "❌"}{" "}
                                    {voiceResult.message}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {checkingAnswers && (
                      <div className="child-learning-empty-questions">
                        <span>⏳</span>
                        <p>Checking your answers...</p>
                      </div>
                    )}
                  </div>
                )}
            </aside>
          </section>
        )}

        {/* LESSONS IN PARENT-SELECTED ORDER */}

        <section className="child-learning-lessons learning-wide-card">
          <div className="learning-section-heading">
            <span className="learning-heading-icon">📺</span>
            <h3>Your Learning Activities</h3>
          </div>

          {lessonsLoading ? (
            <p className="child-learning-message">
              Loading videos...
            </p>
          ) : !topicLessonGroups.length || !selectedTopic ? (
            <p className="child-learning-message">
              No videos are available yet. Please ask your parent to select learning topics.
            </p>
          ) : (
            <div className="child-learning-lesson-list">
              <button
                key={selectedTopic.topic_id}
                type="button"
                className="child-learning-lesson-btn active"
                disabled
                aria-current="step"
              >
                <span className="child-learning-lesson-order">
                  {currentTopicIndex + 1}.
                </span>
                {selectedTopic.topic_name ||
                  selectedTopic.name ||
                  selectedTopic.title ||
                  lessons[0]?.title ||
                  "Learning Topic"}
              </button>
            </div>
          )}
        </section>

        {/* DAILY TIMER POPUP */}

        {timerPopup && !learningLimitReached && (
          <div
            className="learning-timer-modal-overlay"
            role="presentation"
          >
            <div
              className="learning-timer-modal time-warning"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="learning-timer-popup-title"
              aria-describedby="learning-timer-popup-message"
            >
              <div
                className="learning-timer-modal-icon"
              >
                {timerPopup === "five"
                  ? "⏰"
                  : timerPopup === "one"
                  ? "⚠️"
                  : "🌙"}
              </div>

              <h2
                id="learning-timer-popup-title"
              >
                {timerPopup === "five"
                  ? "5 Minutes Remaining!"
                  : "1 Minute Remaining!"}
              </h2>

              <p
                id="learning-timer-popup-message"
              >
                {timerPopup === "five"
                  ? "You have 5 minutes of learning time left!"
                  : "Only 1 minute of learning time left!"}
              </p>

              <button
                type="button"
                onClick={() => setTimerPopup(null)}
                className="learning-timer-modal-button"
              >
                Continue Learning
              </button>
            </div>
          </div>
        )}

        {showRewardsPopup && answerResults && !timerPopup && !learningLimitReached && (
          <dialog
            ref={rewardsDialogRef}
            className="child-activity-rewards-popup"
            aria-labelledby="child-activity-rewards-title"
            aria-describedby="child-activity-rewards-greeting"
            onClose={() => setShowRewardsPopup(false)}
          >
            <button
              type="button"
              className="child-activity-rewards-close"
              aria-label="Close rewards"
              onClick={() => rewardsDialogRef.current?.close()}
            >
              <X aria-hidden="true" />
            </button>

            <img
              src={activityRewardGirl}
              alt=""
              className="child-activity-rewards-girl"
            />

            <div className="child-activity-rewards-content">
              <h2 id="child-activity-rewards-title">Activity Completed!</h2>
              <p id="child-activity-rewards-greeting">Great Job, {childName}!</p>

              <div
                className="child-activity-rewards-score"
                role="img"
                aria-label={`${earnedStars} ${earnedStars === 1 ? "star" : "stars"} earned`}
              >
                {Array.from({ length: earnedStars }, (_, index) => (
                  <Star key={index} className="child-activity-rewards-star" aria-hidden="true" />
                ))}
                <Star className="child-activity-rewards-sparkle sparkle-start" aria-hidden="true" />
                <Star className="child-activity-rewards-sparkle sparkle-end" aria-hidden="true" />
              </div>

              <button
                type="button"
                className="child-activity-rewards-next-btn"
                onClick={handleNextActivity}
              >
                {hasNextActivity ? "Next Activity" : "Finish Learning"}
                <ArrowRight aria-hidden="true" />
              </button>
            </div>
            <div className="child-activity-rewards-wave" aria-hidden="true" />
          </dialog>
        )}

      </div>
    </main>
  );
}
export default ChildLearning;
