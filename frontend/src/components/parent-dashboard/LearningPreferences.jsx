
import React, { useEffect, useState } from "react";
import { getLearningPreferenceOptions } from "../../api";
import "../../styles/parent-dashboard/learning-preferences.css";

const LearningPreferences = ({ value = {}, onChange }) => {
  const [learningMethods, setLearningMethods] = useState([]);
  const [communicationMethods, setCommunicationMethods] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState("");

  useEffect(() => {
    const fetchPreferenceOptions = async () => {
      try {
        setLoadingOptions(true);
        setOptionsError("");

        const response = await getLearningPreferenceOptions();

        setLearningMethods(response.learning_methods || []);
        setCommunicationMethods(
          response.communication_methods || []
        );
      } catch (error) {
        console.error(
          "Failed to fetch learning preference options:",
          error
        );
        setOptionsError("Unable to load preference options.");
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchPreferenceOptions();
  }, []);

  const handleChange = (event) => {
    const { name, value: newValue } = event.target;

    onChange?.({
      ...value,
      [name]: newValue,
    });
  };

  // Keep an already-saved value visible even if it
  // is not currently included in the options response.
  const availableCommunicationMethods = [
    ...new Set([
      ...(value.communicationMethod
        ? [value.communicationMethod]
        : []),
      ...communicationMethods,
    ]),
  ];

  const availableLearningMethods = [
    ...new Set([
      ...(value.learningMethod
        ? [value.learningMethod]
        : []),
      ...learningMethods,
    ]),
  ];

  return (
    <div className="learning-preferences">

      <div className="learning-preferences-heading">
        <div className="learning-preferences-icon">
          🎓
        </div>

        <div>
          <h3>Learning Preferences</h3>

          <p>
            Customize how your child prefers to learn.
            Choose the learning style and communication method.
          </p>
        </div>
      </div>

      <div className="learning-preferences-grid">

        {/* Communication Method */}
        <div className="learning-preference-group">

          <label htmlFor="communication_method">
            Communication Method
          </label>

          <select
            id="communication_method"
            name="communicationMethod"
            value={value.communicationMethod || ""}
            onChange={handleChange}
            required
            disabled={loadingOptions}
          >
            <option value="" disabled>
              {loadingOptions
                ? "Loading communication methods..."
                : "Select communication method"}
            </option>

            {availableCommunicationMethods.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>

          <small>
            Choose how your child prefers to communicate.
          </small>

        </div>

        {/* Learning Method */}
        <div className="learning-preference-group">

          <label htmlFor="learning_method">
            Preferred Learning Method
          </label>

          <select
            id="learning_method"
            name="learningMethod"
            value={value.learningMethod || ""}
            onChange={handleChange}
            required
            disabled={loadingOptions}
          >
            <option value="" disabled>
              {loadingOptions
                ? "Loading learning methods..."
                : "Select learning method"}
            </option>

            {availableLearningMethods.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>

          <small>
            Select the learning method your child prefers.
          </small>

        </div>

      </div>

      {optionsError && (
        <p className="error-message">
          {optionsError}
        </p>
      )}

    </div>
  );
};

export default LearningPreferences;
