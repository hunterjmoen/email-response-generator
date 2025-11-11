import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  HomeIcon,
  ClockIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  SparklesIcon,
  ArrowLeftOnRectangleIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import { UsageIndicator } from '../usage/UsageIndicator';
import { supabase } from '../../utils/supabase';
import type { User } from '@freelance-flow/shared';

interface DashboardSidebarProps {
  user?: User | null;
  isCollapsed?: boolean;
}

interface NavItemProps {
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  badge?: string | number;
}

function NavItem({ href, icon: Icon, label, isActive, onClick, badge }: NavItemProps) {
  const content = (
    <div className={`
      group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer
      ${isActive
        ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
      }
    `}>
      <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'}`} />
      <span className="text-sm font-medium flex-1">{label}</span>
      {badge && (
        <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full">
          {badge}
        </span>
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

export function DashboardSidebar({ user, isCollapsed = false }: DashboardSidebarProps) {
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
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-screen">
      {/* Logo/Brand */}
      <div className="px-4 py-5 border-b border-gray-200 dark:border-gray-700">
        <Link href="/" className="flex items-center gap-2.5 text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
          <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-base">FL</span>
          </div>
          <span className="text-lg font-semibold tracking-tight">FreelanceFlow</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <NavItem
              key={item.id}
              href={item.href}
              icon={item.icon}
              label={item.label}
              isActive={isActiveRoute(item.href)}
              badge={item.badge}
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
          />
        </ul>

        {/* Usage Indicator */}
        {user?.subscription && (
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
      <div className="px-3 py-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
        {user && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-full flex items-center justify-center font-semibold text-sm shadow-sm">
              {user.firstName && user.lastName
                ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
                : user.email[0].toUpperCase()}
            </div>
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
          </div>
        )}

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
        >
          <ArrowLeftOnRectangleIcon className="w-5 h-5" />
          <span>Log out</span>
        </button>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-center">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          curated by <span className="font-semibold text-gray-600 dark:text-gray-400">FreelanceFlow</span>
        </p>
      </div>
    </aside>
  );
}
