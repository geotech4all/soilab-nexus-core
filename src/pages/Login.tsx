import { SignIn } from '@clerk/clerk-react';
import { useRoleBasedRedirect } from '@/hooks/useRoleBasedRedirect';

const Login = () => {
  const { isAuthenticated, loading } = useRoleBasedRedirect();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Will redirect via hook
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome to Geotech<span className="text-primary">4All</span>
          </h1>
          <p className="text-muted-foreground mt-2">Sign in to your account</p>
        </div>
        <div className="flex justify-center">
          <SignIn
            routing="hash"
            signUpUrl="/signup"
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'shadow-none border border-border bg-card w-full',
                headerTitle: 'hidden',
                headerSubtitle: 'hidden',
                socialButtonsBlockButton: 'border-border',
                formButtonPrimary: 'bg-primary hover:bg-primary/90',
                footerActionLink: 'text-primary hover:text-primary/80',
              },
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Login;
