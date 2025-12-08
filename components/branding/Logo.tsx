import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  variant?: 'full' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  className?: string;
  showText?: boolean;
}

const sizeMap = {
  sm: { icon: 32, full: { width: 120, height: 30 } },
  md: { icon: 40, full: { width: 160, height: 40 } },
  lg: { icon: 48, full: { width: 200, height: 50 } },
};

export function Logo({
  variant = 'full',
  size = 'md',
  href,
  className = '',
  showText = true,
}: LogoProps) {
  const dimensions = sizeMap[size];

  const logoContent = (
    <div className={`flex items-center gap-2 ${className}`}>
      {variant === 'icon' ? (
        <Image
          src="/images/logo-icon.svg"
          alt="FreelanceFlow"
          width={dimensions.icon}
          height={dimensions.icon}
          priority
        />
      ) : (
        <>
          <Image
            src="/images/logo-icon.svg"
            alt="FreelanceFlow"
            width={dimensions.icon}
            height={dimensions.icon}
            priority
          />
          {showText && (
            <span className="text-lg font-semibold tracking-tight">
              <span className="text-emerald-600 dark:text-emerald-400">Freelance</span>
              <span className="text-gray-500 dark:text-gray-400">Flow</span>
            </span>
          )}
        </>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="hover:opacity-90 transition-opacity">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}

// Standalone text logo for places where we just need text
export function LogoText({ className = '' }: { className?: string }) {
  return (
    <span className={`font-semibold tracking-tight ${className}`}>
      <span className="text-emerald-600 dark:text-emerald-400">Freelance</span>
      <span className="text-gray-500 dark:text-gray-400">Flow</span>
    </span>
  );
}
