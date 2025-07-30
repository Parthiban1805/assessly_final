import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Breadcrumbs from '../components/BreadCrumbs';
import Sidebar from '../components/Sidebar';
import MobileTopBar from './MobileTopBar';

const AppLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(prevState => !prevState);
  };

  return (
    <div className="min-h-screen bg-slate-100">
      
      {/* Desktop Sidebar: Hidden on mobile. We don't need a flex wrapper anymore. */}
      <div className="hidden md:block">
        <Sidebar isCollapsed={isCollapsed} onToggle={toggleSidebar} />
      </div>

      {/* Mobile Top Bar: Shown only on mobile */}
      <MobileTopBar />

      {/* Main Content Area */}
      {/* This now correctly gets a margin-left to avoid being hidden by the fixed sidebar */}
      <main 
        className={`transition-all duration-300 ease-in-out
          pt-16 md:pt-0
          ${isCollapsed ? 'md:ml-[72px]' : 'md:ml-[260px]'}`}
      >
        <div className="p-4 md:p-6">
          <Breadcrumbs />
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;