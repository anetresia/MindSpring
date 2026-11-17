
import { useEffect, useState } from "react";

import {
  getSubscriptionPlans,
  getMySubscription,
  createStripeCheckout,
} from "../../api";

import "../../styles/parent-dashboard/subscription.css";

function Subscription() {
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentNotice, setPaymentNotice] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);

  // ========================================
  // LOAD BACKEND SUBSCRIPTION DATA
  // ========================================

  async function loadSubscriptionData(showLoading = true) {
    try {
      if (showLoading) {
        setLoading(true);
      }

      setError("");

      const [plansData, subscriptionData] = await Promise.all([
        getSubscriptionPlans(),
        getMySubscription(),
      ]);

      const plansList = Array.isArray(plansData)
        ? plansData
        : Array.isArray(plansData?.plans)
        ? plansData.plans
        : [];

      const currentSubscription =
        subscriptionData?.subscription ?? null;

      setPlans(plansList);
      setSubscription(currentSubscription);

      return currentSubscription;
    } catch (err) {
      console.error("Unable to load subscription:", err);

      if (showLoading) {
        setError(
          err.message || "Unable to load subscription details."
        );
      }

      return null;
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  // ========================================
  // INITIAL LOAD
  // ========================================

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  // ========================================
  // HANDLE STRIPE RETURN
  // ========================================

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeStatus = params.get("stripe");

    if (stripeStatus === "success") {
      setPaymentNotice(
        "Payment successful! We are verifying your payment and updating your subscription. Please wait..."
      );

      verifySubscriptionAfterPayment();
    }

    if (stripeStatus === "cancelled") {
      setPaymentNotice(
        "Payment was cancelled. No credits have been added to your account."
      );

      sessionStorage.removeItem("mindspring_pending_plan_id");
    }

    if (stripeStatus) {
      params.delete("stripe");
      params.delete("session_id");

      const query = params.toString();

      const cleanUrl =
        window.location.pathname +
        (query ? `?${query}` : "") +
        window.location.hash;

      window.history.replaceState({}, "", cleanUrl);
    }
  }, []);

  // ========================================
  // VERIFY SUBSCRIPTION AFTER STRIPE PAYMENT
  // ========================================

  async function verifySubscriptionAfterPayment() {
    const expectedPlanId = sessionStorage.getItem(
      "mindspring_pending_plan_id"
    );

    if (!expectedPlanId) {
      setPaymentNotice(
        "Payment was completed. We are checking your subscription. Please refresh if it does not update."
      );

      await loadSubscriptionData(false);
      return;
    }

    const maxAttempts = 30;
    const delay = 2000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const latestSubscription = await loadSubscriptionData(false);

      if (latestSubscription) {
        const latestPlanId = Number(
          latestSubscription.plan?.plan_id
        );

        const latestStatus = String(
          latestSubscription.status || ""
        ).toUpperCase();

        if (
          latestPlanId === Number(expectedPlanId) &&
          latestStatus === "ACTIVE"
        ) {
          setPaymentNotice(
            "Payment verified successfully! Your subscription and credits have been updated."
          );

          sessionStorage.removeItem(
            "mindspring_pending_plan_id"
          );

          return;
        }
      }

      if (attempt < maxAttempts) {
        setPaymentNotice(
          `Payment received. Updating your subscription... (${attempt}/${maxAttempts})`
        );

        await new Promise((resolve) => {
          setTimeout(resolve, delay);
        });
      }
    }

    // Payment must not be repeated just because webhook is delayed.
    setPaymentNotice(
      "Payment was completed, but subscription activation is taking longer than expected. Please contact the administrator to verify your payment. Do not pay again."
    );
  }

  // ========================================
  // FORMAT BACKEND PRICE
  // ========================================

  function formatPrice(price) {
    if (price === null || price === undefined || price === "") {
      return "Price unavailable";
    }

    return `LKR ${Number(price).toLocaleString("en-LK")}`;
  }

  // ========================================
  // GET PLAN FEATURES FROM BACKEND
  // ========================================

  function getPlanFeatures(plan) {
    const features = [];

    if (plan.video_credits !== null && plan.video_credits !== undefined) {
      features.push(`${plan.video_credits} Video Credits`);
    }

    if (plan.max_children !== null && plan.max_children !== undefined) {
      features.push(
        `${plan.max_children} ${
          Number(plan.max_children) === 1 ? "Child" : "Children"
        }`
      );
    }

    if (plan.plan_type === "FAMILY") {
      features.push("Shared Family Credits");
    }

    if (plan.validity_days !== null && plan.validity_days !== undefined) {
      features.push(`${plan.validity_days} Days Validity`);
    } else if (plan.billing_type === "ONE_TIME") {
      features.push("No Expiry");
    }

    return features;
  }

  // ========================================
  // CHECK CURRENT PLAN
  // ========================================

  function isCurrentPlan(plan) {
    return (
      Number(subscription?.plan?.plan_id) ===
      Number(plan.plan_id)
    );
  }

  // ========================================
  // CHOOSE PLAN
  // ========================================

  function handleChoosePlan(plan) {
    setSelectedPlan(plan);
    setPaymentMessage("");
  }

  // ========================================
  // CLOSE POPUP
  // ========================================

  function handleClosePopup() {
    if (paymentLoading) return;

    setSelectedPlan(null);
    setPaymentMessage("");
  }

  // ========================================
  // CREATE IDEMPOTENCY KEY
  // ========================================

  function createIdempotencyKey() {
    if (window.crypto?.randomUUID) {
      return `stripe-payment-${window.crypto.randomUUID()}`;
    }

    return `stripe-payment-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;
  }

  // ========================================
  // CONTINUE TO STRIPE PAYMENT
  // ========================================

  async function handleContinuePayment() {
    if (!selectedPlan || paymentLoading) return;

    if (selectedPlan.plan_type === "FREE") {
      setPaymentMessage(
        "Free Plan is normally assigned automatically during registration. Please contact the administrator if you need to change your plan."
      );
      return;
    }

    try {
      setPaymentLoading(true);
      setPaymentMessage("");

      const idempotencyKey = createIdempotencyKey();

      // Send only the selected backend plan ID.
      const response = await createStripeCheckout(
        selectedPlan.plan_id,
        idempotencyKey
      );

      if (!response?.checkout_url) {
        throw new Error(
          "Unable to create Stripe Checkout session. Please try again."
        );
      }

      // Remember selected plan for verification after payment.
      sessionStorage.setItem(
        "mindspring_pending_plan_id",
        String(selectedPlan.plan_id)
      );

      // Redirect to Stripe Checkout.
      window.location.assign(response.checkout_url);
    } catch (err) {
      console.error("Stripe checkout error:", err);

      setPaymentMessage(
        err.message || "Unable to start payment. Please try again."
      );

      setPaymentLoading(false);
    }
  }

  // ========================================
  // LOADING SCREEN
  // ========================================

  if (loading) {
    return (
      <section className="subscription-page">
        <div className="subscription-loading">
          Loading subscription plans...
        </div>
      </section>
    );
  }

  // ========================================
  // MAIN PAGE
  // ========================================

  return (
    <section className="subscription-page">
      <div className="subscription-container">

        {/* PAGE HEADER */}

        <div className="subscription-header">
          <div>
            <span className="subscription-eyebrow">
              MINDSPRING MEMBERSHIP
            </span>

            <h1>Choose Your Plan</h1>

            <p>
              Unlock more learning videos and support
              your child's growth.
            </p>
          </div>

          <div className="subscription-header-icon">
            👑
          </div>
        </div>

        {/* PAYMENT RETURN NOTICE */}

        {paymentNotice && (
          <div
            className="subscription-modal-message"
            role="status"
          >
            {paymentNotice}
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div className="subscription-error">
            {error}

            <button
              type="button"
              onClick={() => loadSubscriptionData()}
            >
              Try Again
            </button>
          </div>
        )}

        {/* CURRENT SUBSCRIPTION */}

        {subscription && (
          <div className="current-subscription-card">
            <div className="current-subscription-icon">
              <span>✓</span>
            </div>

            <div className="current-subscription-info">
              <span className="current-subscription-label">
                YOUR CURRENT PLAN
              </span>

              <h2>
                {subscription.plan?.plan_name || "Active Plan"}
              </h2>

              <p>
                {subscription.credits?.remaining_credits ?? 0}
                {" "}credits remaining out of{" "}
                {subscription.credits?.total_credits ?? 0}
              </p>
            </div>

            <div className="current-subscription-status">
              {subscription.status || "ACTIVE"}
            </div>
          </div>
        )}

        {/* AVAILABLE PLANS */}

        <div className="subscription-section-heading">
          <h2>Available Plans</h2>

          <p>
            Select the plan that works best for your family.
          </p>
        </div>

        {plans.length === 0 && !error && (
          <div className="subscription-empty">
            No subscription plans are available right now.
          </div>
        )}

        <div className="subscription-plans-grid">
          {plans.map((plan) => {
            const current = isCurrentPlan(plan);
            const family = plan.plan_type === "FAMILY";
            const free = plan.plan_type === "FREE";

            return (
              <article
                key={plan.plan_id}
                className={[
                  "subscription-plan-card",
                  family ? "family-plan-card" : "",
                  free ? "free-plan-card" : "",
                  current ? "current-plan-card" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="subscription-plan-icon">
                  {free ? "🌱" : family ? "👨‍👩‍👧‍👦" : "👑"}
                </div>

                <h3>{plan.plan_name}</h3>

                <div className="subscription-plan-price">
                  <strong>
                    {formatPrice(plan.price_lkr)}
                  </strong>
                </div>

                <p className="subscription-plan-billing">
                  {free
                    ? "Free Plan"
                    : plan.billing_type === "ONE_TIME"
                    ? "One-time payment"
                    : plan.validity_days !== null &&
                      plan.validity_days !== undefined
                    ? `${plan.validity_days} days`
                    : ""}
                </p>

                <div className="subscription-plan-divider" />

                <ul className="subscription-plan-features">
                  {getPlanFeatures(plan).map((feature, index) => (
                    <li key={`${plan.plan_id}-${index}`}>
                      <span>✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  className="subscription-choose-btn"
                  disabled={current}
                  onClick={() => handleChoosePlan(plan)}
                >
                  {current
                    ? "Current Plan"
                    : free
                    ? "Choose Free Plan"
                    : "Choose Plan"}
                </button>
              </article>
            );
          })}
        </div>

        {/* PLAN CONFIRMATION POPUP */}

        {selectedPlan && (
          <div
            className="subscription-modal-overlay"
            onClick={handleClosePopup}
          >
            <div
              className="subscription-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="subscription-modal-title"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="subscription-modal-close"
                onClick={handleClosePopup}
                aria-label="Close popup"
                disabled={paymentLoading}
              >
                ×
              </button>

              {/* PLAN ICON */}

              <div className="subscription-modal-icon">
                {selectedPlan.plan_type === "FREE"
                  ? "🌱"
                  : selectedPlan.plan_type === "FAMILY"
                  ? "👨‍👩‍👧‍👦"
                  : "👑"}
              </div>

              <span className="subscription-modal-eyebrow">
                PLAN CONFIRMATION
              </span>

              <h2 id="subscription-modal-title">
                {selectedPlan.plan_name}
              </h2>

              <div className="subscription-modal-price">
                {formatPrice(selectedPlan.price_lkr)}
              </div>

              {/* PLAN DETAILS FROM BACKEND */}

              <div className="subscription-modal-details">
                <div>
                  <span>Video Credits</span>
                  <strong>
                    {selectedPlan.video_credits ?? "—"}
                  </strong>
                </div>

                <div>
                  <span>Children</span>
                  <strong>
                    {selectedPlan.max_children ?? "—"}
                  </strong>
                </div>

                <div>
                  <span>Plan Type</span>
                  <strong>
                    {selectedPlan.plan_type || "—"}
                  </strong>
                </div>

                <div>
                  <span>Validity</span>
                  <strong>
                    {selectedPlan.validity_days !== null &&
                    selectedPlan.validity_days !== undefined
                      ? `${selectedPlan.validity_days} Days`
                      : selectedPlan.billing_type === "ONE_TIME"
                      ? "No Expiry"
                      : "—"}
                  </strong>
                </div>
              </div>

              {/* FREE PLAN NOTICE */}

              {selectedPlan.plan_type === "FREE" && (
                <div className="subscription-modal-notice">
                  <strong>Free Plan</strong>

                  <p>
                    Free subscriptions are normally assigned
                    automatically during registration.
                  </p>
                </div>
              )}

              {/* STRIPE PAYMENT NOTICE */}

              {selectedPlan.plan_type !== "FREE" && (
                <div className="subscription-modal-notice">
                  <strong>Secure Stripe Payment</strong>

                  <p>
                    Continue to Stripe's secure checkout page
                    to complete your subscription payment.
                  </p>

                  <span>
                    You can use Stripe test card details in test mode.
                  </span>
                </div>
              )}

              {/* PAYMENT MESSAGE */}

              {paymentMessage && (
                <div
                  className="subscription-modal-message"
                  role="status"
                >
                  {paymentMessage}
                </div>
              )}

              {/* POPUP ACTIONS */}

              <div className="subscription-modal-actions">
                <button
                  type="button"
                  className="subscription-modal-cancel"
                  onClick={handleClosePopup}
                  disabled={paymentLoading}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="subscription-modal-continue"
                  onClick={handleContinuePayment}
                  disabled={paymentLoading}
                >
                  {paymentLoading
                    ? "Connecting to Stripe..."
                    : selectedPlan.plan_type === "FREE"
                    ? "Continue"
                    : "Continue to Payment"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FOOTER BENEFITS */}

        <div className="subscription-benefits">
          <div>
            <span>🔒</span>
            <p>Secure Payment</p>
          </div>

          <div>
            <span>🎓</span>
            <p>Learning Progress</p>
          </div>

          <div>
            <span>👨‍👩‍👧</span>
            <p>Family Friendly</p>
          </div>
        </div>

      </div>
    </section>
  );
}

export default Subscription;
