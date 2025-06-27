import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import DashboardHeader from './DashboardHeader';
import { useLayout } from '@/contexts/LayoutContext';
import clsx from 'clsx';

const MainLayout: React.FC = () => {
  const { isSidebarOpen } = useLayout();

  return (
    <div className="flex min-h-screen bg-gray-900 text-white">
      <Sidebar />
      <div
        className={clsx('flex flex-1 flex-col transition-all', {
          'sm:pl-64': isSidebarOpen,
          'sm:pl-20': !isSidebarOpen,
        })}
      >
        <DashboardHeader />
        <main className="flex-1">
          <div className="p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout; 