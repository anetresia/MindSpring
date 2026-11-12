
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  createChild,
  updateChild,
  deleteChild,
  getLearningPreferences,
  updateLearningPreferences,
  getChildSelectedTopics,
  addChildSelectedTopic,
  removeChildSelectedTopic,
} from "../../api";

import LearningPreferences from "./LearningPreferences";
import TopicSelection from "./TopicSelection";

import "../../styles/parent-dashboard/my-children.css";

const initialFormData = {
  child_name: "",
  date_of_birth: "",
  communicationMethod: "",
  learningMethod: "",
};

function MyChildren({
  children = [],
  setChildren,
  loading,
  childrenError,
  refreshChildren,
  onOpenChildDashboard,
  dashboardMode = false,
  openAddChildOnDashboard = false,
  onDashboardAddChildClose,
}) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState(initialFormData);
  const [editingChildId, setEditingChildId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [childToDelete, setChildToDelete] = useState(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingSelectedTopics, setLoadingSelectedTopics] =
    useState(false);
  const [selectedTopicsLoadError, setSelectedTopicsLoadError] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function getTodayString() {
    const today = new Date();

    return [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");
  }

  function getChildImage(child) {
    return (
      child.profile_image_url ||
      child.profile_image ||
      child.image_url ||
      null
    );
  }

  function getChildInitial(child) {
    return child.child_name?.trim()?.charAt(0)?.toUpperCase() || "?";
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function resetWizard() {
    setFormData(initialFormData);
    setEditingChildId(null);
    setWizardStep(1);
    setSelectedTopics([]);
    setLoadingSelectedTopics(false);
    setSelectedTopicsLoadError(false);
    setError("");
  }

  function handleAddChild() {
    resetWizard();
    setSuccess("");
    setShowForm(true);
  }

  // OPEN DASHBOARD ADD CHILD POPUP
  useEffect(() => {
    if (dashboardMode && openAddChildOnDashboard) {
      resetWizard();
      setSuccess("");
      setShowForm(true);
    }
  }, [dashboardMode, openAddChildOnDashboard]);

  // EDIT CHILD AND LOAD BACKEND DATA
  async function handleEditChild(child) {
    setFormData({
      child_name: child.child_name || "",
      date_of_birth: child.date_of_birth?.split("T")[0] || "",
      communicationMethod: "",
      learningMethod: "",
    });

    setEditingChildId(child.child_id);
    setSelectedTopics([]);
    setWizardStep(1);
    setError("");
    setSuccess("");
    setSelectedTopicsLoadError(false);
    setLoadingSelectedTopics(true);
    setShowForm(true);

    try {
      const [topicsResponse, preferencesResponse] =
        await Promise.all([
          getChildSelectedTopics(child.child_id),
          getLearningPreferences(child.child_id),
        ]);

      const topics = Array.isArray(topicsResponse)
        ? topicsResponse
        : Array.isArray(topicsResponse?.data)
        ? topicsResponse.data
        : [];

      const topicIds = topics
        .map((item) => Number(item.topic_id))
        .filter((id) => Number.isFinite(id));

      setSelectedTopics(topicIds);

      setFormData((previous) => ({
        ...previous,
        communicationMethod:
          preferencesResponse?.communication_method ||
          preferencesResponse?.communicationMethod ||
          "",
        learningMethod:
          preferencesResponse?.learning_method ||
          preferencesResponse?.learningMethod ||
          "",
      }));
    } catch (err) {
      setSelectedTopicsLoadError(true);
      setError(
        err.message ||
          "Unable to load learning preferences and selected topics."
      );
    } finally {
      setLoadingSelectedTopics(false);
    }
  }

  function handleCancel() {
    setShowForm(false);
    resetWizard();

    if (dashboardMode) {
      onDashboardAddChildClose?.();
    }
  }

  // WIZARD NAVIGATION
  function handleNextStep() {
    setError("");

    if (wizardStep === 1) {
      if (
        !formData.child_name.trim() ||
        !formData.date_of_birth
      ) {
        setError(
          "Please enter the child's name and date of birth."
        );
        return;
      }

      if (formData.date_of_birth > getTodayString()) {
        setError("Date of birth cannot be in the future.");
        return;
      }
    }

    if (wizardStep === 2) {
      if (
        !formData.communicationMethod ||
        !formData.learningMethod
      ) {
        setError(
          "Please select both communication and learning methods."
        );
        return;
      }
    }

    setWizardStep((step) => Math.min(step + 1, 3));
  }

  function handlePreviousStep() {
    setError("");
    setWizardStep((step) => Math.max(step - 1, 1));
  }

  function handleStartLearning(child) {
    if (!child?.child_id) {
      setError("Child ID is missing. Unable to open dashboard.");
      return;
    }

    if (onOpenChildDashboard) {
      onOpenChildDashboard(child);
      return;
    }

    navigate(`/child-dashboard/${child.child_id}`, {
      state: { child },
    });
  }

  // SAVE CHILD, PREFERENCES AND TOPICS
  async function handleSubmit() {
    if (
      wizardStep !== 3 ||
      saving ||
      !showForm
    ) {
      return;
    }

    setError("");
    setSuccess("");

    if (
      !formData.child_name.trim() ||
      !formData.date_of_birth ||
      !formData.communicationMethod ||
      !formData.learningMethod
    ) {
      setError("Please complete all required fields.");
      return;
    }

    if (formData.date_of_birth > getTodayString()) {
      setError("Date of birth cannot be in the future.");
      return;
    }

    if (
      editingChildId !== null &&
      selectedTopicsLoadError
    ) {
      setError(
        "Unable to load existing data. Please close and reopen this profile."
      );
      return;
    }

    if (loadingSelectedTopics) {
      setError("Please wait while the existing data is loading.");
      return;
    }

    const childData = {
      child_name: formData.child_name.trim(),
      date_of_birth: formData.date_of_birth,
    };

    const preferencesData = {
      communicationMethod: formData.communicationMethod,
      learningMethod: formData.learningMethod,
    };

    try {
      setSaving(true);

      // UPDATE EXISTING CHILD
      if (editingChildId !== null) {
        const existingResponse =
          await getChildSelectedTopics(editingChildId);

        const existingTopics = Array.isArray(existingResponse)
          ? existingResponse
          : Array.isArray(existingResponse?.data)
          ? existingResponse.data
          : [];

        const existingTopicIds = existingTopics
          .map((item) => Number(item.topic_id))
          .filter((id) => Number.isFinite(id));

        const newTopicIds = selectedTopics
          .map(Number)
          .filter((id) => Number.isFinite(id));

        await updateChild(editingChildId, childData);

        await updateLearningPreferences(
          editingChildId,
          preferencesData
        );

        const topicsToAdd = newTopicIds.filter(
          (id) => !existingTopicIds.includes(id)
        );

        const topicsToRemove = existingTopicIds.filter(
          (id) => !newTopicIds.includes(id)
        );

        for (const topicId of topicsToAdd) {
          await addChildSelectedTopic(
            editingChildId,
            topicId
          );
        }

        for (const topicId of topicsToRemove) {
          await removeChildSelectedTopic(
            editingChildId,
            topicId
          );
        }

        setSuccess("Child profile updated successfully.");
      } else {
        // CREATE NEW CHILD ONLY AFTER FINISH
        const createdChild = await createChild(childData);

        const newChildId =
          createdChild?.child_id ||
          createdChild?.data?.child_id;

        if (!newChildId) {
          throw new Error(
            "Child was created, but child ID was not returned."
          );
        }

        await updateLearningPreferences(
          newChildId,
          preferencesData
        );

        for (const topicId of selectedTopics) {
          await addChildSelectedTopic(
            newChildId,
            topicId
          );
        }

        setSuccess("Child added successfully.");
      }

      setShowForm(false);
      resetWizard();

      if (dashboardMode) {
        onDashboardAddChildClose?.();
      }

      if (refreshChildren) {
        await refreshChildren();
      }
    } catch (err) {
      setError(err.message || "Unable to save child details.");
    } finally {
      setSaving(false);
    }
  }

  // DELETE CHILD
  function handleDeleteChild(child) {
    setChildToDelete(child);
    setError("");
    setSuccess("");
  }

  async function confirmDeleteChild() {
    if (!childToDelete || deleting) return;

    try {
      setDeleting(true);
      setError("");

      await deleteChild(childToDelete.child_id);

      setChildren((previous) =>
        previous.filter(
          (child) =>
            child.child_id !== childToDelete.child_id
        )
      );

      setSuccess("Child profile deleted successfully.");
      setChildToDelete(null);
    } catch (err) {
      setError(
        err.message || "Unable to delete child profile."
      );
    } finally {
      setDeleting(false);
    }
  }

  function calculateAge(dateOfBirth) {
    if (!dateOfBirth) return "";

    const today = new Date();
    const birthDate = new Date(`${dateOfBirth}T00:00:00`);

    let age = today.getFullYear() - birthDate.getFullYear();

    const monthDifference =
      today.getMonth() - birthDate.getMonth();

    if (
      monthDifference < 0 ||
      (monthDifference === 0 &&
        today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age >= 0 ? age : "";
  }

  return (
    <div className="dashboard-content my-children-page">

      {/* MY CHILDREN PAGE CONTENT - HIDDEN IN DASHBOARD MODE */}

      {!dashboardMode && (
        <>
          <section className="children-page-heading">
            <div>
              <h1>My Children</h1>
              <p>
                Manage your children's profiles and learning preferences.
              </p>
            </div>

            <button
              type="button"
              className="children-add-btn"
              onClick={handleAddChild}
            >
              + Add Child
            </button>
          </section>

          {success && (
            <div className="children-success-message" role="status">
              {success}
            </div>
          )}

          {error && !showForm && (
            <div className="children-error-message" role="alert">
              {error}
            </div>
          )}

          {!loading && childrenError && (
            <div className="children-error-message" role="alert">
              {childrenError}
            </div>
          )}
        </>
      )}

      {/* THREE STEP ADD / EDIT WIZARD */}

      {showForm && (
        <div className="children-wizard-overlay">
          <section
            className="children-wizard-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="children-wizard-title"
          >
            <div className="children-wizard-heading">
              <div>
                <span className="children-wizard-kicker">
                  {editingChildId !== null
                    ? "UPDATE PROFILE"
                    : "LET'S GET STARTED"}
                </span>

                <h2 id="children-wizard-title">
                  {editingChildId !== null
                    ? "Edit Child Profile"
                    : "Add New Child"}
                </h2>

                <p>
                  Let's set up a happy learning journey, one step
                  at a time.
                </p>
              </div>

              <button
                type="button"
                className="children-close-btn"
                onClick={handleCancel}
                disabled={saving}
                aria-label="Close form"
              >
                ×
              </button>
            </div>

            {/* PROGRESS */}

            <div
              className="children-wizard-progress"
              aria-label={`Step ${wizardStep} of 3`}
            >
              {[
                "Child Details",
                "Learning Preferences",
                "Life Skill Topics",
              ].map((label, index) => (
                <div
                  className={`children-wizard-progress-step ${
                    wizardStep >= index + 1 ? "active" : ""
                  }`}
                  key={label}
                >
                  <span>{index + 1}</span>
                  <small>{label}</small>
                </div>
              ))}
            </div>

            {error && (
              <div className="children-error-message" role="alert">
                {error}
              </div>
            )}

            <form
              onSubmit={(event) => {
                event.preventDefault();
              }}
            >
              {/* STEP 1 */}

              {wizardStep === 1 && (
                <div className="children-wizard-step">
                  <div className="children-wizard-step-intro">
                    <span>👋</span>

                    <div>
                      <h3>Child Profile Details</h3>
                      <p>
                        First, tell us a little about your child.
                      </p>
                    </div>
                  </div>

                  <div className="children-form-grid">
                    <div className="children-form-group">
                      <label htmlFor="child_name">
                        Child's Name
                      </label>

                      <input
                        id="child_name"
                        type="text"
                        name="child_name"
                        value={formData.child_name}
                        onChange={handleChange}
                        placeholder="Enter child's name"
                        maxLength={100}
                        required
                      />
                    </div>

                    <div className="children-form-group">
                      <label htmlFor="date_of_birth">
                        Date of Birth
                      </label>

                      <input
                        id="date_of_birth"
                        type="date"
                        name="date_of_birth"
                        value={formData.date_of_birth}
                        onChange={handleChange}
                        max={getTodayString()}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2 */}

              {wizardStep === 2 && (
                <div className="children-wizard-step">
                  <LearningPreferences
                    value={formData}
                    onChange={(updatedPreferences) =>
                      setFormData((previous) => ({
                        ...previous,
                        ...updatedPreferences,
                      }))
                    }
                  />
                </div>
              )}

              {/* STEP 3 */}

              {wizardStep === 3 && (
                <div className="children-wizard-step">
                  {loadingSelectedTopics && (
                    <p className="topic-selection-message">
                      Loading previously selected topics...
                    </p>
                  )}

                  <TopicSelection
                    selectedTopics={selectedTopics}
                    onChange={setSelectedTopics}
                  />
                </div>
              )}

              {/* FOOTER BUTTONS */}

              <div className="children-wizard-actions">
                <button
                  type="button"
                  className="children-cancel-btn"
                  onClick={
                    wizardStep === 1
                      ? handleCancel
                      : handlePreviousStep
                  }
                  disabled={saving}
                >
                  {wizardStep === 1 ? "Cancel" : "← Back"}
                </button>

                {wizardStep < 3 ? (
                  <button
                    type="button"
                    className="children-save-btn"
                    onClick={handleNextStep}
                    disabled={
                      saving ||
                      (editingChildId !== null &&
                        loadingSelectedTopics)
                    }
                  >
                    Next Step →
                  </button>
                ) : (
                  <button
                    type="button"
                    className="children-save-btn"
                    onClick={handleSubmit}
                    disabled={
                      saving ||
                      loadingSelectedTopics ||
                      (editingChildId !== null &&
                        selectedTopicsLoadError)
                    }
                  >
                    {saving
                      ? "Saving..."
                      : editingChildId !== null
                      ? "Update Child"
                      : "Finish"}
                  </button>
                )}
              </div>
            </form>
          </section>
        </div>
      )}

      {/* CHILDREN LIST - ONLY ON MY CHILDREN PAGE */}

      {!dashboardMode && (
        <>
          <section className="children-list-section">
            <div className="children-list-heading">
              <h2>Children Profiles</h2>

              <span>
                {children.length}{" "}
                {children.length === 1 ? "Child" : "Children"}
              </span>
            </div>

            {loading ? (
              <p className="children-empty-message">
                Loading children...
              </p>
            ) : childrenError ? (
              <p className="children-empty-message">
                Unable to display children. Please try again.
              </p>
            ) : children.length === 0 ? (
              <div className="children-empty-state">
                <div className="children-empty-icon">🧒</div>

                <h3>No Children Added Yet</h3>

                <p>
                  Add your child's profile to begin their learning journey.
                </p>

                <button
                  type="button"
                  className="children-add-btn"
                  onClick={handleAddChild}
                >
                  + Add Your First Child
                </button>
              </div>
            ) : (
              <div className="children-cards-grid">
                {children.map((child) => {
                  const childImage = getChildImage(child);

                  return (
                    <article
                      className="children-profile-card"
                      key={child.child_id}
                    >
                      <div className="children-card-top">
                        <div className="children-card-avatar">
                          {childImage ? (
                            <img
                              src={childImage}
                              alt={`${child.child_name} profile`}
                              className="children-card-avatar-image"
                              onError={(event) => {
                                event.currentTarget.style.display = "none";

                                const fallback =
                                  event.currentTarget.nextElementSibling;

                                if (fallback) {
                                  fallback.style.display = "flex";
                                }
                              }}
                            />
                          ) : null}

                          <span
                            className="children-card-avatar-initial"
                            style={{
                              display: childImage ? "none" : "flex",
                            }}
                          >
                            {getChildInitial(child)}
                          </span>
                        </div>

                        <div className="children-card-actions">
                          <button
                            type="button"
                            onClick={() => handleEditChild(child)}
                            aria-label={`Edit ${child.child_name}`}
                            title="Edit"
                          >
                            ✏️
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteChild(child)}
                            aria-label={`Delete ${child.child_name}`}
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      <h3>{child.child_name}</h3>

                      <p className="children-card-age">
                        {calculateAge(child.date_of_birth)} years old
                      </p>

                      <div className="children-card-details">
                        <p>
                          <strong>Date of Birth:</strong>{" "}
                          {child.date_of_birth?.split("T")[0] ||
                            "Not available"}
                        </p>

                        <p>
                          <strong>Communication:</strong>{" "}
                          {child.communication_method || "Not available"}
                        </p>

                        <p>
                          <strong>Learning Method:</strong>{" "}
                          {child.learning_method || "Not available"}
                        </p>
                      </div>

                      <button
                        type="button"
                        className="children-start-learning-btn"
                        onClick={() => handleStartLearning(child)}
                      >
                        Go to Child Dashboard →
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* DELETE CONFIRMATION */}

          {childToDelete && (
            <div className="children-modal-overlay">
              <div
                className="children-delete-modal"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="delete-modal-title"
                aria-describedby="delete-modal-description"
              >
                <div className="delete-modal-icon">🗑️</div>

                <h2 id="delete-modal-title">
                  Delete Child Profile?
                </h2>

                <p id="delete-modal-description">
                  Are you sure you want to delete{" "}
                  <strong>{childToDelete.child_name}</strong>'s profile?
                </p>

                <p className="delete-modal-warning">
                  This action cannot be undone.
                </p>

                <div className="delete-modal-actions">
                  <button
                    type="button"
                    className="delete-cancel-btn"
                    onClick={() => setChildToDelete(null)}
                    disabled={deleting}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="delete-confirm-btn"
                    onClick={confirmDeleteChild}
                    disabled={deleting}
                  >
                    {deleting ? "Deleting..." : "Yes, Delete"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default MyChildren;
