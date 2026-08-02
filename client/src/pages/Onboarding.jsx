/**
 * USER ONBOARDING PAGE (Onboarding.jsx)
 * 
 * For Beginners:
 * This is the landing/login screen of our website.
 * Instead of requiring password registration, students can simply enter a username.
 * The frontend calls the backend to generate a user profile ID, caches it in browser storage,
 * and redirects the user to their personal dashboard.
 * 
 * Concepts Explained:
 * 1. Form Event Interception (`preventDefault`):
 *    In standard HTML, submitting a form refreshes the page. We call `e.preventDefault()`
 *    to intercept this behavior and run custom JavaScript API calls asynchronously.
 * 2. Background Visual FX:
 *    Uses absolutely-positioned blurred circles (`blur-3xl`) to create premium glassmorphic glows.
 * 3. Text field focusing:
 *    The `autoFocus` prop automatically highlights the input box on page load so the user can immediately type.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Phone, KeyRound, User as UserIcon } from 'lucide-react';
import { useUser } from '../context/UserContext';
import SiteLogo from '../components/SiteLogo';
import ThemeToggle from '../components/ThemeToggle';

export default function Onboarding() {
  // Wizard steps: 'phone' (enter phone), 'otp' (verify code), 'name' (new profile name)
  const [step, setStep] = useState('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');

  const [loading, setLoading] = useState(false); // Controls loading indicators and button disables
  const [error, setError] = useState(''); // Stores server validation error messages
  const [infoMessage, setInfoMessage] = useState(''); // Stores helpful instructions (e.g. OTP sentinel alerts)

  const { requestOtp, verifyOtp } = useUser(); // Grab authentication endpoints from context
  const navigate = useNavigate(); // Navigation router hook

  // Step 1: Submit Phone Number to request code
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      setError('Please enter your phone number');
      return;
    }

    setLoading(true);
    setError('');
    setInfoMessage('');
    try {
      await requestOtp(phoneNumber);
      setStep('otp');
      setInfoMessage('OTP code has been sent.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to request OTP. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 & 3: Submit OTP and optionally Name
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim()) {
      setError('Please enter the 6-digit OTP code');
      return;
    }
    if (step === 'name' && !name.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await verifyOtp(phoneNumber, otp, name);

      // If user doesn't exist, the backend prompts for a name.
      // We switch to the 'name' input screen to collect it.
      if (response.isNewUser && !response.token) {
        setStep('name');
        setInfoMessage('Correct OTP! Since this is your first login, please provide a name to create your account.');
      } else {
        // Successful verification & authentication. Redirect to dashboard!
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  // Reset the form step back to phone input
  const handleGoBack = () => {
    setStep('phone');
    setOtp('');
    setName('');
    setError('');
    setInfoMessage('');
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4 relative overflow-hidden">
      {/* Theme toggle control fixed at the top right of the viewport */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Decorative blurred background shapes (creates glassmorphic styling) */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-success/5 rounded-full blur-3xl" />

      {/* Primary card center block */}
      <div className="relative z-10 w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <SiteLogo className="h-12" />
          </div>
          <h1 className="text-3xl font-bold text-theme-primary mb-2">Welcome to AlgoTrade Simulator</h1>
          <p className="text-muted text-sm">
            Create, test, and compare algorithmic trading strategies on historical Indian market data.
          </p>
        </div>

        {/* Auth form block wrapper */}
        <div className="glass-card p-8 space-y-6">

          {/* Step 1: Input Phone Number */}
          {step === 'phone' && (
            <form onSubmit={handleRequestOtp} className="space-y-6">
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-muted" />
                  <input
                    type="tel"
                    className="input-field pl-10 text-base"
                    placeholder="Enter phone number (e.g. 9876543210)"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    autoFocus
                    disabled={loading}
                  />
                </div>
              </div>

              {error && (
                <p className="text-danger text-sm bg-danger/10 border border-danger/20 rounded px-3 py-2">
                  {error}
                </p>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
                {loading ? 'Sending OTP...' : (
                  <>Send OTP <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          )}

          {/* Step 2: Input OTP */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-2">
                  Enter 6-Digit OTP
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-muted" />
                  <input
                    type="text"
                    maxLength={6}
                    className="input-field pl-10 text-base tracking-widest font-mono text-center"
                    placeholder="******"
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    autoFocus
                    disabled={loading}
                  />
                </div>
              </div>

              {infoMessage && (
                <div className="text-accent text-xs bg-accent/10 border border-accent/20 rounded px-3 py-2 leading-relaxed">
                  {infoMessage}
                </div>
              )}

              {error && (
                <p className="text-danger text-sm bg-danger/10 border border-danger/20 rounded px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={handleGoBack} disabled={loading} className="btn-secondary flex-1 py-3 text-sm">
                  Back
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-[2] flex items-center justify-center gap-2 py-3">
                  {loading ? 'Verifying...' : (
                    <>Verify & Login <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Input Name (Conditional Registration) */}
          {step === 'name' && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-2">
                  Your Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-3.5 h-4 w-4 text-muted" />
                  <input
                    type="text"
                    className="input-field pl-10 text-base"
                    placeholder="Enter your name to register"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    autoFocus
                    disabled={loading}
                  />
                </div>
              </div>

              {infoMessage && (
                <div className="text-success text-xs bg-success/10 border border-success/20 rounded px-3 py-2 leading-relaxed">
                  {infoMessage}
                </div>
              )}

              {error && (
                <p className="text-danger text-sm bg-danger/10 border border-danger/20 rounded px-3 py-2">
                  {error}
                </p>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
                {loading ? 'Creating Account...' : (
                  <>Complete Signup <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          )}

        </div>

        <p className="text-center text-xs text-muted mt-6">
          OTP based secure verification. Session tokens are signed using JWT.
        </p>
      </div>
    </div>
  );
}
