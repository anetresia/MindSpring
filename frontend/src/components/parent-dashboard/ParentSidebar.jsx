
import logo from "../../assets/mindspring-logo.png";
import "../../styles/parent-dashboard/parent-sidebar.css";

function ParentSidebar({
  activeMenu,
  onMenuClick,
  isOpen,
  onClose,
}) {
  const menuItems = [
    { name: "Dashboard", icon: "🏠" },
    { name: "My Children", icon: "🧒" },
    {
      name: "Learning Progress",
      icon: "🌟",
      action: "Reports",
    },
    { name: "Rewards", icon: "⭐" },
    { name: "Subscription", icon: "👑" },
  ];

  return (
    <>
      {isOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          onClick={onClose}
          aria-label="Close sidebar"
        />
      )}

      <aside
        className={`parent-sidebar ${
          isOpen ? "sidebar-open" : ""
        }`}
      >
        <div className="dashboard-logo">
          <img src={logo} alt="MindSpring Logo" />

          <button
            type="button"
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close menu"
          >
            ×
          </button>
        </div>

        <nav className="dashboard-menu">
          {menuItems.map((item) => {
            const menuAction = item.action || item.name;

            const isActive =
              activeMenu === item.name ||
              activeMenu === menuAction;

            return (
              <button
                key={item.name}
                type="button"
                className={`dashboard-menu-item ${
                  isActive ? "active" : ""
                }`}
                onClick={() => {
                  onMenuClick(menuAction);
                  if (onClose) onClose();
                }}
              >
                <span className="menu-icon">
                  {item.icon}
                </span>

                <span>{item.name}</span>

                {isActive && (
                  <span className="menu-active-dot" />
                )}
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

export default ParentSidebar;
