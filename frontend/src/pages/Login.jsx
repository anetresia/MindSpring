
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";

import logo from "../assets/mindspring-logo.png";
import "../styles/login.css";

import { loginParent, googleLogin } from "../api";
import ForgotPassword from "../components/ForgotPassword";

function Login({ onClose, onSwitchToRegister }) {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");

  // ========================================
  // HANDLE INPUT CHANGES
  // ========================================

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  }

  // ========================================
  // HANDLE SUCCESSFUL LOGIN
  // ========================================

  function handleLoginSuccess(result) {
    try {
      if (!result?.access_token || !result?.user) {
        throw new Error(
          "Invalid login response. Please try again."
        );
      }

      const userRole = result.user.role
        ?.trim()
        .toLowerCase();

      if (!userRole || !["parent", "admin"].includes(userRole)) {
        throw new Error(
          "Your account role is not recognized. Please contact support."
        );
      }

      const user = {
        ...result.user,
        role: userRole,
      };

      const storage = rememberMe
        ? localStorage
        : sessionStorage;

      // Clear old login details
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");

      sessionStorage.removeItem("access_token");
      sessionStorage.removeItem("user");

      // Save current login details
      storage.setItem("access_token", result.access_token);
      storage.setItem("user", JSON.stringify(user));

      // Verify saved details
      if (
        !storage.getItem("access_token") ||
        !storage.getItem("user")
      ) {
        throw new Error(
          "Unable to save login details. Please try again."
        );
      }

      // Close popup
      if (typeof onClose === "function") {
        onClose();
      }

      // Navigate according to role
      if (userRole === "admin") {
        navigate("/admin-dashboard", {
          replace: true,
          state: { user },
        });
      } else {
        navigate("/parent-home", {
          replace: true,
          state: { parent: user },
        });
      }

    } catch (err) {
      console.error("Login success handling error:", err);

      setError(
        err.message || "Unable to complete login. Please try again."
      );
    }
  }

  // ========================================
  // EMAIL LOGIN
  // ========================================

  async function handleSubmit(event) {
    event.preventDefault();

    if (isLoading) return;

    setError("");

    if (!formData.email.trim() || !formData.password) {
      setError(
        "Please enter your email address and password."
      );
      return;
    }

    setIsLoading(true);

    try {
      const result = await loginParent({
        email: formData.email.trim(),
        password: formData.password,
      });

      handleLoginSuccess(result);

    } catch (err) {
      console.error("Email login error:", err);

      setError(
        err.message || "Login failed. Please try again."
      );

    } finally {
      setIsLoading(false);
    }
  }

  // ========================================
  // GOOGLE LOGIN
  // ========================================

  async function handleGoogleSuccess(credentialResponse) {
    if (isLoading) return;

    setError("");

    if (!credentialResponse?.credential) {
      setError(
        "Google authentication failed. Please try again."
      );
      return;
    }

    setIsLoading(true);

    const startTime = performance.now();

    try {
      console.log("Google login started...");

      console.time("Google Backend Login");

      // Send Google credential to backend
      const result = await googleLogin(
        credentialResponse.credential
      );

      console.timeEnd("Google Backend Login");

      const elapsedTime =
        (performance.now() - startTime) / 1000;

      console.log(
        "Google backend response time:",
        elapsedTime.toFixed(2),
        "seconds"
      );

      console.log("Google backend login completed.");

      // Complete login and navigate
      handleLoginSuccess(result);

    } catch (err) {
      console.error("Google login error:", err);

      setError(
        err.message || "Google login failed. Please try again."
      );

    } finally {
      setIsLoading(false);
    }
  }

  // ========================================
  // FORGOT PASSWORD
  // ========================================

  if (showForgotPassword) {
    return (
      <ForgotPassword
        onClose={onClose}
        onBackToLogin={() => {
          setShowForgotPassword(false);
          setError("");
        }}
      />
    );
  }

  // ========================================
  // LOGIN UI
  // ========================================

  return (
    <div
      className="login-popup-overlay"
      onClick={onClose}
    >
      <section
        className="login-popup-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
        onClick={(event) => event.stopPropagation()}
      >

        {/* CLOSE BUTTON */}
        <button
          type="button"
          className="login-popup-close"
          onClick={onClose}
          aria-label="Close login popup"
        >
          ×
        </button>

        {/* HEADER */}
        <header className="login-popup-header">

          <div className="login-popup-logo">
            <img
              src={logo}
              alt="MindSpring Logo"
            />
          </div>

          <h2 id="login-title">
            Welcome Back
          </h2>

          <p>
            Login to continue your child's learning journey!
          </p>

        </header>

        {/* LOGIN FORM */}
        <form
          className="login-popup-form"
          onSubmit={handleSubmit}
          autoComplete="on"
        >

          {/* EMAIL */}
          <label className="login-popup-input">

            <span aria-hidden="true">✉</span>

            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
            />

          </label>

          {/* PASSWORD */}
          <label className="login-popup-input">

            <span aria-hidden="true">⚿</span>

            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              autoComplete="current-password"
              required
            />

            <button
              type="button"
              className="login-popup-toggle"
              onClick={() =>
                setShowPassword((previous) => !previous)
              }
              aria-label={
                showPassword
                  ? "Hide password"
                  : "Show password"
              }
            >
              {showPassword ? "🙈" : "👁"}
            </button>

          </label>

          {/* LOGIN OPTIONS */}
          <div className="login-popup-options">

            <label className="login-popup-remember">

              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) =>
                  setRememberMe(event.target.checked)
                }
              />

              <span>Remember me</span>

            </label>

            <button
              type="button"
              className="login-popup-forgot"
              onClick={() => {
                setError("");
                setShowForgotPassword(true);
              }}
            >
              Forgot Password?
            </button>

          </div>

          {/* ERROR MESSAGE */}
          {error && (
            <p
              className="login-popup-error"
              role="alert"
            >
              {error}
            </p>
          )}

          {/* LOGIN BUTTON */}
          <button
            type="submit"
            className="login-popup-submit"
            disabled={isLoading}
          >
            {isLoading ? "Logging in..." : "Login →"}
          </button>

        </form>

        {/* DIVIDER */}
        <div className="login-popup-divider">
          <span>OR</span>
        </div>

        {/* GOOGLE LOGIN */}
        <div className="login-popup-google">

          {isLoading ? (
            <p>Please wait...</p>
          ) : (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => {
                setError(
                  "Google login was cancelled or failed. Please try again."
                );
              }}
              text="continue_with"
              theme="outline"
              shape="rectangular"
              size="large"
              width={320}
            />
          )}

        </div>

        {/* REGISTER LINK */}
        <p className="login-popup-register">
          Don't have an account?{" "}

          <button
            type="button"
            onClick={onSwitchToRegister}
          >
            Register here
          </button>

        </p>

      </section>
    </div>
  );
}

export default Login;
