import "../../styles/parent-dashboard/notification-panel.css";


function NotificationPanel({ isOpen, onToggle }) {
  return (
    <div className="notification-wrapper">
      <button
        type="button"
        className="notification-btn"
        aria-label="Notifications"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        🔔
      </button>

      {isOpen && (
        <div className="dashboard-dropdown">
          <h4>Notifications</h4>
          <p>No new notifications.</p>
        </div>
      )}
    </div>
  );
}

export default NotificationPanel;
