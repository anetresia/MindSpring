
import { useState, useEffect, useRef, useCallback } from "react";
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "../../api";

import "../../styles/parent-dashboard/notification-panel.css";

function NotificationPanel({ isOpen, onToggle }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);

  const wrapperRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [notificationData, countData] = await Promise.all([
        getNotifications({ skip: 0, limit: 20 }),
        getUnreadNotificationCount(),
      ]);

      setNotifications(
        Array.isArray(notificationData) ? notificationData : []
      );

      setUnreadCount(countData?.unread_count || 0);
    } catch (err) {
      setError(err.message || "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load and refresh when popup opens
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Refresh notification count periodically
  useEffect(() => {
    const interval = setInterval(() => {
      getUnreadNotificationCount()
        .then((data) => {
          setUnreadCount(data?.unread_count || 0);
        })
        .catch((err) => {
          console.error("Notification count error:", err);
        });
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Close popup when clicking outside
  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target) &&
        isOpen
      ) {
        onToggle();
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen, onToggle]);

  // Mark one notification as read
  const handleNotificationClick = async (notification) => {
    if (notification.is_read || updating) return;

    try {
      setUpdating(true);

      await markNotificationRead(notification.notification_id);

      setNotifications((previous) =>
        previous.map((item) =>
          item.notification_id === notification.notification_id
            ? { ...item, is_read: true }
            : item
        )
      );

      setUnreadCount((previous) => Math.max(0, previous - 1));
    } catch (err) {
      setError(err.message || "Unable to update notification.");
    } finally {
      setUpdating(false);
    }
  };

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || updating) return;

    try {
      setUpdating(true);

      await markAllNotificationsRead();

      setNotifications((previous) =>
        previous.map((item) => ({ ...item, is_read: true }))
      );

      setUnreadCount(0);
    } catch (err) {
      setError(err.message || "Unable to update notifications.");
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="notification-wrapper" ref={wrapperRef}>
      <button
        type="button"
        className="notification-btn"
        aria-label="Notifications"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <span className="notification-bell">🔔</span>

        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="dashboard-dropdown notification-popup">
          <div className="notification-header">
            <div>
              <h4>Notifications</h4>
              <span className="notification-subtitle">
                Your latest updates
              </span>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                className="mark-all-read-btn"
                onClick={handleMarkAllRead}
                disabled={updating}
              >
                Mark all as read
              </button>
            )}
          </div>

          {error && (
            <div className="notification-error">
              {error}
              <button type="button" onClick={fetchNotifications}>
                Retry
              </button>
            </div>
          )}

          {loading && notifications.length === 0 ? (
            <div className="notification-empty">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="notification-empty">
              <span className="empty-notification-icon">🔔</span>
              <strong>No notifications yet</strong>
              <span>You're all caught up!</span>
            </div>
          ) : (
            <div className="notification-list">
              {notifications.map((notification) => (
                <button
                  type="button"
                  key={notification.notification_id}
                  className={`notification-item ${
                    notification.is_read ? "read" : "unread"
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                  disabled={updating}
                >
                  <span className="notification-item-icon">
                    {notification.notification_type?.includes("limit")
                      ? "⏰"
                      : "🔔"}
                  </span>

                  <span className="notification-item-content">
                    <span className="notification-item-title">
                      {notification.title}
                    </span>

                    <span className="notification-item-message">
                      {notification.message}
                    </span>

                    <span className="notification-item-time">
                      {formatDate(notification.sent_at)}
                    </span>
                  </span>

                  {!notification.is_read && (
                    <span className="notification-unread-dot" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationPanel;
