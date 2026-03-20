import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Code, ChevronDown, User, LogOut, Grid, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { firebaseAuth } from '../firebase';

const Navbar = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, loading } = useAuth();

  const handleLogout = async () => {
    await firebaseAuth.logout();
    setDropdownOpen(false);
  };

  const getInitials = () => {
    if (user?.displayName) {
      return user.displayName.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'G';
  };

  return (
    <nav className="sticky top-0 z-50 w-full bg-[rgba(13,17,23,0.95)] backdrop-blur-md border-b border-[var(--color-border)] text-[var(--color-text-primary)]">
      <div className="max-w-[1200px] mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="bg-[var(--color-bg-secondary)] p-1 rounded-md border border-[var(--color-border)]">
            <Code size={20} className="text-[var(--color-text-primary)]" strokeWidth={2.5} />
          </div>
          <span className="font-mono font-semibold tracking-tight text-lg">CompeteHub</span>
        </div>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-6">
          <NavLink 
            to="/platforms" 
            className={({ isActive }) => 
              `text-sm font-medium transition-colors hover:text-[var(--color-text-primary)] ${isActive ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`
            }
          >
            Platforms
          </NavLink>
          <NavLink 
            to="/schedule" 
            className={({ isActive }) => 
              `text-sm font-medium transition-colors hover:text-[var(--color-text-primary)] ${isActive ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`
            }
          >
            Schedule
          </NavLink>
          <NavLink 
            to="/profile" 
            className={({ isActive }) => 
              `text-sm font-medium transition-colors hover:text-[var(--color-text-primary)] ${isActive ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`
            }
          >
            My Profile
          </NavLink>
        </div>

        {/* User Profile / Right side */}
        <div className="relative">
          {loading ? (
            <div className="flex items-center gap-2 p-1.5 animate-pulse">
               <div className="w-8 h-8 rounded-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)]"></div>
               <div className="w-3 h-3 bg-[var(--color-bg-secondary)] rounded-sm"></div>
            </div>
          ) : (
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 focus:outline-none hover:bg-[var(--color-bg-secondary)] p-1.5 rounded-md transition-colors"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-tr from-[var(--color-accent-blue)] to-[var(--color-accent-purple)] flex items-center justify-center text-white font-mono text-sm shadow-[0_0_0_1px_rgba(255,255,255,0.1)_inset]">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                ) : (
                  getInitials()
                )}
              </div>
              <ChevronDown size={14} className="text-[var(--color-text-secondary)]" />
            </button>
          )}

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-md shadow-lg py-1 z-50 overflow-hidden">
              <div className="px-4 py-2 border-b border-[var(--color-border-muted)]">
                <p className="text-sm font-medium truncate">{user?.displayName}</p>
                <p className="text-xs text-[var(--color-text-secondary)] truncate">{user?.email}</p>
              </div>
              {/* Mobile Only Navigation Links in Dropdown */}
              <div className="md:hidden border-b border-[var(--color-border-muted)] pb-1 mb-1">
                <NavLink 
                  to="/platforms" 
                  className={({ isActive }) => 
                    `flex items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-[var(--color-bg-tertiary)] ${isActive ? 'text-[var(--color-accent-blue)] bg-[var(--color-bg-tertiary)]/30' : 'text-[var(--color-text-secondary)] hover:text-white'}`
                  }
                  onClick={() => setDropdownOpen(false)}
                >
                  <Grid size={14} /> Platforms
                </NavLink>
                <NavLink 
                  to="/schedule" 
                  className={({ isActive }) => 
                    `flex items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-[var(--color-bg-tertiary)] ${isActive ? 'text-[var(--color-accent-blue)] bg-[var(--color-bg-tertiary)]/30' : 'text-[var(--color-text-secondary)] hover:text-white'}`
                  }
                  onClick={() => setDropdownOpen(false)}
                >
                  <Calendar size={14} /> Schedule
                </NavLink>
              </div>

              <NavLink 
                to="/profile" 
                className={({ isActive }) => 
                  `flex items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-[var(--color-bg-tertiary)] ${isActive ? 'text-[var(--color-accent-blue)] bg-[var(--color-bg-tertiary)]/30' : 'text-[var(--color-text-primary)] hover:text-white'}`
                }
                onClick={() => setDropdownOpen(false)}
              >
                <User size={14} /> My Profile
              </NavLink>
              <div className="h-px bg-[var(--color-border-muted)] my-1"></div>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-accent-red)] transition-colors"
              >
                <LogOut size={14} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
