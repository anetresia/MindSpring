
import { useEffect, useRef, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";

import logo from "../assets/mindspring-logo.png";
import "../styles/register.css";

import {
  registerParent,
  verifyParentOtp,
  resendParentOtp,
  googleLogin,
} from "../api";

function Register({ isOpen, onClose, onLoginClick }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  // Google button width
  const googleButtonRef = useRef(null);
  const [googleButtonWidth, setGoogleButtonWidth] = useState(400);

  // Close popup using Escape key
  useEffect(() => {
    if (!isOpen) return;

    function handleEscape(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  // OTP resend timer
  useEffect(() => {
    if (!otpStep || resendTimer <= 0) return;

    const timer = setInterval(() => {
      setResendTimer((previous) => Math.max(previous - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [otpStep, resendTimer]);

  // Calculate Google button width
  useEffect(() => {
    if (!isOpen || otpStep) return;

    const buttonContainer = googleButtonRef.current;

    if (!buttonContainer) return;

    function updateGoogleButtonWidth() {
      const availableWidth = Math.floor(
        buttonContainer.getBoundingClientRect().width
      );

      setGoogleButtonWidth(
        Math.min(400, Math.max(200, availableWidth))
      );
    }

    updateGoogleButtonWidth();

    const resizeObserver = new ResizeObserver(updateGoogleButtonWidth);

    resizeObserver.observe(buttonContainer);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isOpen, otpStep]);

  // Handle input changes
  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  }

  // Password strength
  function getPasswordStrength(password) {
    if (!password) return "";

    let score = 0;

    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return "Weak";
    if (score <= 4) return "Medium";

    return "Strong";
  }

  const passwordStrength = getPasswordStrength(formData.password);

  // Parent Registration - Send OTP
  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const email = formData.email.trim().toLowerCase();

    if (!formData.fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (
      !/[A-Z]/.test(formData.password) ||
      !/[a-z]/.test(formData.password) ||
      !/[0-9]/.test(formData.password) ||
      !/[^A-Za-z0-9]/.test(formData.password)
    ) {
      setError(
        "Include an uppercase letter, lowercase letter, number and special character."
      );
      return;
    }

    if (!agreeTerms) {
      setError("Please agree to the Terms and Privacy Policy.");
      return;
    }

    setIsLoading(true);

    try {
      // Send registration request to backend
      const result = await registerParent({
        name: formData.fullName.trim(),
        email,
        password: formData.password,
      });

      // Move to OTP only after successful response
      setOtpStep(true);
      setOtp("");
      setResendTimer(result?.resend_after
        ? Math.ceil(result.resend_after)
        : 60);

      setSuccess(
        "A 6-digit verification code has been sent to your email."
      );

    } catch (err) {
      // Display backend error, including duplicate email
      setOtpStep(false);
      setError(
        err.message || "Unable to register. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  // Verify OTP
  async function handleVerifyOtp(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!/^[0-9]{6}$/.test(otp)) {
      setError("Please enter a valid 6-digit OTP.");
      return;
    }

    setIsLoading(true);

    try {
      await verifyParentOtp({
        email: formData.email.trim().toLowerCase(),
        otp,
      });

      setSuccess("Your account has been created successfully!");

      // Close Register popup and open Login popup
      onClose();
      onLoginClick();

    } catch (err) {
      setError(
        err.message || "OTP verification failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  // Resend OTP
  async function handleResendOtp() {
    if (resendTimer > 0 || isLoading) return;

    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const result = await resendParentOtp(
        formData.email.trim().toLowerCase()
      );

      setOtp("");
      setResendTimer(
        result?.resend_after
          ? Math.ceil(result.resend_after)
          : 60
      );

      setSuccess("A new OTP has been sent to your email.");

    } catch (err) {
      setError(
        err.message || "Unable to resend OTP. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  // Google Registration
  async function handleGoogleSuccess(credentialResponse) {
    if (!credentialResponse.credential) {
      setError("Unable to get Google authentication token.");
      return;
    }

    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const result = await googleLogin(
        credentialResponse.credential
      );

      if (!result?.access_token || !result?.user) {
        throw new Error("Invalid Google authentication response.");
      }

      const userRole = result.user.role?.trim().toLowerCase();

      if (userRole !== "parent") {
        throw new Error("This account does not have parent access.");
      }

      // Clear old authentication data
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      sessionStorage.removeItem("access_token");
      sessionStorage.removeItem("user");

      // Save Google login details
      localStorage.setItem("access_token", result.access_token);
      localStorage.setItem("user", JSON.stringify(result.user));

      setSuccess("Google account connected successfully!");

      onClose();
      window.location.href = "/parent-home";

    } catch (err) {
      setError(
        err.message || "Google registration failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="register-overlay" onClick={onClose}>
      <section
        className="register-popup"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-title"
      >
        <button
          type="button"
          className="register-close"
          onClick={onClose}
          aria-label="Close registration"
        >
          ×
        </button>

        <header className="register-header">
          <div className="register-logo">
            <img src={logo} alt="MindSpring Logo" />
          </div>

          <h2 id="register-title">
            {otpStep ? "Verify Your Email" : "Create an Account"}
          </h2>

          <p className="register-subtitle">
            {otpStep ? (
              <>
                Enter the 6-digit code sent to
                <br />
                <strong>{formData.email}</strong>
              </>
            ) : (
              <>
                Join MindSpring and start your child's
                <br />
                learning journey today!
              </>
            )}
          </p>
        </header>

        {!otpStep ? (
          <>
            <form className="register-form" onSubmit={handleSubmit}>
              <label className="register-input">
                <span className="register-input-icon">♙</span>

                <input
                  type="text"
                  name="fullName"
                  placeholder="Parent's Full Name"
                  value={formData.fullName}
                  onChange={handleChange}
                  autoComplete="name"
                  required
                />
              </label>

              <label className="register-input">
                <span className="register-input-icon">✉</span>

                <input
                  type="email"
                  name="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                  autoCapitalize="none"
                  required
                />
              </label>

              <label className="register-input">
                <span className="register-input-icon">⚿</span>

                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword((previous) => !previous)
                  }
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </label>

              {formData.password && (
                <p
                  className={`password-strength strength-${passwordStrength.toLowerCase()}`}
                >
                  Password strength: <strong>{passwordStrength}</strong>
                </p>
              )}

              <label className="register-input">
                <span className="register-input-icon">⚿</span>

                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowConfirmPassword((previous) => !previous)
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                >
                  {showConfirmPassword ? "🙈" : "👁"}
                </button>
              </label>

              {formData.confirmPassword && (
                <p className="password-match">
                  {formData.password === formData.confirmPassword
                    ? "Passwords match"
                    : "Passwords do not match"}
                </p>
              )}

              <label className="register-terms">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(event) =>
                    setAgreeTerms(event.target.checked)
                  }
                />

                <span>
                  I agree to the{" "}
                  <a
                    href="#terms"
                    onClick={(event) => event.preventDefault()}
                  >
                    Terms
                  </a>{" "}
                  and{" "}
                  <a
                    href="#privacy"
                    onClick={(event) => event.preventDefault()}
                  >
                    Privacy Policy
                  </a>
                </span>
              </label>

              {error && (
                <p
                  className="register-message error-message"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="register-submit"
                disabled={isLoading}
              >
                {isLoading ? "Sending OTP..." : "Register →"}
              </button>
            </form>

            <div className="register-divider">
              <span>OR</span>
            </div>

            <div
              className="register-google-btn"
              ref={googleButtonRef}
            >
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => {
                  setError(
                    "Google registration failed. Please try again."
                  );
                }}
                text="continue_with"
                shape="rectangular"
                theme="outline"
                size="large"
                width={googleButtonWidth}
              />
            </div>
          </>
        ) : (
          <form className="register-form" onSubmit={handleVerifyOtp}>
            <label className="register-input">
              <span className="register-input-icon">⚿</span>

              <input
                type="text"
                name="otp"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(event) => {
                  setOtp(
                    event.target.value.replace(/\D/g, "").slice(0, 6)
                  );
                  setError("");
                }}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
              />
            </label>

            {error && (
              <p
                className="register-message error-message"
                role="alert"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              className="register-submit"
              disabled={isLoading || otp.length !== 6}
            >
              {isLoading ? "Verifying..." : "Verify OTP →"}
            </button>

            <p className="otp-resend">
              Didn't receive the code?{" "}
              {resendTimer > 0 ? (
                <span>Resend in {resendTimer}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isLoading}
                >
                  Resend OTP
                </button>
              )}
            </p>

            <button
              type="button"
              className="otp-back"
              onClick={() => {
                setOtpStep(false);
                setOtp("");
                setError("");
                setSuccess("");
              }}
            >
              ← Back to registration
            </button>
          </form>
        )}

        {success && (
          <p
            className="register-message success-message"
            role="status"
          >
            {success}
          </p>
        )}

        {!otpStep && (
          <p className="register-login">
            Already have an account?{" "}
            <button
              type="button"
              onClick={onLoginClick}
            >
              Login here
            </button>
          </p>
        )}
      </section>
    </div>
  );
}

export default Register;
