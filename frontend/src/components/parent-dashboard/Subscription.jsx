
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import {
  getSubscriptionPlans,
  getMySubscription,
  createStripeCheckout,
  cancelStripeCheckout,
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

  // LOAD SUBSCRIPTION DATA
  async function loadSubscriptionData(showLoading = true) {
    try {
      if (showLoading) setLoading(true);

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

      // Backend eligibility filtering is preserved.
      // Free plan is displayed separately below.
      const eligiblePaidPlans = plansList.filter(
        (plan) =>
          plan.plan_type !== "FREE" &&
          Number(plan.price_lkr) > 0
      );

      setPlans(eligiblePaidPlans);
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
      if (showLoading) setLoading(false);
    }
  }

  // INITIAL LOAD
  useEffect(() => {
    loadSubscriptionData();
  }, []);

  // HANDLE STRIPE RETURN
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeStatus = params.get("stripe");
    const sessionId = params.get("session_id");

    if (stripeStatus === "success") {
      setPaymentNotice(
        "Payment successful! We are verifying your payment and updating your subscription. Please wait..."
      );

      verifySubscriptionAfterPayment();
    }

    if (stripeStatus === "cancelled") {
      handleStripeCancellation(sessionId);
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

  // HANDLE IMMEDIATE STRIPE CANCELLATION
  async function handleStripeCancellation(sessionId) {
    if (!sessionId) {
      setPaymentNotice(
        "Payment was cancelled, but the Stripe session ID was not received. Please contact support if your payment status is unclear."
      );
      return;
    }

    try {
      setPaymentNotice(
        "Cancelling your payment session. Please wait..."
      );

      const response = await cancelStripeCheckout(sessionId);

      sessionStorage.removeItem("mindspring_pending_plan_id");

      setPaymentNotice(
        response.message ||
          "Payment cancelled successfully. No credits have been added."
      );

      await loadSubscriptionData(false);
    } catch (err) {
      console.error("Stripe cancellation error:", err);

      setPaymentNotice(
        err.message ||
          "Unable to confirm payment cancellation. Please try again or contact support."
      );
    }
  }

  // VERIFY PAYMENT AFTER STRIPE RETURN
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

    setPaymentNotice(
      "Payment was completed, but subscription activation is taking longer than expected. Please contact the administrator to verify your payment. Do not pay again."
    );
  }

  // FORMAT PRICE
  function formatPrice(price) {
    if (price === null || price === undefined || price === "") {
      return "Price unavailable";
    }

    return `LKR ${Number(price).toLocaleString("en-LK")}`;
  }

  // GET PLAN FEATURES
  function getPlanFeatures(plan) {
    const features = [];

    if (
      plan.video_credits !== null &&
      plan.video_credits !== undefined
    ) {
      features.push(`${plan.video_credits} Video Credits`);
    }

    if (
      plan.max_children !== null &&
      plan.max_children !== undefined
    ) {
      features.push(
        `${plan.max_children} ${
          Number(plan.max_children) === 1 ? "Child" : "Children"
        }`
      );
    }

    if (plan.plan_type === "FAMILY") {
      features.push("Shared Family Credits");
    }

    if (plan.billing_type === "ONE_TIME") {
      features.push("No Expiry");
    } else if (
      plan.validity_days !== null &&
      plan.validity_days !== undefined
    ) {
      features.push(`${plan.validity_days} Days Validity`);
    }

    return features;
  }

  // CHECK CURRENT PLAN
  function isCurrentPlan(plan) {
    return (
      Number(subscription?.plan?.plan_id) ===
        Number(plan.plan_id) &&
      String(subscription?.status || "").toUpperCase() === "ACTIVE"
    );
  }

  // CHOOSE PLAN
  function handleChoosePlan(plan) {
    if (isCurrentPlan(plan)) return;

    setSelectedPlan(plan);
    setPaymentMessage("");
  }

  // CLOSE POPUP
  function handleClosePopup() {
    if (paymentLoading) return;

    setSelectedPlan(null);
    setPaymentMessage("");
  }

  // CREATE IDEMPOTENCY KEY
  function createIdempotencyKey() {
    if (window.crypto?.randomUUID) {
      return `stripe-payment-${window.crypto.randomUUID()}`;
    }

    return `stripe-payment-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;
  }

  // CONTINUE TO STRIPE PAYMENT
  async function handleContinuePayment() {
    if (!selectedPlan || paymentLoading) return;

    try {
      setPaymentLoading(true);
      setPaymentMessage("");

      const idempotencyKey = createIdempotencyKey();

      const response = await createStripeCheckout(
        selectedPlan.plan_id,
        idempotencyKey
      );

      if (!response?.checkout_url) {
        throw new Error(
          "Unable to create Stripe Checkout session. Please try again."
        );
      }

      sessionStorage.setItem(
        "mindspring_pending_plan_id",
        String(selectedPlan.plan_id)
      );

      window.location.assign(response.checkout_url);
    } catch (err) {
      console.error("Stripe checkout error:", err);

      setPaymentMessage(
        err.message || "Unable to start payment. Please try again."
      );

      setPaymentLoading(false);
    }
  }

  // GET PLAN ICON
  function getPlanIcon(plan) {
    return plan.plan_type === "FAMILY"
      ? "👨‍👩‍👧‍👦"
      : "🎬";
  }

  // LOADING SCREEN
  if (loading) {
    return (
      <section className="subscription-page">
        <div className="subscription-container">
          <div className="subscription-loading">
            <span className="subscription-loading-icon">👑</span>
            <p>Loading your membership plans...</p>
          </div>
        </div>
      </section>
    );
  }

  // MAIN PAGE
  return (
    <section className="subscription-page">
      <div className="subscription-container">

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
            <p>{error}</p>

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

        {/* AVAILABLE PLANS HEADING */}
        <div className="subscription-section-heading">
          <div>
            <span className="subscription-section-eyebrow">
              MEMBERSHIP OPTIONS
            </span>

            <h2>Available Plans</h2>

            <p>
              Select the plan that works best for your family.
            </p>
          </div>
        </div>

        {/* SUBSCRIPTION PLAN CARDS */}
        <div className="subscription-plans-grid">

          {/* FREE PLAN - DISPLAY ONLY, NO BUTTON */}
          <article className="subscription-plan-card free-plan-card">
            <div className="subscription-plan-icon">
              🌱
            </div>

            <h3>Free</h3>

            <div className="subscription-plan-price">
              <strong>LKR 0</strong>
            </div>

            <p className="subscription-plan-billing">
              Free Plan
            </p>

            <div className="subscription-plan-divider" />

            <ul className="subscription-plan-features">
              <li>
                <span>✓</span>
                3 Video Credits
              </li>

              <li>
                <span>✓</span>
                1 Child
              </li>

              <li>
                <span>✓</span>
                No Expiry
              </li>
            </ul>

            {/* Intentionally no button on Free plan */}
          </article>

          {/* ELIGIBLE PAID PLANS FROM BACKEND */}
          {plans.map((plan) => {
            const current = isCurrentPlan(plan);
            const family = plan.plan_type === "FAMILY";

            return (
              <article
                key={plan.plan_id}
                className={[
                  "subscription-plan-card",
                  family
                    ? "family-plan-card"
                    : "individual-plan-card",
                  current ? "current-plan-card" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="subscription-plan-icon">
                  {getPlanIcon(plan)}
                </div>

                <h3>{plan.plan_name}</h3>

                <div className="subscription-plan-price">
                  <strong>{formatPrice(plan.price_lkr)}</strong>
                </div>

                <p className="subscription-plan-billing">
                  One-time payment
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
                  {current ? (
                    <>
                      <span>✓</span> Current Plan
                    </>
                  ) : (
                    "Choose Plan"
                  )}
                </button>
              </article>
            );
          })}
        </div>

        {/* PLAN CONFIRMATION POPUP */}
        {selectedPlan && createPortal(
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

              <div className="subscription-modal-icon">
                {getPlanIcon(selectedPlan)}
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
                    {selectedPlan.billing_type === "ONE_TIME"
                      ? "No Expiry"
                      : selectedPlan.validity_days != null
                      ? `${selectedPlan.validity_days} Days`
                      : "—"}
                  </strong>
                </div>
              </div>

              <div className="subscription-modal-notice">
                <strong>🔒 Secure Stripe Payment</strong>

                <p>
                  Continue to Stripe's secure checkout page to
                  complete your one-time subscription payment.
                </p>

                <span>
                  Your credits will be added after successful payment
                  verification. No automatic renewal.
                </span>
              </div>

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
                  Back
                </button>

                <button
                  type="button"
                  className="subscription-modal-continue"
                  onClick={handleContinuePayment}
                  disabled={paymentLoading}
                >
                  {paymentLoading
                    ? "Connecting to Stripe..."
                    : "Continue to Payment"}
                </button>
              </div>
            </div>
          </div>,
          document.body
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
