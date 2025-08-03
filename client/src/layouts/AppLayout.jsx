import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Breadcrumbs from '../components/BreadCrumbs'; // Breadcrumbs component
import Sidebar from '../components/Sidebar'; // Sidebar component
import MobileTopBar from './MobileTopBar'; // Mobile-specific top bar

/**
 * AppLayout component defines the main layout structure for the application.
 * It includes a responsive sidebar (desktop) or top bar (mobile), breadcrumbs,
 * and renders child routes via an Outlet.
 *
 * @returns {JSX.Element} The main application layout.
 */
const AppLayout = () => {
  // State to manage the collapsed/expanded state of the sidebar.
  const [isCollapsed, setIsCollapsed] = useState(false);

  /**
   * Toggles the collapsed state of the sidebar.
   */
  const toggleSidebar = () => {
    setIsCollapsed(prevState => !prevState);
  };

  return (
    // Main container for the application layout.
    <div className="min-h-screen bg-slate-100 dark:bg-gray-900">

      {/* Desktop Sidebar: Hidden on small screens (md breakpoint and below). */}
      <div className="hidden md:block">
        <Sidebar isCollapsed={isCollapsed} onToggle={toggleSidebar} />
      </div>

      {/* Mobile Top Bar: Shown only on small screens (md breakpoint and below). */}
      <MobileTopBar />

      {/* Main Content Area: Renders the current route's components. */}
      {/* Applies dynamic left margin to account for the fixed sidebar, and top padding for mobile top bar. */}
      <main
        className={`transition-all duration-300 ease-in-out
          pt-16 md:pt-0 ${ /* pt-16 for mobile to clear fixed top bar, pt-0 for desktop */ ''}
          ${isCollapsed ? 'md:ml-[72px]' : 'md:ml-[260px]'}` /* Dynamic left margin based on sidebar state */}
      >
        <div className="p-4 md:p-6">
          <Breadcrumbs /> {/* Breadcrumbs for navigation */}
          <Outlet /> {/* Renders nested routes */}
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
