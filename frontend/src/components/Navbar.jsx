import React from 'react';
import { Menu, Sun, Moon, LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Badge from './Badge';

export default function Navbar({ onMenuToggle }) {
  const { user, logout, loggingOut } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const profilePath = user?.role === 'merchant' ? '/merchant/profile'
    : user?.role === 'customer' ? '/customer/profile'
    : null;

  const initials = user?.name
    ? user.name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '';

  const roleLabel = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1).replace('_', ' ')
    : '';

  if (!user) return null;

  return (
    <header className="bg-white dark:bg-dark-card border-b border-slate-100 dark:border-dark-border sticky top-0 z-10 w-full px-6 py-4 flex items-center justify-between text-slate-800 dark:text-slate-100 shadow-sm">
      {/* Left side: Mobile menu toggle + Identity (mobile) + Welcome text (desktop) */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors btn-press"
        >
          <Menu className="w-5 h-5" />
        </button>
        {/* Mobile user info — initials + name + role, visible below sm only */}
        {profilePath && (
          <button
            onClick={() => navigate(profilePath)}
            className="flex sm:hidden items-center gap-2.5"
          >
            {initials && (
              <div className="w-8 h-8 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                {initials}
              </div>
            )}
            {user.name && (
              <div className="flex flex-col text-left leading-tight min-w-0">
                <span className="text-xs font-medium text-slate-800 dark:text-slate-100 truncate max-w-[100px]">{user.name}</span>
                {roleLabel && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{roleLabel}</span>
                )}
              </div>
            )}
          </button>
        )}
        <div className="hidden sm:block">
          <h2 className="font-bold text-lg leading-tight">Welcome, {user.name}</h2>
          <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">
            SkillXT Shared Loyalty Ecosystem
          </p>
        </div>
      </div>

      {/* Right side: Dark mode, Desktop profile card, Logout */}
      <div className="flex items-center gap-4">
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-xl transition-colors text-slate-500 dark:text-slate-400 btn-press"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* User Card — desktop only */}
        {profilePath ? (
          <button
            onClick={() => navigate(profilePath)}
            className="hidden sm:flex items-center gap-3 pl-4 border-l border-slate-100 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors -m-1 p-1"
          >
            <div className="flex flex-col text-right">
              <span className="text-sm font-bold">{user.name}</span>
              <div className="mt-0.5">
                <Badge type={user.role}>{user.role.replace('_', ' ')}</Badge>
              </div>
            </div>
            <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300">
              <User className="w-5 h-5" />
            </div>
          </button>
        ) : (
          <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-slate-100 dark:border-dark-border">
            <div className="flex flex-col text-right">
              <span className="text-sm font-bold">{user.name}</span>
              <div className="mt-0.5">
                <Badge type={user.role}>{user.role.replace('_', ' ')}</Badge>
              </div>
            </div>
            <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300">
              <User className="w-5 h-5" />
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={logout}
          disabled={loggingOut}
          className="ml-2 p-2.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all active:scale-95 active:bg-rose-100 dark:active:bg-rose-900/30 disabled:opacity-50 disabled:pointer-events-none"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
