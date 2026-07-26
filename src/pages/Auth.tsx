import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { Gamepad2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Auth() {
  const navigate = useNavigate();
  const { signUp, signIn } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) return;

    setLoading(true);

    try {
      if (isSignUp) {
        // Validate username
        if (!username.trim()) {
          toast.error('Username is required');
          return;
        }

        // Validate email
        if (!emailOrUsername.includes('@')) {
          toast.error('Please enter a valid email address');
          return;
        }

        // Validate password
        if (password.length < 6) {
          toast.error('Password must be at least 6 characters');
          return;
        }

        // Create the account
        await signUp(
          emailOrUsername.trim(),
          password,
          username.trim()
        );

        // Supabase may require email confirmation
        toast.success(
          'Account created! Please check your email to confirm your account.'
        );

        // Switch back to the sign-in form
        setIsSignUp(false);
        setPassword('');

      } else {
        // Validate login email/username
        if (!emailOrUsername.trim()) {
          toast.error('Email or username is required');
          return;
        }

        // Validate password
        if (!password) {
          toast.error('Password is required');
          return;
        }

        // Attempt to sign in
        await signIn(
          emailOrUsername.trim(),
          password
        );

        toast.success('Successfully signed in!');

        navigate('/');
      }

    } catch (error: any) {
      const errorMessage =
        error?.message || 'Authentication failed';

      // Handle email confirmation error
      if (
        errorMessage.toLowerCase().includes('email not confirmed')
      ) {
        toast.error(
          'Please confirm your email before signing in.'
        );
        return;
      }

      // Handle invalid login
      if (
        errorMessage.toLowerCase().includes('invalid login credentials')
      ) {
        toast.error(
          'Incorrect email/username or password.'
        );
        return;
      }

      // Handle already registered email
      if (
        errorMessage.toLowerCase().includes('already registered')
      ) {
        toast.error(
          'This email is already registered.'
        );
        return;
      }

      // Generic error
      toast.error(errorMessage);

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">

      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">

          <div className="flex items-center justify-center gap-3 mb-4">

            <Gamepad2 className="w-8 h-8 text-primary" />

            <h1 className="text-3xl font-bold">
              COME PLAY
            </h1>

          </div>

          <p className="text-muted-foreground">
            Your multiplayer hangout
          </p>

        </div>

        {/* Authentication Card */}
        <div className="bg-slate-800/50 backdrop-blur border border-border/20 rounded-lg p-8">

          <h2 className="text-2xl font-bold mb-6">
            {isSignUp
              ? 'Create Account'
              : 'Sign In'}
          </h2>

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >

            {/* Username - Sign Up Only */}
            {isSignUp && (
              <Input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value)
                }
                disabled={loading}
              />
            )}

            {/* Email */}
            <Input
              type="email"
              placeholder="Email"
              value={emailOrUsername}
              onChange={(e) =>
                setEmailOrUsername(e.target.value)
              }
              disabled={loading}
              required
            />

            {/* Password */}
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              disabled={loading}
              required
            />

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {loading
                ? 'Please wait...'
                : isSignUp
                  ? 'Create Account'
                  : 'Sign In'}
            </Button>

          </form>

          {/* Switch Between Login and Sign Up */}
          <div className="mt-6 text-center">

            <p className="text-sm text-muted-foreground mb-2">
              {isSignUp
                ? 'Already have an account?'
                : "Don't have an account?"}
            </p>

            <Button
              variant="ghost"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setEmailOrUsername('');
                setPassword('');
                setUsername('');
              }}
              disabled={loading}
            >
              {isSignUp
                ? 'Sign In'
                : 'Sign Up'}
            </Button>

          </div>

        </div>

      </div>

    </div>
  );
}