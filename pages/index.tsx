import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LoginModal } from '../components/auth/LoginModal';
import { UserProfileMenu } from '../components/UserProfileMenu';
import { useAuthStore } from '../stores/auth';

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
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900">FREELANCEFLOW</span>
            </Link>
            <nav className="hidden md:flex items-center gap-10">
              <a href="#features" className="text-sm text-gray-600 hover:text-gray-900 font-medium">Product</a>
              <a href="#resources" className="text-sm text-gray-600 hover:text-gray-900 font-medium">Resources</a>
              <Link href="/pricing" className="text-sm text-gray-600 hover:text-gray-900 font-medium">Pricing</Link>
            </nav>
            <div className="flex items-center gap-4">
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

      <section className="pt-32 pb-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 rounded-full text-sm font-medium text-green-700">
              AI-Powered Client Communication
            </span>
          </div>
          <h1 className="text-6xl md:text-7xl font-bold text-gray-900 mb-8 leading-tight">
            Reduce client communication<br />from 4-6 hours to under 2
          </h1>
          <p className="text-xl text-gray-600 mb-4 max-w-3xl mx-auto">
            FreelanceFlow generates professional client responses in seconds with AI that understands freelancer-specific contexts.
          </p>
          <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto">
            Works everywhere via simple copy-paste. No platform integrations needed.
          </p>
          {!isLoading && (
            <>
              {isAuthenticated ? (
                <Link
                  href="/dashboard/generate"
                  className="inline-block bg-green-600 text-white px-8 py-4 rounded-lg hover:bg-green-700 font-semibold text-lg shadow-lg shadow-green-600/20 transition-all"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <button
                  onClick={() => openAuthModal('register')}
                  className="bg-green-600 text-white px-8 py-4 rounded-lg hover:bg-green-700 font-semibold text-lg shadow-lg shadow-green-600/20 transition-all"
                >
                  Get Started Free
                </button>
              )}
            </>
          )}

          <div className="mt-20 max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-green-50 to-white rounded-2xl shadow-2xl p-8 border border-gray-100">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-gray-200"></div>
                    <div className="w-3 h-3 rounded-full bg-gray-200"></div>
                    <div className="w-3 h-3 rounded-full bg-gray-200"></div>
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-lg px-4 py-2 text-left">
                    <span className="text-sm text-gray-500">Important</span>
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-6 text-left">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-gray-700 font-medium mb-3">
                        "Can we extend the deadline by 2 days? The scope expanded."
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        <span className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium">Professional</span>
                        <span className="px-3 py-1.5 bg-white text-gray-600 rounded-lg text-sm font-medium border border-gray-200">Boundary Setting</span>
                        <span className="px-3 py-1.5 bg-white text-gray-600 rounded-lg text-sm font-medium border border-gray-200">Scope Discussion</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      <section id="features" className="py-32 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Everything you need.<br />Nothing platform-specific.
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Universal copy-paste workflow works across email, Slack, project tools, and messaging apps.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Freelancer-Specific Context</h3>
              <p className="text-gray-600">
                AI that understands project phases, scope discussions, payment reminders, and boundary setting - not generic writing.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Multiple Response Options</h3>
              <p className="text-gray-600">
                Get 2-3 response variants with different tones and approaches. Choose the one that fits best.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Scenario Templates</h3>
              <p className="text-gray-600">
                Pre-built templates for project updates, scope clarifications, timeline changes, and payment discussions.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="testimonials" className="py-32 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-20 leading-tight">
            Join 73.3M+ freelancers<br />who need better tools
          </h2>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full mx-auto"></div>
              </div>
              <p className="text-gray-700 mb-6 text-lg leading-relaxed">
                "Handles scope discussions and boundary setting perfectly. I've reduced client communication from 6 hours to under 2 each week."
              </p>
              <h3 className="font-bold text-gray-900">Sarah Chen</h3>
              <p className="text-sm text-gray-500">Web Designer & Developer</p>
            </div>

            <div className="text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full mx-auto"></div>
              </div>
              <p className="text-gray-700 mb-6 text-lg leading-relaxed">
                "Finally, AI that understands project phases and payment reminders. Works across email, Slack, and project management tools."
              </p>
              <h3 className="font-bold text-gray-900">Marcus Rodriguez</h3>
              <p className="text-sm text-gray-500">Marketing Consultant</p>
            </div>

            <div className="text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full mx-auto"></div>
              </div>
              <p className="text-gray-700 mb-6 text-lg leading-relaxed">
                "The time savings convert directly to billable hours. I've taken on 2 more clients without working evenings."
              </p>
              <h3 className="font-bold text-gray-900">Emma Thompson</h3>
              <p className="text-sm text-gray-500">Content Strategist</p>
            </div>
          </div>
        </div>
      </section>

      <section id="resources" className="py-32 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Resources to help you grow
          </h2>
          <p className="text-xl text-gray-600 mb-20 max-w-2xl mx-auto">
            Everything you need to communicate more effectively and build your freelance business.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 text-left hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Freelancer Newsletter</h3>
              <p className="text-gray-600 mb-6">
                Monthly tips and strategies to help you communicate more effectively with clients.
              </p>
              <button className="text-green-600 font-semibold hover:text-green-700 flex items-center gap-2">
                Subscribe
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <div className="bg-white rounded-2xl p-8 text-left hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Template Library</h3>
              <p className="text-gray-600 mb-6">
                Pre-built templates for project updates, scope changes, and payment discussions.
              </p>
              <button className="text-green-600 font-semibold hover:text-green-700 flex items-center gap-2">
                Browse templates
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <div className="bg-white rounded-2xl p-8 text-left hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Best Practices Guide</h3>
              <p className="text-gray-600 mb-6">
                Learn to set boundaries and communicate professionally while maintaining your voice.
              </p>
              <button className="text-green-600 font-semibold hover:text-green-700 flex items-center gap-2">
                Read guide
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-32 bg-gradient-to-br from-green-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Stop spending 10-15% of<br />your time on client messages
          </h2>
          <p className="text-xl text-gray-600 mb-10">
            Convert communication time into billable hours. Start free, no credit card required.
          </p>
          {!isLoading && (
            <>
              {isAuthenticated ? (
                <Link
                  href="/dashboard/generate"
                  className="inline-block bg-green-600 text-white px-8 py-4 rounded-lg hover:bg-green-700 font-semibold text-lg shadow-lg shadow-green-600/20 transition-all"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <button
                  onClick={() => openAuthModal('register')}
                  className="bg-green-600 text-white px-8 py-4 rounded-lg hover:bg-green-700 font-semibold text-lg shadow-lg shadow-green-600/20 transition-all"
                >
                  Get Started Free
                </button>
              )}
            </>
          )}
        </div>
      </section>

      <footer className="bg-white border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <h4 className="text-sm font-bold text-gray-900 mb-4 tracking-wide">PRODUCT</h4>
              <ul className="space-y-3">
                <li><Link href="/dashboard/generate" className="text-sm text-gray-600 hover:text-gray-900">Features</Link></li>
                <li><Link href="/pricing" className="text-sm text-gray-600 hover:text-gray-900">Pricing</Link></li>
                <li><Link href="#resources" className="text-sm text-gray-600 hover:text-gray-900">Resources</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900 mb-4 tracking-wide">COMPANY</h4>
              <ul className="space-y-3">
                <li><Link href="#testimonials" className="text-sm text-gray-600 hover:text-gray-900">About</Link></li>
                <li><Link href="#contact" className="text-sm text-gray-600 hover:text-gray-900">Contact</Link></li>
                <li><Link href="#press" className="text-sm text-gray-600 hover:text-gray-900">Press</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900 mb-4 tracking-wide">RESOURCES</h4>
              <ul className="space-y-3">
                <li><Link href="#resources" className="text-sm text-gray-600 hover:text-gray-900">Newsletter</Link></li>
                <li><Link href="#resources" className="text-sm text-gray-600 hover:text-gray-900">Guides</Link></li>
                <li><Link href="#resources" className="text-sm text-gray-600 hover:text-gray-900">Support</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900 mb-4 tracking-wide">LEGAL</h4>
              <ul className="space-y-3">
                <li><Link href="#privacy" className="text-sm text-gray-600 hover:text-gray-900">Privacy</Link></li>
                <li><Link href="#terms" className="text-sm text-gray-600 hover:text-gray-900">Terms</Link></li>
                <li><Link href="#security" className="text-sm text-gray-600 hover:text-gray-900">Security</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-500">© 2025 FreelanceFlow. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-gray-600">
                <span className="sr-only">LinkedIn</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-600">
                <span className="sr-only">Twitter</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>

      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} initialMode={authMode} />
    </div>
  );
}