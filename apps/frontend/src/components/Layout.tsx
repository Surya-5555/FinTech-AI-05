import { Link, Outlet, useLocation } from 'react-router-dom';
import { Activity, ShieldAlert, List, Settings, FlaskConical } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cx(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export function Layout() {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', href: '/', icon: Activity },
    { name: 'Cases', href: '/cases', icon: List },
    { name: 'Failures', href: '/failures', icon: ShieldAlert },
    { name: 'Evaluations', href: '/evaluations', icon: FlaskConical },
    { name: 'System', href: '/system', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-[#02042b] text-white border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center gap-3">
                <ShieldAlert className="h-6 w-6 text-blue-400" />
                <span className="font-bold text-lg tracking-tight">AI Revenue Recovery</span>
              </div>
              <div className="hidden sm:ml-8 sm:flex sm:space-x-4 items-center">
                {navItems.map((item) => {
                  const isActive = item.href === '/' 
                    ? location.pathname === '/' 
                    : location.pathname.startsWith(item.href);
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cx(
                        isActive ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                        'px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center">
              <span className="bg-amber-900/40 text-amber-500 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                SYNTHETIC DATA MODE
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
