import React from 'react';
import {
  ShieldAlert,
  Droplets,
  Activity,
  Sliders,
  CloudSun,
  FileText,
  Info,
  MapPin,
  Sparkles,
  Database,
  User,
  LogOut,
  HelpCircle,
  Clock,
  Compass,
  BookOpen
} from 'lucide-react';
import { DemandPercentile, UserProfile, UserRole, CityProfile } from '../types';

export type ActiveTab =
  | 'command-center'
  | 'live-map'
  | 'forecast-explorer'
  | 'anomaly-radar'
  | 'supply-planner'
  | 'weather-scenarios'
  | 'city-lab'
  | 'model-report'
  | 'admin-database'
  | 'about';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  percentile: DemandPercentile;
  setPercentile: (p: DemandPercentile) => void;
  horizonHour: number;
  setHorizonHour: (h: number) => void;
  useLitresPerHour: boolean;
  setUseLitresPerHour: (val: boolean) => void;
  activeAnomalyCount: number;
  user: any;
  userProfile?: UserProfile | null;
  onOpenAuthModal: (mode: 'signin' | 'signup', role: UserRole) => void;
  onLogout: () => void;
  onOpenAskGrid: () => void;
  onOpenOperatorBrief: () => void;
  onSeedDemo: () => void;
  isSeeding: boolean;
  onStartGuidedDemo: () => void;
  cityProfiles?: CityProfile[];
  activeProfileId?: string;
  onSelectActiveProfile?: (id: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  percentile,
  setPercentile,
  horizonHour,
  setHorizonHour,
  useLitresPerHour,
  setUseLitresPerHour,
  activeAnomalyCount,
  user,
  userProfile,
  onOpenAuthModal,
  onLogout,
  onOpenAskGrid,
  onOpenOperatorBrief,
  onSeedDemo,
  isSeeding,
  onStartGuidedDemo,
  cityProfiles,
  activeProfileId,
  onSelectActiveProfile
}) => {
  const isAdmin = userProfile?.role === 'admin' || user?.email === 'yashpradeep313@gmail.com';

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode; badgeCount?: number; highlight?: boolean }[] = [
    { id: 'command-center', label: 'Command Center', icon: <Activity className="w-4 h-4" /> },
    { id: 'live-map', label: 'Live Map', icon: <MapPin className="w-4 h-4" /> },
    { id: 'forecast-explorer', label: 'Forecast Explorer', icon: <Droplets className="w-4 h-4" /> },
    {
      id: 'anomaly-radar',
      label: 'Anomaly Radar',
      icon: <ShieldAlert className="w-4 h-4" />,
      badgeCount: activeAnomalyCount
    },
    { id: 'supply-planner', label: 'Supply Planner', icon: <Sliders className="w-4 h-4" /> },
    { id: 'weather-scenarios', label: 'Weather & Scenarios', icon: <CloudSun className="w-4 h-4" /> },
    { id: 'city-lab', label: 'City Learning Lab', icon: <BookOpen className="w-4 h-4 text-indigo-400" /> },
    { id: 'model-report', label: 'Model & Kaggle Hub', icon: <FileText className="w-4 h-4" /> },
    {
      id: 'admin-database',
      label: 'Admin Database',
      icon: <Database className="w-4 h-4 text-sky-600" />,
      highlight: true
    },
    { id: 'about', label: 'About', icon: <Info className="w-4 h-4" /> }
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 shadow-md">
      {/* Top Banner & Quick Controls */}
      <div className="px-4 py-2 border-b border-slate-850 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-950/80 border border-sky-500/40 flex items-center justify-center text-cyan-400 font-bold shadow-xs">
              <Droplets className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold tracking-wider text-sm bg-gradient-to-r from-sky-400 via-cyan-300 to-teal-300 bg-clip-text text-transparent">Aqua Nexus</span>
              <span className="hidden sm:inline text-slate-400 text-[11px] ml-2">
                Predict Scarcity. Prevent Crisis. Protect Every Drop.
              </span>
            </div>
          </div>
        </div>

        {/* Global Selectors */}
        <div className="flex items-center gap-3 ml-auto">
          {/* Horizon Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400 font-medium">Horizon:</span>
            <select
              value={horizonHour}
              onChange={(e) => setHorizonHour(Number(e.target.value))}
              className="bg-transparent text-cyan-300 font-mono font-semibold focus:outline-none cursor-pointer"
            >
              <option value={1} className="bg-slate-900 text-slate-100">1h Ahead</option>
              <option value={6} className="bg-slate-900 text-slate-100">6h Ahead</option>
              <option value={12} className="bg-slate-900 text-slate-100">12h Ahead</option>
              <option value={24} className="bg-slate-900 text-slate-100">24h Ahead</option>
              <option value={48} className="bg-slate-900 text-slate-100">48h Ahead</option>
            </select>
          </div>

          {/* Demand Percentile Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
            <span className="text-slate-400 font-medium">Demand Plan:</span>
            <div className="inline-flex rounded-md p-0.5 bg-slate-950 border border-slate-800">
              <button
                onClick={() => setPercentile('p50')}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                  percentile === 'p50'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
                title="50th Percentile expected median demand"
              >
                P50
              </button>
              <button
                onClick={() => setPercentile('p90')}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                  percentile === 'p90'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
                title="90th Percentile conservative stress-test demand"
              >
                P90
              </button>
            </div>
          </div>

          {/* Unit Toggle */}
          <button
            onClick={() => setUseLitresPerHour(!useLitresPerHour)}
            className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
            title="Toggle between Megalitres (ML) and Litres/Hour"
          >
            Unit: <span className="text-cyan-400 font-semibold">{useLitresPerHour ? 'L/hr' : 'ML'}</span>
          </button>

          {/* Policy Profile Selector */}
          {cityProfiles && cityProfiles.length > 0 && onSelectActiveProfile && (
            <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-md border border-indigo-500/40">
              <span className="text-indigo-400 font-medium whitespace-nowrap">Policy Profile:</span>
              <select
                value={activeProfileId}
                onChange={(e) => onSelectActiveProfile(e.target.value)}
                className="bg-transparent text-indigo-200 font-mono font-semibold focus:outline-none cursor-pointer max-w-[170px] truncate text-xs"
              >
                {cityProfiles.map(p => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-slate-100">
                    {p.cityName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Guided Demo Button */}
          <button
            onClick={onStartGuidedDemo}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-sky-950/50 cursor-pointer"
            title="Start 5-step guided tour through the decision-support system"
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Guided Demo</span>
          </button>

          {/* AI Brief Button */}
          <button
            onClick={onOpenOperatorBrief}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-teal-950/70 hover:bg-teal-900/70 border border-teal-500/40 text-teal-300 text-xs font-medium transition-colors cursor-pointer"
            title="Generate print-ready Operator Shift Brief"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden md:inline">Operator Brief</span>
          </button>

          {/* Ask the Grid Button */}
          <button
            onClick={onOpenAskGrid}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-950/70 hover:bg-indigo-900/70 border border-indigo-500/40 text-indigo-300 text-xs font-medium transition-colors cursor-pointer"
            title="Ask questions to the telemetry engine"
          >
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">Ask Grid</span>
          </button>

          {/* Demo Seed Mode Button */}
          <button
            onClick={onSeedDemo}
            disabled={isSeeding}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
            title="Reload verified precomputed seed dataset into Firestore"
          >
            <Database className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden lg:inline">{isSeeding ? 'Seeding...' : 'Demo Seed'}</span>
          </button>

          {/* User Sign-In / Auth Profile */}
          {(user || userProfile) ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              {(user?.photoURL || (userProfile as any)?.photoURL) ? (
                <img
                  src={user?.photoURL || (userProfile as any)?.photoURL}
                  alt={userProfile?.displayName || user?.displayName || 'Operator'}
                  className={`w-6 h-6 rounded-full border ${isAdmin ? 'border-violet-500' : 'border-sky-500'}`}
                />
              ) : (
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold ${
                    isAdmin ? 'bg-violet-600' : 'bg-sky-600'
                  }`}
                >
                  {(userProfile?.displayName || user?.displayName || user?.email || 'U').charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-slate-200 font-semibold text-[11px] leading-tight">
                  {userProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Operator'}
                </span>
                <span className="text-[9px] font-mono text-cyan-400 font-bold">
                  {isAdmin ? 'ADMINISTRATOR' : 'GRID OPERATOR'}
                </span>
              </div>
              <span
                className={`hidden md:inline px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                  isAdmin
                    ? 'bg-violet-950/80 text-violet-300 border border-violet-500/40'
                    : 'bg-sky-950/80 text-sky-300 border border-sky-500/40'
                }`}
              >
                {isAdmin ? 'ADMIN' : 'OPERATOR'}
              </span>
              <button
                onClick={onLogout}
                className="text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-slate-900 transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
              <button
                onClick={() => onOpenAuthModal('signin', 'operator')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-medium border border-slate-700 transition-colors shadow-xs cursor-pointer"
                title="Sign in as Operator or Administrator"
              >
                <User className="w-3 h-3 text-cyan-400" />
                <span>Sign In</span>
              </button>
              <button
                onClick={() => onOpenAuthModal('signup', 'operator')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-950/80 hover:bg-sky-900/80 text-sky-300 text-xs font-semibold border border-sky-500/40 transition-colors shadow-xs cursor-pointer"
                title="Create a new Operator or Admin account"
              >
                <span>Sign Up</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Tab Navigation */}
      <nav className="flex items-center overflow-x-auto scrollbar-none px-4 py-1.5 gap-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-sky-950/80 text-sky-300 border border-sky-500/50 shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80 border border-transparent'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-rose-950/80 text-rose-300 border border-rose-500/40">
                  {tab.badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
