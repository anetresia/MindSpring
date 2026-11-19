
import { useEffect, useMemo, useState } from "react";
import { Ban, Check, Clock, CreditCard, Crown, Pencil, Plus, Users } from "lucide-react";

import AdminSidebar from "../components/admin/AdminSidebar";
import AdminHeader from "../components/admin/AdminHeader";

import { API_URL, getAuthHeaders } from "../api";
import welcomeArt from "../assets/subscription-welcome.png";
import totalArt from "../assets/subscription-total-plans.png";
import activeArt from "../assets/subscription-active.png";
import inactiveArt from "../assets/subscription-inactive.png";
import freeArt from "../assets/subscription-free-plan.png";
import booksArt from "../assets/subscription-books-plan.png";
import premiumArt from "../assets/subscription-premium-plan.png";

import "../styles/admin/admin-subscriptions.css";

const planArtwork = {
  free: freeArt,
  books: booksArt,
  premium: premiumArt,
};

function PlanStat({ label, count, icon: Icon, artwork, tone }) {
  return (
    <div className={`admin-sub-stat-card admin-sub-tone-${tone}`}>
      <span className="admin-sub-stat-icon"><Icon aria-hidden="true" /></span>
      <div>
        <p>{label}</p>
        <h3>{count}</h3>
      </div>
      <img src={artwork} alt="" />
    </div>
  );
}

function AdminSubscriptions() {
  const [activeTab, setActiveTab] = useState("plans");

  const [plans, setPlans] = useState([]);
  const [subscribers, setSubscribers] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    price: "",
    credits: "",
    children: "1",
    validity: "No expiry",
  });

  // ========================================
  // API REQUEST
  // ========================================

  async function adminRequest(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...getAuthHeaders(options.body !== undefined),
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      let message = "Something went wrong. Please try again.";

      if (typeof data.detail === "string") {
        message = data.detail;
      } else if (Array.isArray(data.detail)) {
        message = data.detail.map((item) => item.msg).join(", ");
      } else if (data.message) {
        message = data.message;
      }

      throw new Error(message);
    }

    return data;
  }

  // ========================================
  // FORMAT HELPERS
  // ========================================

  function formatPrice(value) {
    return Number(value || 0).toLocaleString("en-LK", {
      maximumFractionDigits: 2,
    });
  }

  function formatDate(value) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString("en-LK", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function getValidity(days) {
    return days ? `${days} days` : "No expiry";
  }

  function getStatus(value) {
    return String(value || "Unknown")
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function getPlanStatus(plan) {
    return plan.is_active ? "Active" : "Inactive";
  }

  function mapPlan(plan) {
    return {
      id: plan.plan_id,
      code: plan.plan_code,
      name: plan.plan_name,
      type: plan.plan_type,
      billingType: plan.billing_type,
      price: Number(plan.price_lkr || 0),
      credits: Number(plan.video_credits || 0),
      children: Number(plan.max_children || 1),
      validity: getValidity(plan.validity_days),
      validityDays: plan.validity_days,
      status: getPlanStatus(plan),
    };
  }

  // ========================================
  // LOAD PLANS
  // ========================================

  async function loadPlans() {
    try {
      const data = await adminRequest("/admin/subscriptions/plans/", {
        method: "GET",
      });

      setPlans((data.plans || []).map(mapPlan));
    } catch (err) {
      setError(err.message || "Unable to load subscription plans.");
    }
  }

  // ========================================
  // LOAD SUBSCRIBERS
  // ========================================

  async function loadSubscribers() {
    try {
      const data = await adminRequest(
        "/admin/subscriptions/subscribers",
        { method: "GET" }
      );

      setSubscribers(data.subscribers || []);
    } catch (err) {
      setError(err.message || "Unable to load subscribers.");
    }
  }

  // ========================================
  // INITIAL LOAD
  // ========================================

  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      setError("");

      try {
        await Promise.all([loadPlans(), loadSubscribers()]);
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, []);

  // ========================================
  // PLAN FORM
  // ========================================

  function openAddForm() {
    setEditingPlan(null);

    setFormData({
      name: "",
      price: "",
      credits: "",
      children: "1",
      validity: "No expiry",
    });

    setError("");
    setShowPlanForm(true);
  }

  function openEditForm(plan) {
    setEditingPlan(plan);

    setFormData({
      name: plan.name,
      price: String(plan.price),
      credits: String(plan.credits),
      children: String(plan.children),
      validity: plan.validity,
    });

    setError("");
    setShowPlanForm(true);
  }

  function handleFormChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function getValidityDays(value) {
    if (value === "No expiry") return null;

    return Number.parseInt(value, 10);
  }

  function createPlanCode(name) {
    const slug = name
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 35);

    return `${slug}_${Date.now().toString().slice(-8)}`.slice(0, 50);
  }

  // ========================================
  // ADD / UPDATE PLAN
  // ========================================

  async function savePlan(event) {
    event.preventDefault();

    if (saving) return;

    const name = formData.name.trim();
    const price = Number(formData.price);
    const credits = Number(formData.credits);
    const children = Number(formData.children);
    const validityDays = getValidityDays(formData.validity);

    if (
      !name ||
      !Number.isFinite(price) ||
      price < 0 ||
      !Number.isInteger(credits) ||
      credits < 0 ||
      !Number.isInteger(children) ||
      children < 1
    ) {
      setError("Please enter valid plan details.");
      return;
    }

    if (editingPlan?.type === "FREE" && price !== 0) {
      setError("The Free plan price must remain LKR 0.");
      return;
    }

    if (
      editingPlan?.billingType === "MONTHLY" &&
      (!validityDays || validityDays <= 0)
    ) {
      setError("Please select a valid duration for this monthly plan.");
      return;
    }

    if (
      editingPlan &&
      editingPlan.billingType !== "MONTHLY" &&
      validityDays !== null
    ) {
      setError("Validity cannot be added to this one-time or free plan.");
      return;
    }

    let payload;

    if (editingPlan) {
      payload = {
        plan_name: name,
        video_credits: credits,
        max_children: children,
        price_lkr: price,
        validity_days: validityDays,
      };
    } else {
      const planType =
        price === 0 ? "FREE" : children > 1 ? "FAMILY" : "INDIVIDUAL";

      const billingType =
        planType === "FREE"
          ? "FREE"
          : planType === "FAMILY"
            ? "MONTHLY"
            : "ONE_TIME";

      if (planType === "FREE" && validityDays !== null) {
        setError("The Free plan must have no expiry.");
        return;
      }

      if (billingType === "MONTHLY" && !validityDays) {
        setError("Please select a validity period for a Family plan.");
        return;
      }

      if (billingType === "ONE_TIME" && validityDays !== null) {
        setError("Individual one-time plans must have no expiry.");
        return;
      }

      payload = {
        plan_code: createPlanCode(name),
        plan_name: name,
        plan_type: planType,
        video_credits: credits,
        max_children: children,
        price_lkr: price,
        billing_type: billingType,
        validity_days: validityDays,
      };
    }

    setSaving(true);
    setError("");

    try {
      if (editingPlan) {
        await adminRequest(
          `/admin/subscriptions/plans/${editingPlan.id}`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          }
        );
      } else {
        await adminRequest("/admin/subscriptions/plans/", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setShowPlanForm(false);
      setEditingPlan(null);

      await loadPlans();
    } catch (err) {
      setError(err.message || "Unable to save the plan.");
    } finally {
      setSaving(false);
    }
  }

  // ========================================
  // ACTIVATE / DEACTIVATE PLAN
  // ========================================

  async function togglePlanStatus(plan) {
    if (saving) return;

    if (plan.type === "FREE" && plan.status === "Active") {
      alert("The Free plan cannot be deactivated.");
      return;
    }

    const nextStatus = plan.status !== "Active";

    const confirmed = window.confirm(
      `Are you sure you want to ${
        nextStatus ? "activate" : "deactivate"
      } ${plan.name}?`
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");

    try {
      await adminRequest(
        `/admin/subscriptions/plans/${plan.id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({
            is_active: nextStatus,
          }),
        }
      );

      await loadPlans();
    } catch (err) {
      setError(err.message || "Unable to update plan status.");
    } finally {
      setSaving(false);
    }
  }

  // ========================================
  // PLAN STATISTICS
  // ========================================

  const activePlanCount = plans.filter(
    (plan) => plan.status === "Active"
  ).length;

  const inactivePlanCount = plans.length - activePlanCount;

  // ========================================
  // SUBSCRIBER STATISTICS
  // ========================================

  const activeSubscribers = subscribers.filter(
    (item) =>
      String(item.status || "").toUpperCase() === "ACTIVE"
  ).length;

  // ========================================
  // PAYMENT HISTORY
  // ========================================

  const paymentHistory = useMemo(() => {
    const result = [];

    subscribers.forEach((subscriber) => {
      const payments =
        subscriber.payment_history ||
        subscriber.payments ||
        [];

      if (Array.isArray(payments) && payments.length > 0) {
        payments.forEach((payment) => {
          result.push({
            ...payment,
            parent_name:
              payment.parent_name || subscriber.parent?.name || "-",
            parent_email:
              payment.parent_email || subscriber.parent?.email || "-",
            plan_name:
              payment.plan_name || subscriber.plan?.plan_name || "-",
          });
        });
      } else if (subscriber.latest_payment) {
        result.push({
          ...subscriber.latest_payment,
          parent_name: subscriber.parent?.name || "-",
          parent_email: subscriber.parent?.email || "-",
          plan_name: subscriber.plan?.plan_name || "-",
        });
      }
    });

    return result.sort((a, b) => {
      return (
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
      );
    });
  }, [subscribers]);

  // ========================================
  // REFRESH CURRENT TAB
  // ========================================

  async function refreshCurrentTab() {
    setLoading(true);
    setError("");

    try {
      if (activeTab === "plans") {
        await loadPlans();
      } else {
        await loadSubscribers();
      }
    } finally {
      setLoading(false);
    }
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="admin-layout admin-subscription-layout">
      <AdminSidebar illustrated />

      <main className="admin-main">
        <AdminHeader title="Subscription Management" />

        <div className="admin-subscription-content">

          {/* WELCOME */}

          <section className="admin-subscription-welcome">
            <div>
              <h2>Subscription Management</h2>
              <p>
                Manage subscription plans and monitor parent
                subscriptions in MindSpring.
              </p>
            </div>

            <img className="admin-subscription-welcome-art" src={welcomeArt} alt="" />
          </section>

          {/* STATISTICS */}

          <section className="admin-subscription-stats">
            <PlanStat label="Total Plans" count={plans.length} icon={Crown} artwork={totalArt} tone="free" />
            <PlanStat label="Active Plans" count={activePlanCount} icon={Users} artwork={activeArt} tone="books" />
            <PlanStat label="Inactive Plans" count={inactivePlanCount} icon={Clock} artwork={inactiveArt} tone="premium" />
          </section>

          {/* ERROR */}

          {error && (
            <div className="admin-subscription-error" role="alert">
              {error}
              <button
                type="button"
                onClick={() => setError("")}
              >
                ×
              </button>
            </div>
          )}

          {/* MAIN PANEL */}

          <section className="admin-subscription-panel">

            {/* TABS */}

            <div className="admin-subscription-toolbar">
              <div className="admin-subscription-tabs">
                <button
                  type="button"
                  className={activeTab === "plans" ? "active" : ""}
                  aria-pressed={activeTab === "plans"}
                  onClick={() => {
                    setActiveTab("plans");
                    setError("");
                  }}
                >
                  <Crown aria-hidden="true" /> Manage Plans
                </button>

                <button
                  type="button"
                  className={
                    activeTab === "subscribers" ? "active" : ""
                  }
                  aria-pressed={activeTab === "subscribers"}
                  onClick={() => {
                    setActiveTab("subscribers");
                    setError("");
                  }}
                >
                  <Users aria-hidden="true" /> Subscribers
                </button>

                <button
                  type="button"
                  className={
                    activeTab === "payments" ? "active" : ""
                  }
                  aria-pressed={activeTab === "payments"}
                  onClick={() => {
                    setActiveTab("payments");
                    setError("");
                  }}
                >
                  <CreditCard aria-hidden="true" /> Payment History
                </button>
              </div>
              {activeTab === "plans" && !loading && (
                <button type="button" className="admin-sub-primary-btn" onClick={openAddForm}>
                  <Plus aria-hidden="true" /> Add New Plan
                </button>
              )}
            </div>

            {/* LOADING */}

            {loading && (
              <div className="admin-subscription-loading">
                Loading subscription data...
              </div>
            )}

            {/* ================================== */}
            {/* MANAGE PLANS */}
            {/* ================================== */}

            {activeTab === "plans" && !loading && (
              <div className="admin-subscription-section">

                <div className="admin-sub-section-heading">
                  <div>
                    <h2>Subscription Plans</h2>
                    <p>
                      Add, edit and manage available plans.
                    </p>
                  </div>

                </div>

                {plans.length === 0 ? (
                  <div className="admin-subscription-empty">
                    <span>♛</span>
                    <h2>No Subscription Plans</h2>
                    <p>
                      No plans were found in the database.
                    </p>
                  </div>
                ) : (
                  <div className="admin-plan-grid">
                    {plans.map((plan) => {
                      const tone = plan.type === "FREE"
                        ? "free"
                        : /\bpro\b|\bpremium\b/i.test(plan.name)
                          ? "premium"
                          : "books";

                      return (
                        <article
                          className={`admin-plan-card admin-sub-tone-${tone}`}
                          key={plan.id}
                        >
                          <div className="admin-plan-card-top">
                            <span className="admin-plan-icon">
                              <Crown aria-hidden="true" />
                            </span>

                            <span
                              className={`admin-plan-status ${
                                plan.status === "Active"
                                  ? "status-active"
                                  : "status-inactive"
                              }`}
                            >
                              {plan.status}
                            </span>
                          </div>

                          <h3>{plan.name}</h3>

                          <h2>
                            LKR {formatPrice(plan.price)}
                          </h2>

                          <div className="admin-plan-details">
                            <div>
                              <p><Check aria-hidden="true" /> {plan.credits} Video Credits</p>
                              <p>
                                <Check aria-hidden="true" /> {`${plan.children} Child${plan.children > 1 ? "ren" : ""}`}
                              </p>
                              <p><Check aria-hidden="true" /> {plan.validity}</p>
                            </div>
                            <img src={planArtwork[tone]} alt="" />
                          </div>

                          <div className="admin-plan-actions">
                            <button
                              type="button"
                              onClick={() => openEditForm(plan)}
                            >
                              <Pencil aria-hidden="true" /> Edit
                            </button>

                            <button
                              type="button"
                              disabled={saving}
                              className={
                                plan.status === "Active"
                                  ? "deactivate-btn"
                                  : "activate-btn"
                              }
                              onClick={() => togglePlanStatus(plan)}
                            >
                              {plan.status === "Active" ? <Ban aria-hidden="true" /> : <Check aria-hidden="true" />}
                              {plan.status === "Active"
                                ? "Deactivate"
                                : "Activate"}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ================================== */}
            {/* SUBSCRIBERS */}
            {/* ================================== */}

            {activeTab === "subscribers" && !loading && (
              <div className="admin-subscription-section">

                <div className="admin-sub-section-heading">
                  <div>
                    <h2>Parent Subscriptions</h2>
                    <p>
                      View parent accounts and their subscription
                      information.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="admin-sub-primary-btn"
                    onClick={refreshCurrentTab}
                  >
                    ↻ Refresh
                  </button>
                </div>

                <div className="admin-subscription-stats">
                  <div className="admin-sub-stat-card">
                    <span>♙</span>
                    <p>Total Subscriptions</p>
                    <h3>{subscribers.length}</h3>
                  </div>

                  <div className="admin-sub-stat-card">
                    <span>✓</span>
                    <p>Active Subscriptions</p>
                    <h3>{activeSubscribers}</h3>
                  </div>
                </div>

                {subscribers.length === 0 ? (
                  <div className="admin-subscription-empty">
                    <span>♙</span>
                    <h2>No Subscribers Found</h2>
                    <p>
                      Parent subscription records will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="admin-sub-table-wrapper">
                    <table className="admin-sub-table">
                      <thead>
                        <tr>
                          <th>Parent</th>
                          <th>Plan</th>
                          <th>Credits</th>
                          <th>Status</th>
                          <th>Start Date</th>
                          <th>End Date</th>
                        </tr>
                      </thead>

                      <tbody>
                        {subscribers.map((item, index) => {
                          // Backend response shape:
                          // parent: { name, email, phone }
                          // plan: { plan_name, ... }
                          // credits: { total, used, remaining }

                          const planName = item.plan?.plan_name || "-";

                          const credits =
                            item.credits?.remaining ??
                            item.credits?.remaining_credits ??
                            0;

                          return (
                            <tr
                              key={
                                item.subscription_id ||
                                item.id ||
                                index
                              }
                            >
                              <td>
                                <strong>
                                  {item.parent?.name || "-"}
                                </strong>

                                <small>
                                  {item.parent?.email || "-"}
                                </small>

                                {item.parent?.phone && (
                                  <small>{item.parent.phone}</small>
                                )}
                              </td>

                              <td>{planName}</td>

                              <td>
                                <strong>{credits} remaining</strong>

                                <small>
                                  {item.credits?.used ?? 0} used /{" "}
                                  {item.credits?.total ?? 0} total
                                </small>
                              </td>

                              <td>
                                <span
                                  className={`admin-plan-status ${
                                    String(item.status).toUpperCase() ===
                                    "ACTIVE"
                                      ? "status-active"
                                      : "status-inactive"
                                  }`}
                                >
                                  {getStatus(item.status)}
                                </span>
                              </td>

                              <td>
                                {formatDate(
                                  item.starts_at || item.created_at
                                )}
                              </td>

                              <td>
                                {formatDate(item.expires_at)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ================================== */}
            {/* PAYMENT HISTORY */}
            {/* ================================== */}

            {activeTab === "payments" && !loading && (
              <div className="admin-subscription-section">

                <div className="admin-sub-section-heading">
                  <div>
                    <h2>Payment History</h2>
                    <p>
                      View subscription payment records.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="admin-sub-primary-btn"
                    onClick={refreshCurrentTab}
                  >
                    ↻ Refresh
                  </button>
                </div>

                {paymentHistory.length === 0 ? (
                  <div className="admin-subscription-empty">
                    <span>▤</span>
                    <h2>No Payment Records</h2>
                    <p>
                      Payment records will appear here when available.
                    </p>
                  </div>
                ) : (
                  <div className="admin-sub-table-wrapper">
                    <table className="admin-sub-table">
                      <thead>
                        <tr>
                          <th>Parent</th>
                          <th>Plan</th>
                          <th>Amount</th>
                          <th>Payment Status</th>
                          <th>Payment Date</th>
                          <th>Reference</th>
                        </tr>
                      </thead>

                      <tbody>
                        {paymentHistory.map((payment, index) => {
                          const amount =
                            payment.amount_lkr ??
                            payment.amount ??
                            payment.total_amount ??
                            0;

                          const status =
                            payment.payment_status ||
                            payment.status ||
                            "Unknown";

                          return (
                            <tr
                              key={
                                payment.payment_id ||
                                payment.id ||
                                index
                              }
                            >
                              <td>
                                <strong>
                                  {payment.parent_name || "-"}
                                </strong>

                                <small>
                                  {payment.parent_email || "-"}
                                </small>
                              </td>

                              <td>{payment.plan_name || "-"}</td>

                              <td>
                                LKR {formatPrice(amount)}
                              </td>

                              <td>
                                <span
                                  className={`admin-plan-status ${
                                    String(status).toUpperCase() ===
                                    "SUCCEEDED" ||
                                    String(status).toUpperCase() ===
                                    "SUCCESS" ||
                                    String(status).toUpperCase() ===
                                    "PAID"
                                      ? "status-active"
                                      : "status-inactive"
                                  }`}
                                >
                                  {getStatus(status)}
                                </span>
                              </td>

                              <td>
                                {formatDate(payment.created_at)}
                              </td>

                              <td>
                                {payment.payment_id ||
                                  payment.stripe_payment_intent_id ||
                                  payment.stripe_session_id ||
                                  payment.id ||
                                  "-"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          </section>

          <footer className="admin-footer">
            Made with care for little learners | MindSpring
          </footer>
        </div>
      </main>

      {/* ================================== */}
      {/* ADD / EDIT PLAN MODAL */}
      {/* ================================== */}

      {showPlanForm && (
        <div
          className="admin-sub-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setShowPlanForm(false);
            }
          }}
        >
          <div className="admin-sub-modal">

            <div className="admin-sub-modal-header">
              <div>
                <h2>
                  {editingPlan ? "Edit Plan" : "Add New Plan"}
                </h2>

                <p>Enter the subscription plan details.</p>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={() => setShowPlanForm(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={savePlan}>

              <label>
                Plan Name

                <input
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder="Enter plan name"
                  required
                />
              </label>

              <label>
                Price (LKR)

                <input
                  type="number"
                  name="price"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={handleFormChange}
                  placeholder="Enter price"
                  required
                />
              </label>

              <label>
                Video Credits

                <input
                  type="number"
                  name="credits"
                  min="0"
                  step="1"
                  value={formData.credits}
                  onChange={handleFormChange}
                  placeholder="Enter credits"
                  required
                />
              </label>

              <label>
                Maximum Children

                <input
                  type="number"
                  name="children"
                  min="1"
                  step="1"
                  value={formData.children}
                  onChange={handleFormChange}
                  required
                  disabled={Boolean(editingPlan)}
                />

                {editingPlan && (
                  <small>
                    Plan type is fixed after creation.
                  </small>
                )}
              </label>

              <label>
                Plan Validity

                <select
                  name="validity"
                  value={formData.validity}
                  onChange={handleFormChange}
                >
                  <option value="No expiry">No expiry</option>
                  <option value="30 days">30 days</option>
                  <option value="60 days">60 days</option>
                  <option value="90 days">90 days</option>
                  <option value="365 days">365 days</option>
                </select>
              </label>

              {!editingPlan && (
                <p className="admin-sub-form-note">
                  Plan type and billing type are determined
                  automatically from the price and maximum
                  children. Family plans require a validity period.
                </p>
              )}

              <div className="admin-sub-modal-actions">

                <button
                  type="button"
                  className="admin-sub-cancel-btn"
                  disabled={saving}
                  onClick={() => setShowPlanForm(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="admin-sub-primary-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingPlan
                      ? "Save Changes"
                      : "Add Plan"}
                </button>

              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminSubscriptions;
