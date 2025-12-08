import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { LoginModal } from '../components/auth/LoginModal';
import { UserProfileMenu } from '../components/UserProfileMenu';
import { useAuthStore } from '../stores/auth';
import ThemeToggle from '../components/shared/ThemeToggle';
import FAQAccordion from '../components/faq/FAQAccordion';
import { FAQ_ITEMS } from '../data/faq-items';

export default function Home() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isMounted, setIsMounted] = useState(false);
  const { isAuthenticated, isLoading } = useAuthStore();

  // Prevent hydration mismatch by only rendering auth UI on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const openAuthModal = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setIsLoginModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors">
      <header className="border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/images/logo-icon.svg"
                alt="FreelanceFlow"
                width={40}
                height={40}
              />
              <span className="text-xl font-semibold tracking-tight">
                <span className="text-emerald-600 dark:text-emerald-400">Freelance</span>
                <span className="text-gray-500 dark:text-gray-400">Flow</span>
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-10">
              <a href="#features" className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors">Features</a>
              <Link href="/pricing" className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors">Pricing</Link>
              <a href="#faq" className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors">FAQ</a>
            </nav>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              {!isLoading && (
                <>
                  {isAuthenticated ? (
                    <UserProfileMenu />
                  ) : (
                    <>
                      <button
                        onClick={() => openAuthModal('register')}
                        className="bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 font-medium text-sm"
                      >
                        Get Started
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <section className="relative pt-24 pb-32 bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden transition-colors">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-200 dark:bg-green-900 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl opacity-30 dark:opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200 dark:bg-blue-900 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl opacity-30 dark:opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="text-left">
              <div className="mb-6">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full text-sm font-semibold text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700 shadow-sm">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  AI-Powered Client Communication
                </span>
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-6 leading-[1.1]">
                Turn 6 hours of emails into
                <span className="bg-gradient-to-r from-green-600 to-blue-600 dark:from-green-400 dark:to-blue-400 bg-clip-text text-transparent"> 30 minutes</span>
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                Generate professional client responses in seconds with AI that understands freelancer contexts—scope changes, payment discussions, and boundary setting.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                {!isLoading && (
                  <>
                    {isAuthenticated ? (
                      <Link
                        href="/dashboard/generate"
                        className="inline-flex items-center justify-center bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-4 rounded-xl hover:from-green-700 hover:to-green-800 font-semibold text-lg shadow-xl shadow-green-600/30 transition-all transform hover:scale-105"
                      >
                        Go to Dashboard
                        <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </Link>
                    ) : (
                      <button
                        onClick={() => openAuthModal('register')}
                        className="inline-flex items-center justify-center bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-4 rounded-xl hover:from-green-700 hover:to-green-800 font-semibold text-lg shadow-xl shadow-green-600/30 transition-all transform hover:scale-105"
                      >
                        Get Started Free
                        <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </button>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  No credit card required
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Works everywhere
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 border border-gray-100 dark:border-gray-700 transform hover:scale-105 transition-all duration-300">
                <div className="absolute -top-4 -right-4 bg-gradient-to-br from-green-500 to-blue-500 text-white px-4 py-2 rounded-xl shadow-lg text-sm font-bold">
                  AI Generated
                </div>

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center text-white font-bold">
                        C
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">Client Message</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">2 min ago</div>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-semibold rounded-full">Urgent</span>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border-l-4 border-red-400">
                    <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                      "Hey, can we add a mobile app version to the project? It's just a simple addition, right? Also, can we have this done by Friday?"
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -left-4 top-1/2 -translate-y-1/2">
                    <div className="bg-green-500 text-white p-2 rounded-full shadow-lg">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl p-4 border border-green-200 dark:border-green-700">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                        Y
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 dark:text-white mb-2">Professional Response</div>
                        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                          "Thanks for thinking ahead about mobile! A mobile app is actually a separate project that would require additional design, development, and testing. I'd love to discuss this as a phase 2 after we complete the current scope. For the Friday deadline, we're on track for our agreed timeline. Would you like to schedule a call to discuss the mobile app requirements?"
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <span className="px-3 py-1 bg-green-600 dark:bg-green-700 text-white rounded-lg text-xs font-semibold">Professional</span>
                      <span className="px-3 py-1 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-xs font-semibold border border-gray-200 dark:border-gray-600">Scope Management</span>
                      <span className="px-3 py-1 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-xs font-semibold border border-gray-200 dark:border-gray-600">Boundary Setting</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      <section id="features" className="py-24 bg-white dark:bg-gray-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
              Everything you need.<br />
              <span className="text-gray-600 dark:text-gray-400">Nothing platform-specific.</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Simple copy-paste workflow that works everywhere—email, Slack, Teams, or any messaging platform.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="group bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 hover:shadow-xl transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Freelancer-Specific AI</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Purpose-built for freelancers. Handles scope creep, payment reminders, deadline negotiations, and professional boundary setting—not generic AI writing.
              </p>
            </div>

            <div className="group bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-xl transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Multiple Response Options</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Get 2-3 professionally crafted responses with different tones—friendly, firm, or collaborative. Pick the one that matches your style.
              </p>
            </div>

            <div className="group bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-xl transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Scenario Templates</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Pre-built templates for common situations: project updates, scope clarifications, timeline changes, payment follow-ups, and more.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-gradient-to-br from-gray-50 via-green-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-12 md:p-16 text-center border border-gray-100 dark:border-gray-700">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
                Stop spending hours on client emails
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 leading-relaxed">
                Turn communication time into billable hours. Start generating professional responses in seconds.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                {!isLoading && (
                  <>
                    {isAuthenticated ? (
                      <Link
                        href="/dashboard/generate"
                        className="inline-flex items-center justify-center bg-gradient-to-r from-green-600 to-green-700 text-white px-10 py-5 rounded-xl hover:from-green-700 hover:to-green-800 font-semibold text-lg shadow-xl shadow-green-600/30 transition-all transform hover:scale-105"
                      >
                        Go to Dashboard
                        <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </Link>
                    ) : (
                      <button
                        onClick={() => openAuthModal('register')}
                        className="inline-flex items-center justify-center bg-gradient-to-r from-green-600 to-green-700 text-white px-10 py-5 rounded-xl hover:from-green-700 hover:to-green-800 font-semibold text-lg shadow-xl shadow-green-600/30 transition-all transform hover:scale-105"
                      >
                        Get Started Free
                        <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </button>
                    )}
                  </>
                )}
              </div>
              <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">No credit card required • Free to start</p>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="py-24 bg-gray-50 dark:bg-gray-800 transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Everything you need to know about FreelanceFlow
            </p>
          </div>
          <FAQAccordion items={FAQ_ITEMS} />
        </div>
      </section>

      <footer className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-16 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
              <Link href="/" className="inline-flex items-center gap-2 mb-4">
                <Image
                  src="/images/logo-icon.svg"
                  alt="FreelanceFlow"
                  width={36}
                  height={36}
                />
                <span className="text-xl font-semibold tracking-tight">
                  <span className="text-[#1e3a5f] dark:text-white">Freelance</span>
                  <span className="text-gray-400">Flow</span>
                </span>
              </Link>
              <p className="text-sm text-gray-600 dark:text-gray-300 max-w-md">
                AI-powered client communication for freelancers. Save time, stay professional, maintain boundaries.
              </p>
            </div>

            <div className="flex gap-12">
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Product</h4>
                <ul className="space-y-3">
                  <li><Link href="#features" className="text-sm text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors">Features</Link></li>
                  <li><Link href="/pricing" className="text-sm text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors">Pricing</Link></li>
                  <li><a href="#faq" className="text-sm text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors">FAQ</a></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 mt-12 pt-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">© 2025 FreelanceFlow. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} initialMode={authMode} />
    </div>
  );
}