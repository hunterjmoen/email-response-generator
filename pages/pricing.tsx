import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LoginModal } from '../components/auth/LoginModal';
import { UserProfileMenu } from '../components/UserProfileMenu';
import { trpc } from '../utils/trpc';
import { useAuthStore } from '../stores/auth';

export default function Pricing() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();

  const monthlyPrice = 19;
  const annualPrice = Math.round(monthlyPrice * 12 * 0.8); // 20% discount
  const annualMonthlyPrice = Math.round(annualPrice / 12);

  // Replace these with your actual Stripe Price IDs from your Stripe Dashboard
  const MONTHLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID || 'price_monthly';
  const ANNUAL_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID || 'price_annual';

  const createSubscriptionSession = trpc.stripe.createSubscriptionSession.useMutation();

  const handlePremiumClick = async () => {
    if (!user) {
      // Store the billing period preference before login
      localStorage.setItem('pendingCheckout', isAnnual ? 'annual' : 'monthly');
      setIsLoginModalOpen(true);
      return;
    }

    setLoading(true);
    try {
      const priceId = isAnnual ? ANNUAL_PRICE_ID : MONTHLY_PRICE_ID;
      const baseUrl = window.location.origin;

      const result = await createSubscriptionSession.mutateAsync({
        priceId,
        successUrl: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${baseUrl}/pricing`,
        trialPeriodDays: 14, // Optional: offer a 14-day trial
      });

      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
      setLoading(false);
    }
  };

  // Check for pending checkout after login
  useEffect(() => {
    if (user && typeof window !== 'undefined') {
      const pendingCheckout = localStorage.getItem('pendingCheckout');
      if (pendingCheckout) {
        localStorage.removeItem('pendingCheckout');
        const wasAnnual = pendingCheckout === 'annual';
        setIsAnnual(wasAnnual);
        setLoading(true);

        // Trigger checkout immediately - cookies persist through redirect
        (async () => {
          try {
            const priceId = wasAnnual ? ANNUAL_PRICE_ID : MONTHLY_PRICE_ID;
            const baseUrl = window.location.origin;

            const result = await createSubscriptionSession.mutateAsync({
              priceId,
              successUrl: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
              cancelUrl: `${baseUrl}/pricing`,
              trialPeriodDays: 14,
            });

            if (result.url) {
              window.location.href = result.url;
            }
          } catch (error: any) {
            console.error('Checkout error:', error);
            alert(`Failed to start checkout: ${error.message || 'Please try again.'}`);
            setLoading(false);
          }
        })();
      }
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold text-sm">FL</span>
              </div>
              <span className="text-xl font-semibold">FreelanceFlow</span>
            </Link>
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/#features" className="text-gray-600 hover:text-gray-900">Platform</Link>
              <Link href="/#testimonials" className="text-gray-600 hover:text-gray-900">Solutions</Link>
              <Link href="/#resources" className="text-gray-600 hover:text-gray-900">Resources</Link>
              <Link href="/pricing" className="text-gray-900 font-medium">Pricing</Link>
            </nav>
            <div className="flex items-center gap-4">
              {!authLoading && (
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
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Start free. Upgrade when you're ready. No hidden fees.
            </p>

            <div className="inline-flex items-center bg-white rounded-lg p-1 shadow-sm">
              <button
                onClick={() => setIsAnnual(false)}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                  !isAnnual
                    ? 'bg-green-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                  isAnnual
                    ? 'bg-green-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Annual
                <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                  Save 20%
                </span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Free Tier */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-8 hover:border-gray-300 transition-colors">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Free</h3>
                <p className="text-gray-600">Perfect for getting started</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-gray-900">$0</span>
                  <span className="text-gray-600">/month</span>
                </div>
              </div>

              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="w-full bg-gray-100 text-gray-900 px-6 py-3 rounded-lg hover:bg-gray-200 font-semibold mb-8 transition-colors"
              >
                Start Free
              </button>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900">10 responses per month</p>
                    <p className="text-sm text-gray-600">Try it risk-free</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900">AI Response Generation</p>
                    <p className="text-sm text-gray-600">Context-aware replies</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900">Context Selection</p>
                    <p className="text-sm text-gray-600">Professional, friendly, or direct</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900">Copy-Paste Workflow</p>
                    <p className="text-sm text-gray-600">Works everywhere</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Premium Tier */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl border-2 border-green-600 p-8 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-green-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  MOST POPULAR
                </span>
              </div>

              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Premium</h3>
                <p className="text-gray-600">For busy freelancers</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-gray-900">
                    ${isAnnual ? annualMonthlyPrice : monthlyPrice}
                  </span>
                  <span className="text-gray-600">/month</span>
                </div>
                {isAnnual && (
                  <p className="text-sm text-green-700 mt-2">
                    ${annualPrice} billed annually
                  </p>
                )}
              </div>

              <button
                onClick={handlePremiumClick}
                disabled={loading}
                className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold mb-8 transition-colors shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : user ? 'Start Free Trial' : 'Sign Up for Premium'}
              </button>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900">Unlimited responses</p>
                    <p className="text-sm text-gray-600">No monthly limits</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900">AI Response Generation</p>
                    <p className="text-sm text-gray-600">Full access to all features</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900">All Context Options</p>
                    <p className="text-sm text-gray-600">Professional, friendly, direct & more</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900">Copy-Paste Workflow</p>
                    <p className="text-sm text-gray-600">Works everywhere</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900">Priority Support</p>
                    <p className="text-sm text-gray-600">Get help when you need it</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 text-center mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Can I try Premium before committing?
              </h3>
              <p className="text-gray-600">
                Yes! Start with our Free plan to experience the core value. When you're ready to upgrade, you'll get immediate access to all Premium features including unlimited responses and advanced personalization.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                What happens if I exceed 10 responses on the Free plan?
              </h3>
              <p className="text-gray-600">
                You'll be prompted to upgrade to Premium. Your account remains active—you can still access your history and templates, but you'll need to upgrade to generate new responses.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-gray-600">
                Absolutely. Cancel your Premium subscription anytime from your account settings. You'll retain Premium access until the end of your billing period, then automatically switch to the Free plan.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                How does the annual discount work?
              </h3>
              <p className="text-gray-600">
                Pay annually and save 20% compared to monthly billing. That's ${annualPrice}/year instead of ${monthlyPrice * 12}/year—saving you ${(monthlyPrice * 12) - annualPrice} annually while getting all Premium features.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Is my data secure?
              </h3>
              <p className="text-gray-600">
                Your data privacy and security are our top priorities. We use enterprise-grade encryption, never share your data with third parties, and comply with GDPR and other privacy regulations.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600">
                We accept all major credit cards (Visa, Mastercard, American Express) and support secure payment processing through industry-standard providers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-green-100 to-green-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Ready to Transform Your Client Communication?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join freelancers who are saving 4+ hours per week with AI-powered responses.
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-semibold shadow-md"
            >
              Start Free Today
            </button>
            <Link
              href="/#features"
              className="text-green-600 hover:text-green-700 font-semibold flex items-center gap-2 px-8 py-3"
            >
              Learn More
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-5 gap-8 mb-12">
            <div>
              <h4 className="font-semibold text-white mb-4">PLATFORM</h4>
              <ul className="space-y-2">
                <li><Link href="/dashboard/generate" className="hover:text-white">AI Response Generator</Link></li>
                <li><Link href="/dashboard/generate" className="hover:text-white">Templates</Link></li>
                <li><Link href="/dashboard/index" className="hover:text-white">Response History</Link></li>
                <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">SOLUTIONS</h4>
              <ul className="space-y-2">
                <li><Link href="/#features" className="hover:text-white">By Industry</Link></li>
                <li><Link href="/#features" className="hover:text-white">By Use Case</Link></li>
                <li><Link href="/#features" className="hover:text-white">Platform Agnostic</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">WHY FREELANCEFLOW</h4>
              <ul className="space-y-2">
                <li><Link href="/#testimonials" className="hover:text-white">About Us</Link></li>
                <li><Link href="/#testimonials" className="hover:text-white">Testimonials</Link></li>
                <li><Link href="/#privacy" className="hover:text-white">Privacy & Security</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">RESOURCES</h4>
              <ul className="space-y-2">
                <li><Link href="/#resources" className="hover:text-white">Newsletter</Link></li>
                <li><Link href="/#resources" className="hover:text-white">Guides</Link></li>
                <li><Link href="/#resources" className="hover:text-white">Support</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">COMPANY</h4>
              <ul className="space-y-2">
                <li><Link href="/#about" className="hover:text-white">Careers</Link></li>
                <li><Link href="/#contact" className="hover:text-white">Contact</Link></li>
                <li><Link href="/#press" className="hover:text-white">Press</Link></li>
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
