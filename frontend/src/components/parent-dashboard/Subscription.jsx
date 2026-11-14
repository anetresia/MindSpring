
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
        "Payment completed at Stripe. Your subscription is being refreshed. If the plan has not updated yet, please refresh again in a moment."
      );

      loadSubscriptionData();
    } else if (stripeStatus === "cancelled") {
      setPaymentNotice(
        "Payment was cancelled. No credits have been added to your account."
      );
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
  // LOAD SUBSCRIPTION DATA
  // ========================================

  async function loadSubscriptionData() {
    try {
      setLoading(true);
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

      setPlans(plansList);
      setSubscription(subscriptionData?.subscription || null);
    } catch (err) {
      console.error("Unable to load subscription:", err);

      setError(
        err.message || "Unable to load subscription details."
      );
    } finally {
      setLoading(false);
    }
  }

  // ========================================
  // FORMAT PRICE
  // ========================================

  function formatPrice(price) {
    return `LKR ${Number(price || 0).toLocaleString("en-LK")}`;
  }

  // ========================================
  // GET PLAN FEATURES
  // ========================================

  function getPlanFeatures(plan) {
    const features = [];

    features.push(`${plan.video_credits} Video Credits`);

    features.push(
      `${plan.max_children} ${
        Number(plan.max_children) === 1 ? "Child" : "Children"
      }`
    );

    if (plan.plan_type === "FAMILY") {
      features.push("Shared Family Credits");
    }

    if (plan.validity_days) {
      features.push(`${plan.validity_days} Days Validity`);
    } else if (plan.billing_type === "ONE_TIME") {
      features.push("No Expiry");
    }

    if (plan.plan_type === "FREE") {
      features.push("Basic Learning Access");
    }

    return features;
  }

  // ========================================
  // CHECK CURRENT PLAN
  // ========================================

  function isCurrentPlan(plan) {
    return subscription?.plan?.plan_id === plan.plan_id;
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
        "Free Plan is assigned automatically during registration. Existing accounts without a Free Plan need backend assignment."
      );
      return;
    }

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

      // Redirect to Stripe hosted checkout page.
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
              onClick={loadSubscriptionData}
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
                {plan.plan_code === "FAMILY_50" && (
                  <div className="subscription-popular-label">
                    BEST VALUE
                  </div>
                )}

                {plan.plan_code === "INDIVIDUAL_30" && (
                  <div className="subscription-popular-label">
                    POPULAR
                  </div>
                )}

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
                    : `${plan.validity_days || 30} days`}
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

        {/* CENTER CONFIRMATION POPUP */}

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

              {/* PLAN DETAILS */}

              <div className="subscription-modal-details">
                <div>
                  <span>Video Credits</span>
                  <strong>{selectedPlan.video_credits}</strong>
                </div>

                <div>
                  <span>Children</span>
                  <strong>{selectedPlan.max_children}</strong>
                </div>

                <div>
                  <span>Plan Type</span>
                  <strong>{selectedPlan.plan_type}</strong>
                </div>

                <div>
                  <span>Validity</span>
                  <strong>
                    {selectedPlan.validity_days
                      ? `${selectedPlan.validity_days} Days`
                      : selectedPlan.billing_type === "ONE_TIME"
                      ? "No Expiry"
                      : "Free"}
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

              {/* STRIPE CHECKOUT NOTICE */}

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

              {/* ERROR / STATUS MESSAGE */}

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
