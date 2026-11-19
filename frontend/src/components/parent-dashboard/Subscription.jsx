
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  getSubscriptionPlans,
  createStripeCheckout,
} from "../../api";

import { pendingSubscriptionKey } from "./useStripeCheckoutReturn";
import "../../styles/parent-dashboard/subscription.css";

function Subscription({
  subscriptionData,
  subscriptionLoading,
  subscriptionError,
  refreshSubscription,
  checkoutReturn,
}) {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const plansRequest = useRef(null);
  const subscription = subscriptionData?.subscription;
  const freePlan = subscription?.plan?.plan_type === "FREE" ? subscription.plan : null;

  const loadPlans = useCallback(() => {
    if (plansRequest.current) return plansRequest.current;

    setLoading(true);
    setError("");
    plansRequest.current = getSubscriptionPlans()
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.plans ?? [];
        setPlans(list.filter((plan) => plan.plan_type !== "FREE" && Number(plan.price_lkr) > 0));
      })
      .catch((error) => setError(error.message || "Unable to load membership plans."))
      .finally(() => {
        plansRequest.current = null;
        setLoading(false);
      });
    return plansRequest.current;
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadPlans);
  }, [loadPlans]);

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

      sessionStorage.removeItem(pendingSubscriptionKey);
      if (response.subscription_id != null) {
        sessionStorage.setItem(pendingSubscriptionKey, String(response.subscription_id));
      }

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

  // MAIN PAGE
  return (
    <section className="subscription-page">
      <div className="subscription-container">

        {/* PAYMENT RETURN NOTICE */}
        {checkoutReturn.notice && (
          <div className="subscription-modal-message subscription-return-notice">
            <p role="status">{checkoutReturn.notice.message}</p>
            {!checkoutReturn.notice.busy && (
              <div className="subscription-return-actions">
                {checkoutReturn.notice.retry && (
                  <button type="button" onClick={checkoutReturn.retry}>Try again</button>
                )}
                <button type="button" onClick={checkoutReturn.dismiss}>Dismiss</button>
              </div>
            )}
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="subscription-error">
            <p>{error}</p>

            <button
              type="button"
              onClick={loadPlans}
            >
              Try Again
            </button>
          </div>
        )}

        {subscriptionError && (
          <div className="subscription-error" role="alert">
            <p>{subscriptionError}</p>
            <button type="button" onClick={() => refreshSubscription()}>Retry subscription refresh</button>
          </div>
        )}
        {subscriptionLoading && <p role="status">Loading your subscription…</p>}
        {!subscriptionLoading && !subscriptionError && subscriptionData?.has_subscription === false && (
          <div className="current-subscription-card">No active subscription</div>
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

              {subscription.credits && (
                <p>
                  {subscription.credits.remaining_credits} of {subscription.credits.total_credits}
                  {" "}{subscription.plan?.plan_type === "FAMILY" ? "shared family credits" : "credits"} remaining
                </p>
              )}
              {subscription.starts_at && <p>Started {new Date(subscription.starts_at).toLocaleDateString()}</p>}
              {subscription.expires_at && <p>Ends {new Date(subscription.expires_at).toLocaleDateString()}</p>}
            </div>

            <div className="current-subscription-status">
              {subscription.status}
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
        {loading && <p role="status">Loading your membership plans…</p>}
        {!loading && !error && plans.length === 0 && <p>No paid plans are available for your household.</p>}
        {!loading && <div className="subscription-plans-grid">

          {/* FREE PLAN - DISPLAY ONLY, NO BUTTON */}
          <article className="subscription-plan-card free-plan-card">
            <div className="subscription-plan-icon">
              🌱
            </div>

            <h3>Free</h3>

            <div className="subscription-plan-price">
              {freePlan && <strong>{formatPrice(freePlan.price_lkr)}</strong>}
            </div>

            <p className="subscription-plan-billing">
              Free Plan
            </p>

            <div className="subscription-plan-divider" />

            <ul className="subscription-plan-features">
              {freePlan && getPlanFeatures(freePlan).map((feature) => (
                <li key={feature}><span aria-hidden="true">✓</span> {feature}</li>
              ))}
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
        </div>}

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
                  <span>Billing</span>
                  <strong>One-time payment</strong>
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
