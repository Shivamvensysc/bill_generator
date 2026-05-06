// src/components/Layout/Sidebar.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Users,
  FileText,
  PlusCircle,
  LogOut,
  Settings
} from 'lucide-react';

interface SidebarProps {
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onLogout }) => {
  const menuItems = [
    { path: '/vendors', label: 'All Vendors', icon: Users, end: true },
    { path: '/vendors/create', label: 'Create Vendor', icon: PlusCircle, end: true },
    { path: '/settings', label: 'Settings', icon: Settings, end: true },
  ];

  return (
    <aside className="w-72 bg-gradient-to-b from-gray-900 to-gray-800 text-white h-screen fixed left-0 top-0 flex flex-col">
      
      {/* Logo */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <FileText className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-xl font-bold">BillMaster</h1>
            <p className="text-xs text-gray-400">Invoice Generator</p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav className="p-4 flex-1">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end} // 🔥 THIS LINE FIXES YOUR ISSUE
              className={({ isActive }) =>
                `w-full flex items-center space-x-3 px-4 py-3 rounded-lg mb-2 transition-all ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-lg'
                    : 'text-gray-300 hover:bg-gray-700'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={onLogout}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-red-600 hover:text-white transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;