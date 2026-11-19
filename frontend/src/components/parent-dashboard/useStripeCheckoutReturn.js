import { useCallback, useEffect, useRef, useState } from "react";
import { cancelStripeCheckout } from "../../api";

export const pendingSubscriptionKey = "mindspring_pending_subscription_id";

export function useStripeCheckoutReturn({ location, navigate, refreshSubscription }) {
  const [notice, setNotice] = useState(null);
  const handled = useRef(new Set());
  const busy = useRef(false);
  const mounted = useRef(false);
  const latestLocation = useRef(location);

  useEffect(() => {
    latestLocation.current = location;
  }, [location]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const clearReturn = useCallback((search) => {
    const current = latestLocation.current;
    if (current.search !== search) return;

    const params = new URLSearchParams(search);
    params.delete("stripe");
    params.delete("session_id");
    navigate({ pathname: current.pathname, search: params.toString(), hash: current.hash }, {
      replace: true,
      state: current.state,
    });
  }, [navigate]);

  const processReturn = useCallback(async (search) => {
    if (busy.current) return;
    const params = new URLSearchParams(search);
    const outcome = params.get("stripe");
    const sessionId = params.get("session_id");
    const cancellation = outcome === "cancelled";
    busy.current = true;
    setNotice({
      search,
      busy: true,
      message: cancellation ? "Cancelling checkout…" : "Verifying your payment…",
    });

    try {
      if (cancellation) {
        if (!sessionId || sessionId.includes("{CHECKOUT_SESSION_ID}")) {
          setNotice({ search, message: "Could not confirm checkout cancellation. The Stripe session ID is unavailable." });
          await refreshSubscription();
          return;
        }

        const response = await cancelStripeCheckout(sessionId);
        if (response?.success !== true) throw new Error("Cancellation was not confirmed.");
        sessionStorage.removeItem(pendingSubscriptionKey);
        sessionStorage.removeItem("mindspring_pending_plan_id");
        clearReturn(search);
        setNotice({
          message: response.message || "Checkout cancelled successfully. No credits were added.",
        });
        await refreshSubscription();
        return;
      }

      const expectedId = sessionStorage.getItem(pendingSubscriptionKey);
      const attempts = expectedId ? 30 : 1;
      for (let index = 0; index < attempts && mounted.current; index++) {
        const data = await refreshSubscription({ background: index > 0 });
        const subscription = data?.subscription;
        if (expectedId && String(subscription?.subscription_id) === expectedId && subscription.status === "ACTIVE") {
          sessionStorage.removeItem(pendingSubscriptionKey);
          sessionStorage.removeItem("mindspring_pending_plan_id");
          clearReturn(search);
          setNotice({ message: "Payment verified. Your subscription and credits have been updated." });
          return;
        }
        if (!data || index === attempts - 1) break;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      if (mounted.current) {
        setNotice({
          search,
          retry: Boolean(expectedId),
          message: "Awaiting payment verification. This checkout's activation has not been confirmed.",
        });
      }
    } catch (error) {
      if (!mounted.current) return;
      await refreshSubscription();
      if (!mounted.current) return;
      if (error.status === 409) {
        setNotice({
          search,
          message: `Awaiting payment verification. ${error.message || "The checkout could not be cancelled."}`,
        });
      } else {
        setNotice({
          search,
          retry: !error.status || error.status >= 500 || error.status === 429,
          message: `Could not confirm checkout cancellation. ${error.message || "Please try again."}`,
        });
      }
    } finally {
      busy.current = false;
    }
  }, [clearReturn, refreshSubscription]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const outcome = params.get("stripe");
    if (outcome !== "success" && outcome !== "cancelled") return;
    const key = JSON.stringify([outcome, params.get("session_id")]);
    if (handled.current.has(key) || busy.current) return;
    handled.current.add(key);
    void Promise.resolve().then(() => processReturn(location.search));
  }, [location.search, processReturn]);

  return {
    notice,
    retry: () => { if (notice?.retry) void processReturn(notice.search); },
    dismiss: () => {
      if (notice?.search) clearReturn(notice.search);
      setNotice(null);
    },
  };
}
