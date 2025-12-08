import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import {
  HomeIcon,
  ClockIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  SparklesIcon,
  ArrowLeftOnRectangleIcon,
  UsersIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { UsageIndicator } from '../usage/UsageIndicator';
import { supabase } from '../../utils/supabase';
import type { User } from '@freelance-flow/shared';

interface DashboardSidebarProps {
  user?: User | null;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavItemProps {
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  badge?: string | number;
  isCollapsed?: boolean;
}

function NavItem({ href, icon: Icon, label, isActive, onClick, badge, isCollapsed }: NavItemProps) {
  const content = (
    <div className={`
      group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer relative
      ${isCollapsed ? 'justify-center' : ''}
      ${isActive
        ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
      }
    `}>
      <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'}`} />
      {!isCollapsed && (
        <>
          <span className="text-sm font-medium flex-1">{label}</span>
          {badge && (
            <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full">
              {badge}
            </span>
          )}
        </>
      )}
      {/* Tooltip for collapsed state */}
      {isCollapsed && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
          {label}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <li>
        <Link href={href}>
          {content}
        </Link>
      </li>
    );
  }

  return (
    <li onClick={onClick}>
      {content}
    </li>
  );
}

export function DashboardSidebar({ user, isCollapsed = false, onToggleCollapse }: DashboardSidebarProps) {
  const router = useRouter();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const navItems = [
    { href: '/dashboard', icon: HomeIcon, label: 'Home', id: 'home' },
    { href: '/dashboard/generate', icon: SparklesIcon, label: 'Generate', id: 'generate' },
    { href: '/dashboard/clients', icon: UsersIcon, label: 'Clients', id: 'clients' },
    { href: '/dashboard/history', icon: ClockIcon, label: 'History', id: 'history' },
    { href: '/dashboard/templates', icon: DocumentTextIcon, label: 'Templates', id: 'templates', badge: 'Soon' },
    { href: '/dashboard/analytics', icon: ChartBarIcon, label: 'Analytics', id: 'analytics', badge: 'Soon' },
  ];

  const isActiveRoute = (href: string) => {
    // Exact match for dashboard home
    if (href === '/dashboard') {
      return router.pathname === '/dashboard' || router.pathname === '/dashboard/';
    }
    return router.pathname.startsWith(href);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <aside className={`${isCollapsed ? 'w-16' : 'w-64'} bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-screen transition-all duration-300 ease-in-out`}>
      {/* Logo/Brand */}
      <div className={`${isCollapsed ? 'px-2' : 'px-4'} py-5 border-b border-gray-200 dark:border-gray-700 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        <Link href="/" className={`flex items-center gap-2.5 text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300 transition-colors ${isCollapsed ? 'justify-center' : ''}`}>
          <Image
            src="/images/logo-icon.svg"
            alt="FreelanceFlow"
            width={36}
            height={36}
            className="flex-shrink-0"
          />
          {!isCollapsed && (
            <span className="text-lg font-semibold tracking-tight">
              <span className="text-emerald-600 dark:text-emerald-400">Freelance</span>
              <span className="text-gray-500 dark:text-gray-400">Flow</span>
            </span>
          )}
        </Link>
        {!isCollapsed && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
            aria-label="Collapse sidebar"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {isCollapsed && onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="mx-auto mt-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
          aria-label="Expand sidebar"
        >
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      )}

      {/* Navigation */}
      <nav className={`flex-1 ${isCollapsed ? 'px-2' : 'px-3'} py-4 overflow-y-auto`}>
        <ul className="space-y-1">
          {navItems.map((item) => (
            <NavItem
              key={item.id}
              href={item.href}
              icon={item.icon}
              label={item.label}
              isActive={isActiveRoute(item.href)}
              badge={item.badge}
              isCollapsed={isCollapsed}
            />
          ))}
        </ul>

        {/* Divider */}
        <div className="my-4 border-t border-gray-200 dark:border-gray-700" />

        {/* Settings */}
        <ul className="space-y-1">
          <NavItem
            href="/settings/profile"
            icon={Cog6ToothIcon}
            label="Settings"
            isActive={router.pathname.startsWith('/settings')}
            isCollapsed={isCollapsed}
          />
        </ul>

        {/* Usage Indicator - hide when collapsed */}
        {!isCollapsed && user?.subscription && (
          <div className="mt-6 px-1">
            <UsageIndicator
              usageCount={user.subscription.usageCount || 0}
              monthlyLimit={user.subscription.monthlyLimit || 10}
              tier={user.subscription.tier as 'free' | 'professional' | 'premium'}
            />
          </div>
        )}
      </nav>

      {/* User Profile & Logout */}
      <div className={`${isCollapsed ? 'px-2' : 'px-3'} py-4 border-t border-gray-200 dark:border-gray-700 space-y-2`}>
        {user && (
          <div className={`group flex items-center gap-3 ${isCollapsed ? 'px-0 justify-center' : 'px-3'} py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors relative`}>
            <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-full flex items-center justify-center font-semibold text-sm shadow-sm flex-shrink-0">
              {user.firstName && user.lastName
                ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
                : user.email[0].toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {user.firstName && user.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user.email}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                  {user.subscription?.tier || 'free'} plan
                </p>
              </div>
            )}
            {/* Tooltip for collapsed state */}
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                {user.firstName && user.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user.email}
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleLogout}
          className={`group w-full flex items-center gap-3 ${isCollapsed ? 'px-0 justify-center' : 'px-3'} py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all relative`}
        >
          <ArrowLeftOnRectangleIcon className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span>Log out</span>}
          {/* Tooltip for collapsed state */}
          {isCollapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
              Log out
            </div>
          )}
        </button>
      </div>

      {/* Footer - hide when collapsed */}
      {!isCollapsed && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            curated by <span className="font-semibold text-gray-600 dark:text-gray-400">FreelanceFlow</span>
          </p>
        </div>
      )}
    </aside>
  );
}
