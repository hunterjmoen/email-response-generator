import { type JTBDMode, JTBD_MODE_LABELS, JTBD_MODE_DESCRIPTIONS } from '@freelance-flow/shared';

interface JobsToBedonTabsProps {
  activeMode: JTBDMode;
  onModeChange: (mode: JTBDMode) => void;
  scopeCreepDetected: boolean;
}

const JTBD_ICONS: Record<JTBDMode, JSX.Element> = {
  reply_fast: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  protect_scope: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  move_forward: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
  ),
};

const JTBD_COLORS: Record<JTBDMode, { active: string; inactive: string; badge: string }> = {
  reply_fast: {
    active: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700',
    inactive: 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border-transparent',
    badge: 'bg-blue-500',
  },
  protect_scope: {
    active: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700',
    inactive: 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border-transparent',
    badge: 'bg-amber-500',
  },
  move_forward: {
    active: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700',
    inactive: 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border-transparent',
    badge: 'bg-green-500',
  },
};

const MODES: JTBDMode[] = ['reply_fast', 'protect_scope', 'move_forward'];

export function JobsToBedoneTabs({
  activeMode,
  onModeChange,
  scopeCreepDetected,
}: JobsToBedonTabsProps) {
  return (
    <div className="w-full mb-6">
      {/* Desktop tabs */}
      <div className="hidden sm:flex items-center justify-center gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
        {MODES.map((mode) => {
          const isActive = activeMode === mode;
          const colors = JTBD_COLORS[mode];
          const showBadge = mode === 'protect_scope' && scopeCreepDetected && !isActive;

          return (
            <button
              key={mode}
              onClick={() => onModeChange(mode)}
              className={`
                relative flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm
                transition-all duration-200 border-2
                ${isActive ? colors.active : colors.inactive}
              `}
            >
              {JTBD_ICONS[mode]}
              <span>{JTBD_MODE_LABELS[mode]}</span>

              {/* Scope creep indicator badge */}
              {showBadge && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Mobile tabs - horizontal scrollable */}
      <div className="sm:hidden flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {MODES.map((mode) => {
          const isActive = activeMode === mode;
          const colors = JTBD_COLORS[mode];
          const showBadge = mode === 'protect_scope' && scopeCreepDetected && !isActive;

          return (
            <button
              key={mode}
              onClick={() => onModeChange(mode)}
              className={`
                relative flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm
                transition-all duration-200 border-2
                ${isActive ? colors.active : colors.inactive}
              `}
            >
              {JTBD_ICONS[mode]}
              <span>{JTBD_MODE_LABELS[mode]}</span>

              {/* Scope creep indicator badge */}
              {showBadge && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active mode description */}
      <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
        {JTBD_MODE_DESCRIPTIONS[activeMode]}
      </p>
    </div>
  );
}
