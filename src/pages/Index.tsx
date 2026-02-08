import { Button } from '@/components/ui/button';
import { ArrowRight, Layers, BarChart3, Shield, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useRoleBasedRedirect } from '@/hooks/useRoleBasedRedirect';
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';
import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

const Index = () => {
  const { loading } = useRoleBasedRedirect();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
          <span className="text-xl font-bold tracking-tight">
            Geotech<span className="text-primary">4All</span>
          </span>
          <div className="flex items-center gap-3">
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  Sign in
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button size="sm">
                  Get Started
                </Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">Dashboard</Button>
              </Link>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-16">
        <div className="max-w-4xl mx-auto text-center">
          <motion.p
            className="text-sm font-medium tracking-widest uppercase text-primary mb-6"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
          >
            Soil Testing, Simplified
          </motion.p>
          <motion.h1
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.05]"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
          >
            Professional
            <br />
            geotechnical
            <br />
            <span className="text-primary">analysis.</span>
          </motion.h1>
          <motion.p
            className="mt-8 text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
          >
            Accurate soil testing, intelligent reporting, and collaborative workflows — all in one platform.
          </motion.p>
          <motion.div
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={3}
          >
            <SignedOut>
              <SignUpButton mode="modal">
                <Button size="lg" className="h-12 px-8 text-base rounded-full">
                  Start for free <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </SignUpButton>
              <SignInButton mode="modal">
                <Button size="lg" variant="outline" className="h-12 px-8 text-base rounded-full">
                  Sign in
                </Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link to="/dashboard">
                <Button size="lg" className="h-12 px-8 text-base rounded-full">
                  Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </SignedIn>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        >
          <ChevronDown className="h-6 w-6 text-muted-foreground/50" />
        </motion.div>
      </section>

      {/* Features */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-sm font-medium tracking-widest uppercase text-primary mb-4">Why Geotech4All</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Built for engineers,<br />by engineers.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {[
              {
                icon: Layers,
                title: 'Precise Testing',
                description: 'SPT, CPT, Atterberg limits, PSD, compaction, CBR — run and compute results instantly with built-in standards.',
              },
              {
                icon: BarChart3,
                title: 'Smart Reports',
                description: 'Auto-generate professional geotechnical reports with charts, tables, and cover pages. Export-ready in minutes.',
              },
              {
                icon: Shield,
                title: 'Team Control',
                description: 'Role-based access for admins, companies, and technicians. Secure collaboration across your entire organization.',
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                className="group"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ delay: i * 0.15, duration: 0.6 }}
              >
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3 tracking-tight">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6">
        <motion.div
          className="max-w-3xl mx-auto text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
            Ready to modernize<br />your workflow?
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Join engineers and companies already using Geotech4All for faster, more reliable soil analysis.
          </p>
          <SignedOut>
            <SignUpButton mode="modal">
              <Button size="lg" className="h-12 px-8 text-base rounded-full">
                Create your account <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <Link to="/dashboard">
              <Button size="lg" className="h-12 px-8 text-base rounded-full">
                Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </SignedIn>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm font-semibold tracking-tight">
            Geotech<span className="text-primary">4All</span>
          </span>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Geotech4All. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
