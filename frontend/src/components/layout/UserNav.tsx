import {
  AreaChart,
  Book,
  FlaskConical,
  HelpCircle,
  ListChecks,
  LogOut,
  Moon,
  Receipt,
  Settings,
  Star,
  Terminal,
  User as UserIcon,
  Shield,
  Crown,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { userService } from "@/services/userService";
import { Button } from "../ui/Button";
import { useState } from "react";
import clsx from "clsx";

const gridItems = [
  { icon: <ListChecks size={24} />, text: "My Lists" },
  { icon: <Book size={24} />, text: "Notebook" },
  { icon: <HelpCircle size={24} />, text: "Submissions" },
  { icon: <AreaChart size={24} />, text: "Progress" },
  { icon: <Star size={24} />, text: "Points" },
];

const listItems = [
  { icon: <FlaskConical size={20} />, text: "Try New Features" },
  { icon: <Receipt size={20} />, text: "Orders" },
  { icon: <Terminal size={20} />, text: "My Playgrounds" },
  { icon: <Settings size={20} />, text: "Settings" },
  { icon: <Moon size={20} />, text: "Appearance" },
];

export function UserNav() {
  const { user, logout, permissions, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="h-8 w-8 rounded-full bg-gray-700 animate-pulse" />
    );
  }

  if (!user) {
    return (
      <div className="relative" onBlur={handleBlur}>
        <Button
          variant="ghost"
          className="relative h-8 w-8 rounded-full"
          onClick={() => setIsOpen(!isOpen)}
        >
          <img
            className="h-8 w-8 rounded-full"
            src="/default-avatar.png"
            alt="Guest avatar"
          />
        </Button>
        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-gray-800 py-1 text-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            <Link
              to="/login"
              className="block px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
              onClick={() => setIsOpen(false)}
            >
              Log In
            </Link>
            <Link
              to="/register"
              className="block px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
              onClick={() => setIsOpen(false)}
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" onBlur={handleBlur}>
      <Button
        variant="ghost"
        className="relative h-8 w-8 rounded-full"
        onClick={() => setIsOpen(!isOpen)}
      >
        <img
          className="h-8 w-8 rounded-full"
          src={user.avatar_url || "/default-avatar.png"}
          alt="User avatar"
        />
      </Button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-xl bg-[#2a2a2a] text-white shadow-2xl focus:outline-none">
          <div className="p-4">
            <div className="mb-4 flex items-center gap-4">
              <img
                className="h-14 w-14 rounded-full"
                src="/default-avatar.png"
                alt=""
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-lg font-semibold">{user.username}</p>
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${userService.getRoleBadgeColor(user.role)}`}>
                    {user.role === 'super_admin' && <Crown size={12} />}
                    {user.role === 'admin' && <Shield size={12} />}
                    {user.role === 'moderator' && <Shield size={12} />}
                    {userService.getRoleDisplayName(user.role)}
                  </div>
                </div>
                <p className="text-sm text-gray-400">{user.email}</p>
                {!permissions.canAccessAdmin && (
                  <Link to="/premium" className="text-sm text-yellow-400 hover:underline">
                    Access all features with our Premium subscription!
                  </Link>
                )}
              </div>
            </div>

            <div className="mb-2 grid grid-cols-3 gap-2">
              {gridItems.map((item) => (
                <div
                  key={item.text}
                  className="flex cursor-pointer flex-col items-center justify-center rounded-lg bg-gray-700/50 p-3 hover:bg-gray-700"
                >
                  {item.icon}
                  <span className="mt-1 text-xs">{item.text}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-700/50 pt-2">
              {listItems.map((item) => (
                <div
                  key={item.text}
                  className={clsx(
                    "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-gray-700/50",
                    { "justify-between": item.text === "Appearance" }
                  )}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.text}</span>
                  </div>
                  {item.text === "Appearance" && <span className="text-xs text-gray-400">&gt;</span>}
                </div>
              ))}
              <Link
                to="/profile"
                className="mt-1 flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-gray-700/50"
                onClick={() => setIsOpen(false)}
              >
                <UserIcon size={20} />
                <span>Profile</span>
              </Link>
              {permissions.canAccessAdmin && (
                <Link
                  to="/admin"
                  className="mt-1 flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-purple-400 hover:bg-gray-700/50"
                  onClick={() => setIsOpen(false)}
                >
                  <Shield size={20} />
                  <span>Admin Panel</span>
                </Link>
              )}
              <button
                onClick={() => {
                  logout();
                  setIsOpen(false);
                }}
                className="mt-1 flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-red-500 hover:bg-gray-700/50"
              >
                <LogOut size={20} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
