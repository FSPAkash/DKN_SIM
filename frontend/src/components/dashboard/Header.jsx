import { LogOut, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button, Badge } from '../common';

function Header({ user, isAdmin, onLogout, onDevMode }) {
  return (
    <header className="sticky top-0 z-[var(--z-sticky)] border-b border-surface-200/50 bg-white/70 backdrop-blur-md">
      {/* Airflow Dots */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={`dot-${i}`}
            className="absolute rounded-full bg-daikin-blue"
            style={{
              left: 65,
              top: `${30 + (i % 4) * 12}%`,
              width: 4 - (i % 3),
              height: 4 - (i % 3),
            }}
            animate={{
              x: [0, 80 + i * 15, 200 + i * 20, 350 + i * 15],
              y: [
                0,
                (i % 4 === 0 ? -18 : i % 4 === 1 ? 18 : i % 4 === 2 ? -10 : 10),
                (i % 4 === 0 ? -10 : i % 4 === 1 ? 10 : i % 4 === 2 ? -5 : 5),
                0,
              ],
              opacity: [0.2, 1, 0.9, 0],
              scale: [0.7, 1, 1, 0.5],
            }}
            transition={{
              duration: 3 + (i % 4) * 0.4,
              delay: i * 0.25,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
        ))}
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img
              src="/DKN.png"
              alt="Daikin Logo"
              className="h-10 w-auto object-contain"
            />

          </div>

          {/* User Info and Actions */}
          <div className="flex items-center gap-4">
            {/* User Badge */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-daikin-blue to-daikin-light flex items-center justify-center text-white text-sm font-semibold">
                {user?.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="hidden sm:block">
                {isAdmin && (
                  <Badge variant="primary" size="sm">Admin</Badge>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onDevMode}
                  leftIcon={<Settings className="h-4 w-4" />}
                >
                  <span className="hidden sm:inline">Dev Mode</span>
                  <span className="sm:hidden">Dev</span>
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                leftIcon={<LogOut className="h-4 w-4" />}
              >
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;