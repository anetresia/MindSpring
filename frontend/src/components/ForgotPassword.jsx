
import { useState } from "react";

import logo from "../assets/mindspring-logo.png";
import "../styles/forgot-password.css";

const API_URL = "http://127.0.0.1:8000";

function ForgotPassword({ onClose, onBackToLogin }) {
  const [step, setStep] = useState(1);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function clearMessages() {
    setError("");
    setMessage("");
  }

  async function sendRequest(endpoint, body) {
    const response = await fetch(`${API_URL}/auth/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.detail ||
        data.message ||
        "Something went wrong. Please try again."
      );
    }

    return data;
  }

  // STEP 1: SEND OTP
  async function handleSendOTP(event) {
    event.preventDefault();
    clearMessages();

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await sendRequest("forgot-password", {
        email: email.trim(),
      });

      setStep(2);
      setMessage(
        result.message ||
        "A verification code has been sent to your email."
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  // STEP 2: VERIFY OTP
  async function handleVerifyOTP(event) {
    event.preventDefault();
    clearMessages();

    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter a valid 6-digit OTP.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await sendRequest("verify-reset-otp", {
        email: email.trim(),
        otp,
      });

      if (!result.reset_token) {
        throw new Error("Reset token was not received. Please try again.");
      }

      setResetToken(result.reset_token);
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  // STEP 3: RESET PASSWORD
  async function handleResetPassword(event) {
    event.preventDefault();
    clearMessages();

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setError("Please include at least one uppercase letter.");
      return;
    }

    if (!/[a-z]/.test(password)) {
      setError("Please include at least one lowercase letter.");
      return;
    }

    if (!/[0-9]/.test(password)) {
      setError("Please include at least one number.");
      return;
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      setError("Please include at least one special character.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await sendRequest("reset-password", {
        reset_token: resetToken,
        new_password: password,
      });

      setMessage(
        result.message ||
        "Your password has been reset successfully."
      );

      setPassword("");
      setConfirmPassword("");
      setStep(4);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  // BACK BUTTON - FIXED
  function handleBack(event) {
    event.preventDefault();
    event.stopPropagation();

    if (isLoading) return;

    clearMessages();

    setStep((previousStep) => {
      if (previousStep === 3) {
        setPassword("");
        setConfirmPassword("");
        setResetToken("");
        return 2;
      }

      if (previousStep === 2) {
        setOtp("");
        return 1;
      }

      return previousStep;
    });

    if (step === 1 && typeof onBackToLogin === "function") {
      onBackToLogin();
    }
  }

  // RETURN TO LOGIN
  function handleReturnToLogin(event) {
    event.preventDefault();
    event.stopPropagation();

    if (typeof onBackToLogin === "function") {
      onBackToLogin();
    } else if (typeof onClose === "function") {
      onClose();
    }
  }

  return (
    <div
      className="forgot-password-overlay"
      onClick={onClose}
    >
      <section
        className="forgot-password-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="forgot-password-title"
        onClick={(event) => event.stopPropagation()}
      >
        {step !== 4 && (
          <button
            type="button"
            className="forgot-password-back"
            onClick={handleBack}
            disabled={isLoading}
            aria-label="Go back"
          >
            ←
          </button>
        )}

        <button
          type="button"
          className="forgot-password-close"
          onClick={onClose}
          aria-label="Close popup"
        >
          ×
        </button>

        <div className="forgot-password-logo">
          <img src={logo} alt="MindSpring Logo" />
        </div>

        {step !== 4 && (
          <div className="forgot-password-progress">
            {[1, 2, 3].map((number) => (
              <div
                key={number}
                className={`forgot-progress-step ${
                  step >= number ? "active" : ""
                }`}
              >
                {number}
              </div>
            ))}
          </div>
        )}

        {/* STEP 1: EMAIL */}
        {step === 1 && (
          <>
            <header className="forgot-password-heading">
              <h2 id="forgot-password-title">
                Forgot Password?
              </h2>

              <p>
                Don't worry! Enter your registered email address.
                We'll send you a verification code.
              </p>
            </header>

            <form
              className="forgot-password-form"
              onSubmit={handleSendOTP}
            >
              <label className="forgot-password-input">
                <span aria-hidden="true">✉</span>

                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    clearMessages();
                  }}
                  autoComplete="email"
                  required
                />
              </label>

              {error && (
                <p className="forgot-password-error" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="forgot-password-submit"
                disabled={isLoading}
              >
                {isLoading ? "Sending OTP..." : "Send Verification Code →"}
              </button>
            </form>
          </>
        )}

        {/* STEP 2: OTP */}
        {step === 2 && (
          <>
            <header className="forgot-password-heading">
              <h2 id="forgot-password-title">
                Verify Your Email
              </h2>

              <p>
                We've sent a 6-digit verification code to
                <br />
                <strong>{email}</strong>
              </p>
            </header>

            <form
              className="forgot-password-form"
              onSubmit={handleVerifyOTP}
            >
              <label className="forgot-password-input">
                <span aria-hidden="true">✉</span>

                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(event) => {
                    const value = event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 6);

                    setOtp(value);
                    clearMessages();
                  }}
                  maxLength={6}
                  autoComplete="one-time-code"
                  required
                />
              </label>

              {message && (
                <p className="forgot-password-message">
                  {message}
                </p>
              )}

              {error && (
                <p className="forgot-password-error" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="forgot-password-submit"
                disabled={isLoading}
              >
                {isLoading ? "Verifying..." : "Verify OTP →"}
              </button>
            </form>
          </>
        )}

        {/* STEP 3: NEW PASSWORD */}
        {step === 3 && (
          <>
            <header className="forgot-password-heading">
              <h2 id="forgot-password-title">
                Create New Password
              </h2>

              <p>
                Create a new password for your MindSpring account.
              </p>
            </header>

            <form
              className="forgot-password-form"
              onSubmit={handleResetPassword}
            >
              <label className="forgot-password-input">
                <span aria-hidden="true">⚿</span>

                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="New Password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    clearMessages();
                  }}
                  autoComplete="new-password"
                  required
                />

                <button
                  type="button"
                  className="forgot-password-toggle"
                  onClick={() =>
                    setShowPassword((previous) => !previous)
                  }
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </label>

              <label className="forgot-password-input">
                <span aria-hidden="true">⚿</span>

                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    clearMessages();
                  }}
                  autoComplete="new-password"
                  required
                />

                <button
                  type="button"
                  className="forgot-password-toggle"
                  onClick={() =>
                    setShowConfirmPassword((previous) => !previous)
                  }
                >
                  {showConfirmPassword ? "🙈" : "👁"}
                </button>
              </label>

              <div className="forgot-password-requirements">
                <strong>Password must contain:</strong>
                <p>✓ At least 8 characters</p>
                <p>✓ One uppercase letter</p>
                <p>✓ One lowercase letter</p>
                <p>✓ One number</p>
                <p>✓ One special character</p>
              </div>

              {error && (
                <p className="forgot-password-error" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="forgot-password-submit"
                disabled={isLoading}
              >
                {isLoading ? "Resetting Password..." : "Reset Password →"}
              </button>
            </form>
          </>
        )}

        {/* STEP 4: SUCCESS */}
        {step === 4 && (
          <div className="forgot-password-success">
            <div className="forgot-success-icon">✓</div>

            <h2 id="forgot-password-title">
              Password Reset!
            </h2>

            <p>
              Your password has been successfully updated.
              You can now login with your new password.
            </p>

            <button
              type="button"
              className="forgot-password-submit"
              onClick={handleReturnToLogin}
            >
              Back to Login →
            </button>
          </div>
        )}

        {step !== 4 && (
          <p className="forgot-password-footer">
            Remember your password?{" "}
            <button
              type="button"
              onClick={handleReturnToLogin}
            >
              Back to Login
            </button>
          </p>
        )}
      </section>
    </div>
  );
}

export default ForgotPassword;
