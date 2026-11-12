
import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  getChildren,
  getParentProfile,
  getChildrenRewardTotals,
  getRecentActivities,
} from "../api";

import ParentSidebar from "../components/parent-dashboard/ParentSidebar";
import ParentTopbar from "../components/parent-dashboard/ParentTopbar";
import DashboardOverview from "../components/parent-dashboard/DashboardOverview";
import MyChildren from "../components/parent-dashboard/MyChildren";
import ParentProfile from "../components/parent-dashboard/ParentProfile";
import LearningPreferences from "../components/parent-dashboard/LearningPreferences";
import TopicSelection from "../components/parent-dashboard/TopicSelection";
import Rewards from "../components/parent-dashboard/Rewards";

import parentDashboardBg from "../assets/parent-dashboard-bg.png";

import "../styles/parent-dashboard/dashboard-layout.css";

function ParentDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  // GET STORED PARENT DETAILS
  const storedUser =
    sessionStorage.getItem("user") ||
    localStorage.getItem("user");

  let parent = location.state?.parent || null;

  if (!parent && storedUser) {
    try {
      parent = JSON.parse(storedUser);
    } catch (error) {
      console.error("Unable to read parent details:", error);
      parent = null;
    }
  }

  // STATES
  const [parentData, setParentData] = useState(parent || {});
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [children, setChildren] = useState([]);
  const [childrenLoading, setChildrenLoading] = useState(true);
  const [childrenError, setChildrenError] = useState("");

  const [rewardTotals, setRewardTotals] = useState([]);
  const [rewardsLoading, setRewardsLoading] = useState(true);
  const [rewardsError, setRewardsError] = useState("");

  // RECENT ACTIVITIES STATES
  const [recentActivities, setRecentActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [activitiesError, setActivitiesError] = useState("");

  // DASHBOARD ADD CHILD POPUP
  const [showAddChildModal, setShowAddChildModal] = useState(false);

  // LOAD CHILDREN
  const loadChildren = useCallback(async () => {
    try {
      setChildrenLoading(true);
      setChildrenError("");

      const data = await getChildren();

      const childrenList = Array.isArray(data)
        ? data
        : Array.isArray(data?.children)
        ? data.children
        : Array.isArray(data?.data)
        ? data.data
        : [];

      setChildren(childrenList);
    } catch (error) {
      console.error("Error loading children:", error);
      setChildrenError(
        error.message || "Unable to load child details."
      );
    } finally {
      setChildrenLoading(false);
    }
  }, []);

  // LOAD CHILD REWARD TOTALS
  const loadRewardTotals = useCallback(async () => {
    try {
      setRewardsLoading(true);
      setRewardsError("");

      const data = await getChildrenRewardTotals();

      const rewardsList = Array.isArray(data)
        ? data
        : Array.isArray(data?.children)
        ? data.children
        : Array.isArray(data?.data)
        ? data.data
        : [];

      setRewardTotals(rewardsList);
    } catch (error) {
      console.error("Error loading child rewards:", error);
      setRewardsError(
        error.message || "Unable to load rewards."
      );
      setRewardTotals([]);
    } finally {
      setRewardsLoading(false);
    }
  }, []);

  // LOAD RECENT LEARNING ACTIVITIES
  const loadRecentActivities = useCallback(async () => {
    try {
      setActivitiesLoading(true);
      setActivitiesError("");

      const data = await getRecentActivities();

      const activitiesList = Array.isArray(data)
        ? data
        : Array.isArray(data?.activities)
        ? data.activities
        : Array.isArray(data?.data)
        ? data.data
        : [];

      setRecentActivities(activitiesList);
    } catch (error) {
      console.error("Error loading recent activities:", error);

      setActivitiesError(
        error.message || "Unable to load recent activities."
      );

      setRecentActivities([]);
    } finally {
      setActivitiesLoading(false);
    }
  }, []);

  // LOAD PARENT PROFILE
  const loadParentProfile = useCallback(async () => {
    try {
      const data = await getParentProfile();

      setParentData((previous) => ({
        ...previous,
        ...data,
      }));
    } catch (error) {
      console.error("Unable to load parent profile:", error);
    }
  }, []);

  // INITIAL DATA LOADING
  useEffect(() => {
    loadChildren();
    loadRewardTotals();
    loadRecentActivities();
    loadParentProfile();
  }, [
    loadChildren,
    loadRewardTotals,
    loadRecentActivities,
    loadParentProfile,
  ]);

  // CLOSE SIDEBAR WITH ESCAPE
  useEffect(() => {
    function handleEscapeKey(event) {
      if (event.key === "Escape") {
        setIsSidebarOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscapeKey);

    return () => {
      window.removeEventListener("keydown", handleEscapeKey);
    };
  }, []);

  // OPEN CHILD DASHBOARD
  function handleOpenChildDashboard(child) {
    const childId = child?.child_id || child?.id;

    if (!childId) {
      console.error("Child ID is missing.");
      return;
    }

    const storedParent =
      sessionStorage.getItem("user") ||
      localStorage.getItem("user");

    let parentDetails = parentData;

    try {
      if (storedParent) {
        parentDetails = JSON.parse(storedParent);
      }
    } catch (error) {
      console.error("Unable to read parent details:", error);
    }

    navigate(`/child-dashboard/${childId}`, {
      state: {
        child,
        parent: parentDetails,
      },
    });
  }

  // LOGOUT
  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");

    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("user");

    navigate("/", { replace: true });
  }

  // SIDEBAR MENU
  function handleMenuClick(menuName) {
    setActiveMenu(menuName);
    setIsSidebarOpen(false);
    setShowAddChildModal(false);

    const scrollArea = document.querySelector(
      ".parent-dashboard-scroll"
    );

    if (scrollArea) {
      scrollArea.scrollTop = 0;
    }
  }

  // SIDEBAR TOGGLE
  function handleSidebarToggle() {
    setIsSidebarOpen((previous) => !previous);
  }

  function handleSidebarClose() {
    setIsSidebarOpen(false);
  }

  // UPDATE PARENT PROFILE
  function handleProfileUpdate(updatedProfile) {
    setParentData((previous) => {
      const updatedData = {
        ...previous,
        ...updatedProfile,
      };

      const storage = localStorage.getItem("user")
        ? localStorage
        : sessionStorage;

      const stored = storage.getItem("user");

      if (stored) {
        try {
          storage.setItem(
            "user",
            JSON.stringify({
              ...JSON.parse(stored),
              ...updatedProfile,
            })
          );
        } catch (error) {
          console.error(
            "Unable to update stored profile:",
            error
          );
        }
      }

      return updatedData;
    });
  }

  // REFRESH CHILDREN, REWARDS AND ACTIVITIES
  async function refreshDashboardChildren() {
    await Promise.all([
      loadChildren(),
      loadRewardTotals(),
      loadRecentActivities(),
    ]);
  }

  // DASHBOARD UI
  return (
    <main
      className="parent-dashboard parent-dashboard-page"
      style={{
        backgroundImage: `url(${parentDashboardBg})`,
      }}
    >
      <ParentSidebar
        activeMenu={activeMenu}
        onMenuClick={handleMenuClick}
        isOpen={isSidebarOpen}
        onClose={handleSidebarClose}
      />

      <section className="parent-main-content">
        <ParentTopbar
          parentName={parentData?.name || "Parent"}
          parentEmail={parentData?.email || ""}
          profileImage={parentData?.profile_image || ""}
          onLogout={handleLogout}
          onProfileClick={() => handleMenuClick("Profile")}
          onMenuClick={handleSidebarToggle}
          isSidebarOpen={isSidebarOpen}
        />

        <div className="parent-dashboard-scroll">
          {/* DASHBOARD OVERVIEW */}

          {activeMenu === "Dashboard" && (
            <DashboardOverview
              parentName={parentData?.name || "Parent"}
              children={children}
              rewardTotals={rewardTotals}
              rewardsLoading={rewardsLoading}
              rewardsError={rewardsError}
              recentActivities={recentActivities}
              activitiesLoading={activitiesLoading}
              activitiesError={activitiesError}
              loading={childrenLoading}
              error={childrenError}
              onAddChild={() => setShowAddChildModal(true)}
              onViewReports={() => handleMenuClick("Rewards")}
            />
          )}

          {/* MY CHILDREN AND DASHBOARD ADD CHILD POPUP */}

          {(activeMenu === "Dashboard" ||
            activeMenu === "My Children") && (
            <MyChildren
              children={children}
              setChildren={setChildren}
              loading={childrenLoading}
              childrenError={childrenError}
              refreshChildren={refreshDashboardChildren}
              onOpenChildDashboard={handleOpenChildDashboard}
              dashboardMode={activeMenu === "Dashboard"}
              openAddChildOnDashboard={showAddChildModal}
              onDashboardAddChildClose={() =>
                setShowAddChildModal(false)
              }
            />
          )}

          {/* LEARNING PREFERENCES */}

          {activeMenu === "Learning Preferences" && (
            <LearningPreferences
              children={children}
              loading={childrenLoading}
              error={childrenError}
            />
          )}

          {/* LIFE SKILL TOPICS */}

          {activeMenu === "Life Skill Topics" && (
            <TopicSelection
              children={children}
              loading={childrenLoading}
              error={childrenError}
            />
          )}

          {/* REWARDS */}

          {activeMenu === "Rewards" && (
            <Rewards children={children} />
          )}

          {/* PARENT PROFILE */}

          {activeMenu === "Profile" && (
            <ParentProfile
              onProfileUpdate={handleProfileUpdate}
              onLogout={handleLogout}
            />
          )}

          {/* OTHER MENU SECTIONS */}

          {activeMenu !== "Dashboard" &&
            activeMenu !== "My Children" &&
            activeMenu !== "Learning Preferences" &&
            activeMenu !== "Life Skill Topics" &&
            activeMenu !== "Rewards" &&
            activeMenu !== "Profile" && (
              <div className="dashboard-content">
                <h2>{activeMenu}</h2>
                <p>This section will be available soon.</p>
              </div>
            )}
        </div>
      </section>
    </main>
  );
}

export default ParentDashboard;
