import { ToneAnalysisService, type ToneFingerprint } from '../../services/tone-analysis';

interface TonePrintBadgeProps {
  fingerprint: ToneFingerprint;
}

export function TonePrintBadge({ fingerprint }: TonePrintBadgeProps) {
  const badgeText = ToneAnalysisService.getBadgeText(fingerprint);
  const description = ToneAnalysisService.describeFingerprint(fingerprint);

  return (
    <div className="group relative inline-flex items-center gap-1.5">
      {/* Badge */}
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800">
        {/* TonePrint Icon */}
        <svg
          className="h-3.5 w-3.5 text-purple-500 dark:text-purple-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
          />
        </svg>
        <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
          {badgeText}
        </span>
        {fingerprint.sampleCount > 1 && (
          <span className="text-xs text-purple-500 dark:text-purple-400">
            ({fingerprint.sampleCount})
          </span>
        )}
      </div>

      {/* Tooltip */}
      <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10">
        <div className="bg-slate-900 dark:bg-slate-700 text-white text-xs rounded-lg px-3 py-2 shadow-lg max-w-xs">
          <div className="font-semibold mb-1">TonePrint</div>
          <p className="text-slate-300">
            Client style: {description}
          </p>
          <p className="text-slate-400 mt-1 text-[10px]">
            Based on {fingerprint.sampleCount} message{fingerprint.sampleCount !== 1 ? 's' : ''}
          </p>
          {/* Arrow */}
          <div className="absolute top-full left-4 border-4 border-transparent border-t-slate-900 dark:border-t-slate-700" />
        </div>
      </div>
    </div>
  );
}
