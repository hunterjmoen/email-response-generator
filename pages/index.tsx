import { useState } from 'react';
import Link from 'next/link';
import { LoginModal } from '../components/auth/LoginModal';
import { UserProfileMenu } from '../components/UserProfileMenu';
import { useAuthStore } from '../stores/auth';

export default function Home() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const { isAuthenticated, isLoading } = useAuthStore();

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold text-sm">FL</span>
              </div>
              <span className="text-xl font-semibold">FreelanceFlow</span>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900">Platform</a>
              <a href="#testimonials" className="text-gray-600 hover:text-gray-900">Solutions</a>
              <a href="#resources" className="text-gray-600 hover:text-gray-900">Resources</a>
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900">Pricing</Link>
            </nav>
            <div className="flex items-center gap-4">
              {!isLoading && (
                <>
                  {isAuthenticated ? (
                    <UserProfileMenu />
                  ) : (
                    <>
                      <button
                        onClick={() => setIsLoginModalOpen(true)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        Log in
                      </button>
                      <button
                        onClick={() => setIsLoginModalOpen(true)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                      >
                        Get started
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <section className="py-20 bg-gradient-to-br from-green-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl font-bold text-gray-900 mb-6">
                AI-Powered Client<br />Communication for Freelancers
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Reduce client communication time from 4-6 hours weekly to under 2 hours with AI-generated responses that maintain your authentic voice and professional brand.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold"
                >
                  Get started free
                </button>
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="text-green-600 hover:text-green-700 font-semibold"
                >
                  Create account →
                </button>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gray-200 rounded-2xl aspect-[4/3] flex items-center justify-center">
                <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-green-600 font-semibold mb-2">PLATFORM-AGNOSTIC AI</p>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Works Everywhere You Communicate</h2>
          <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-8 mt-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <span className="text-gray-700 font-medium">"Can we extend the deadline by 2 days? The scope expanded."</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button className="px-4 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium">Professional</button>
              <button className="px-4 py-2 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-100">Boundary Setting</button>
              <button className="px-4 py-2 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-100">Scope Discussion</button>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need.<br />Nothing Platform-Specific.
            </h2>
            <p className="text-xl text-gray-600">
              Universal copy-paste workflow works across email, Slack, project tools, and messaging apps.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-green-50 rounded-2xl p-8">
              <div className="flex items-center gap-2 mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Core Features</h3>
                <div className="w-8 h-8 bg-green-200 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-700" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <ul className="space-y-3">
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>AI Response Generation</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Context Selection</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>One-Click Copy</span>
                </li>
              </ul>
            </div>

            <div className="bg-purple-50 rounded-2xl p-8">
              <div className="flex items-center gap-2 mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Simple Workflow</h3>
                <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-700" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <ul className="space-y-3">
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Copy-Paste Anywhere</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Works on All Platforms</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>No Integration Needed</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="testimonials" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 text-center mb-16">
            Trusted by Freelancers Worldwide
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-pink-100 to-pink-200 rounded-2xl p-8 text-center">
              <div className="w-24 h-24 bg-gray-300 rounded-full mx-auto mb-4"></div>
              <div className="flex justify-center gap-2 mb-4">
                <div className="w-10 h-10 bg-blue-400 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                  </svg>
                </div>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Sarah Chen</h3>
              <p className="text-sm text-gray-600 mb-4">Web Designer & Developer</p>
              <p className="text-gray-700 text-sm">
                "FreelanceFlow cut my client communication time in half. I now handle 3 more clients with the same availability."
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl p-8 text-center">
              <div className="w-24 h-24 bg-gray-300 rounded-full mx-auto mb-4"></div>
              <div className="flex justify-center gap-2 mb-4">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-800" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                  </svg>
                </div>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Marcus Rodriguez</h3>
              <p className="text-sm text-gray-600 mb-4">Marketing Consultant</p>
              <p className="text-gray-700 text-sm">
                "The AI understands freelancer context perfectly. It's like having a professional assistant for every client message."
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl p-8 text-center">
              <div className="w-24 h-24 bg-gray-300 rounded-full mx-auto mb-4"></div>
              <div className="flex justify-center gap-2 mb-4">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                  </svg>
                </div>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Emma Thompson</h3>
              <p className="text-sm text-gray-600 mb-4">Content Strategist</p>
              <p className="text-gray-700 text-sm">
                "My authentic voice stays consistent across all platforms. Clients notice the professionalism."
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="integrations" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-16">
            Seamless integrations<br />with your entire tech stack
          </h2>

          <div className="grid grid-cols-3 md:grid-cols-6 gap-8 items-center justify-items-center mb-12">
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="font-bold text-gray-400">G</span>
            </div>
            <div className="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="font-bold text-white">◆</span>
            </div>
            <div className="w-16 h-16 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="font-bold text-white">$</span>
            </div>
            <div className="w-16 h-16 bg-red-500 rounded-lg flex items-center justify-center">
              <span className="font-bold text-white">A</span>
            </div>
            <div className="w-16 h-16 bg-purple-500 rounded-lg flex items-center justify-center">
              <span className="font-bold text-white">S</span>
            </div>
            <div className="w-16 h-16 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="font-bold text-white">G</span>
            </div>
            <div className="w-16 h-16 bg-black rounded-lg flex items-center justify-center">
              <span className="font-bold text-white">●</span>
            </div>
            <div className="w-16 h-16 bg-red-600 rounded-lg flex items-center justify-center">
              <span className="font-bold text-white">F</span>
            </div>
            <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="font-bold text-white">W</span>
            </div>
            <div className="w-16 h-16 bg-blue-400 rounded-lg flex items-center justify-center">
              <span className="font-bold text-white">C</span>
            </div>
            <div className="w-16 h-16 bg-pink-500 rounded-lg flex items-center justify-center">
              <span className="font-bold text-white">◆</span>
            </div>
            <div className="w-16 h-16 bg-blue-700 rounded-lg flex items-center justify-center">
              <span className="font-bold text-white">W</span>
            </div>
          </div>

          <button className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-semibold">
            Browse integrations
          </button>
        </div>
      </section>

      <section id="resources" className="py-20 bg-green-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 text-center mb-16">
            Resources to Help You<br />Grow Your Freelance Business
          </h2>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white rounded-2xl p-8 border-2 border-green-200">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Freelancer Newsletter</h3>
              <p className="text-gray-600 mb-4">
                Monthly tips, templates, and strategies to help you communicate more effectively with clients and grow your business.
              </p>
              <button className="text-green-600 font-semibold hover:text-green-700">
                Subscribe →
              </button>
            </div>

            <div className="bg-white rounded-2xl p-8 border-2 border-green-200">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Template Library</h3>
              <p className="text-gray-600 mb-4">
                Pre-built response templates for common freelance scenarios: project updates, scope changes, payment discussions, and more.
              </p>
              <button className="text-green-600 font-semibold hover:text-green-700">
                Browse templates →
              </button>
            </div>

            <div className="bg-white rounded-2xl p-8 border-2 border-green-200">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Best Practices Guide</h3>
              <p className="text-gray-600 mb-4">
                Learn how to set boundaries, manage scope creep, and communicate professionally while maintaining your unique voice.
              </p>
              <button className="text-green-600 font-semibold hover:text-green-700">
                Read guide →
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-green-100 to-green-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Your clients deserve timely,<br />professional responses
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            So do you. Reclaim your time with FreelanceFlow.
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-semibold"
            >
              Get started free
            </button>
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="text-green-600 hover:text-green-700 font-semibold flex items-center gap-2"
            >
              Create account
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-300 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-5 gap-8 mb-12">
            <div>
              <h4 className="font-semibold text-white mb-4">PLATFORM</h4>
              <ul className="space-y-2">
                <li><Link href="/dashboard/generate" className="hover:text-white">AI Response Generator</Link></li>
                <li><Link href="/dashboard/generate" className="hover:text-white">Templates</Link></li>
                <li><Link href="/dashboard/index" className="hover:text-white">Response History</Link></li>
                <li><Link href="#pricing" className="hover:text-white">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">SOLUTIONS</h4>
              <ul className="space-y-2">
                <li><Link href="#features" className="hover:text-white">By Industry</Link></li>
                <li><Link href="#features" className="hover:text-white">By Use Case</Link></li>
                <li><Link href="#features" className="hover:text-white">Platform Agnostic</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">WHY FREELANCEFLOW</h4>
              <ul className="space-y-2">
                <li><Link href="#testimonials" className="hover:text-white">About Us</Link></li>
                <li><Link href="#testimonials" className="hover:text-white">Testimonials</Link></li>
                <li><Link href="#privacy" className="hover:text-white">Privacy & Security</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">RESOURCES</h4>
              <ul className="space-y-2">
                <li><Link href="#resources" className="hover:text-white">Newsletter</Link></li>
                <li><Link href="#resources" className="hover:text-white">Guides</Link></li>
                <li><Link href="#resources" className="hover:text-white">Support</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">COMPANY</h4>
              <ul className="space-y-2">
                <li><Link href="#about" className="hover:text-white">Careers</Link></li>
                <li><Link href="#contact" className="hover:text-white">Contact</Link></li>
                <li><Link href="#press" className="hover:text-white">Press</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm">© 2025 FreelanceFlow. All rights reserved.</p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <a href="#" className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700">
                <span className="sr-only">LinkedIn</span>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
              </a>
              <a href="#" className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700">
                <span className="sr-only">Twitter</span>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
                </svg>
              </a>
              <a href="#" className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700">
                <span className="sr-only">YouTube</span>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>

      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </div>
  );
}