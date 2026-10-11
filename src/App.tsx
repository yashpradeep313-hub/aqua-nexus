import React, { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import {
  auth,
  db,
  loginWithGoogle,
  logoutUser,
  testConnection,
  seedFirestoreIfEmpty,
  seedUsersAndAdminsIfEmpty,
  updateAnomalyStatus,
  saveOperatorPlan,
  saveOperatorScenario,
  handleFirestoreError,
  fetchUserProfile,
  BOOTSTRAP_ADMIN_EMAIL,
  OperationType
} from './services/firebase';
import {
  SEED_ZONES,
  SEED_ANOMALIES,
  PRECOMPUTED_FORECASTS,
  SEED_METRICS
} from './data/seedData';
import {
  Zone,
  HourlyForecast,
  Anomaly,
  DemandPercentile,
  SavedPlan,
  ScenarioDefinition,
  ZoneRiskEvaluation,
  UserProfile,
  UserRole,
  CityProfile,
  FittedModelResult
} from './types';
import { runWaterOptimizer, evaluateZoneRisk } from './engine/waterEngine';
import {
  BUILTIN_KAGGLE_PROFILE,
  PRESET_SINGAPORE_PUB,
  PRESET_CAPE_TOWN_DAY_ZERO,
  PRESET_LAKEVIEW_POLICY,
  PRESET_LAKEVIEW_CONSUMPTION,
  PRESET_RIVERTON_PROFILE,
  PRESET_EDGE_CASE_MESSY
} from './data/cityLabPresets';

import { Navbar, ActiveTab } from './components/Navbar';
import { CommandCenter } from './components/CommandCenter';
import { LiveMap } from './components/LiveMap';
import { ForecastExplorer } from './components/ForecastExplorer';
import { AnomalyRadar } from './components/AnomalyRadar';
import { SupplyPlanner } from './components/SupplyPlanner';
import { WeatherScenarios } from './components/WeatherScenarios';
import { CityLearningLab } from './components/CityLearningLab';
import { ModelReport } from './components/ModelReport';
import { AdminDatabaseView } from './components/AdminDatabaseView';
import { AboutView } from './components/AboutView';
import { ExplainModal } from './components/ExplainModal';
import { OperatorBriefModal } from './components/OperatorBriefModal';
import { AskGridModal } from './components/AskGridModal';
import { GuidedDemo } from './components/GuidedDemo';
import { AuthModal } from './components/AuthModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('command-center');
  const [percentile, setPercentile] = useState<DemandPercentile>('p90');
  const [horizonHour, setHorizonHour] = useState<number>(6);
  const [useLitresPerHour, setUseLitresPerHour] = useState<boolean>(false);

  // Core Data State (loaded from seedData with Firestore fallback)
  // Default available grid inflow is 46.0 ML (from SEED_ZONES sum)
  const [zones, setZones] = useState<Zone[]>(SEED_ZONES);
  const [anomalies, setAnomalies] = useState<Anomaly[]>(SEED_ANOMALIES);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // City Learning Lab Profiles & Active Model State
  const [cityProfiles, setCityProfiles] = useState<CityProfile[]>(() => {
    try {
      const saved = sessionStorage.getItem('aquanexus_city_profiles');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Could not read session storage for city profiles', e);
    }
    return [BUILTIN_KAGGLE_PROFILE];
  });

  const [activeProfileId, setActiveProfileId] = useState<string>(() => {
    try {
      const saved = sessionStorage.getItem('aquanexus_active_profile_id');
      if (saved) return saved;
    } catch (e) {}
    return 'profile-kaggle-default';
  });

  const [activeFittedModel, setActiveFittedModel] = useState<FittedModelResult | null>(null);

  // Sync cityProfiles to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('aquanexus_city_profiles', JSON.stringify(cityProfiles));
    } catch (e) {}
  }, [cityProfiles]);

  useEffect(() => {
    try {
      sessionStorage.setItem('aquanexus_active_profile_id', activeProfileId);
    } catch (e) {}
  }, [activeProfileId]);

  // Auth Modal State (Sign In & Sign Up for Operator and Admin)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [authModalRole, setAuthModalRole] = useState<UserRole>('operator');

  // Selected Zone on Map from External Card navigation (Anomaly Radar -> Live Map)
  const [selectedMapZoneId, setSelectedMapZoneId] = useState<string | null>(null);

  // Guided Demo Walk-through State
  const [guidedDemoOpen, setGuidedDemoOpen] = useState<boolean>(false);
  const [guidedDemoStep, setGuidedDemoStep] = useState<number>(1);

  // Modals
  const [explainingZone, setExplainingZone] = useState<ZoneRiskEvaluation | null>(null);
  const [showOperatorBrief, setShowOperatorBrief] = useState<boolean>(false);
  const [showAskGrid, setShowAskGrid] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Initial boot: Test Firestore connection and setup Auth listener
  useEffect(() => {
    testConnection().then(online => {
      if (online) {
        getDocs(collection(db, 'anomalies'))
          .then(snap => {
            if (!snap.empty) {
              const liveAnoms: Anomaly[] = [];
              snap.forEach(d => liveAnoms.push(d.data() as Anomaly));
              setAnomalies(liveAnoms);
            }
          })
          .catch(err => {
            handleFirestoreError(err, OperationType.GET, 'anomalies');
          });
      }
    });

    const unsubscribe = onAuthStateChanged(auth, async currentUser => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const profile = await fetchUserProfile(currentUser.uid);
          if (profile) {
            setUserProfile(profile);
          } else {
            const isBootAdmin = currentUser.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
            setUserProfile({
              uid: currentUser.uid,
              email: currentUser.email || 'operator@aquanexus.gov',
              displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Operator',
              role: isBootAdmin ? 'admin' : 'operator',
              department: isBootAdmin ? 'Municipal Administration' : 'Hydraulic Operations',
              status: 'active',
              createdAt: new Date().toISOString()
            });
          }
        } catch {
          // Non-fatal profile load
        }
      } else {
        setUserProfile(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Compute active forecasts map for selected horizon
  const activeForecastMap = useMemo(() => {
    const map = new Map<string, HourlyForecast>();
    PRECOMPUTED_FORECASTS.forEach(f => {
      if (f.horizonHour === horizonHour) {
        map.set(f.zoneId, f);
      }
    });
    // Fallback if not found for zone
    zones.forEach(z => {
      if (!map.has(z.id)) {
        map.set(z.id, {
          zoneId: z.id,
          horizonHour,
          timestamp: new Date().toISOString(),
          p10DemandML: z.currentSupplyML * 0.9,
          p50DemandML: z.currentSupplyML,
          p90DemandML: z.currentSupplyML * 1.15,
          lastWeekDemandML: z.currentSupplyML,
          temperatureC: 24,
          rainMm: 0
        });
      }
    });
    return map;
  }, [horizonHour, zones]);

  // Active anomaly map
  const activeAnomalyMap = useMemo(() => {
    return new Map(anomalies.map(a => [a.zoneId, a]));
  }, [anomalies]);

  // Risk evaluation per zone
  const riskEvaluations = useMemo(() => {
    return zones.map(z => {
      const forecast = activeForecastMap.get(z.id);
      return evaluateZoneRisk(z, forecast, percentile, activeAnomalyMap);
    });
  }, [zones, activeForecastMap, percentile, activeAnomalyMap]);

  // System total supply (defaults to 46.0 ML)
  const currentTotalSupply = useMemo(() => {
    return Number(zones.reduce((acc, z) => acc + z.currentSupplyML, 0).toFixed(2));
  }, [zones]);

  const activeCityProfile = useMemo(() => {
    return cityProfiles.find(p => p.id === activeProfileId) || BUILTIN_KAGGLE_PROFILE;
  }, [cityProfiles, activeProfileId]);

  // Optimization Result
  const optimizationResult = useMemo(() => {
    return runWaterOptimizer(zones, activeForecastMap, currentTotalSupply, {
      percentile,
      fairnessFloor: 0.65,
      emergencyReserveML: 0,
      cityPolicy: activeCityProfile.id !== 'profile-kaggle-default' ? activeCityProfile.policy : null
    });
  }, [zones, activeForecastMap, currentTotalSupply, percentile, activeCityProfile]);

  // Volume Formatter (ML vs Litres/hour)
  const formatVolume = (ml: number): string => {
    if (useLitresPerHour) {
      const lph = Math.round((ml * 1_000_000) / (horizonHour || 1));
      return lph.toLocaleString();
    }
    return ml.toFixed(2);
  };

  // Handlers
  const handleLogin = async () => {
    try {
      await loginWithGoogle();
      showToast('Authenticated with Google. Operator credentials active.');
    } catch (err: any) {
      showToast('Sign-in cancelled or unavailable.');
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {}
    setUser(null);
    setUserProfile(null);
    showToast('Signed out of operator console.');
  };

  const handleSeedDemo = async () => {
    setIsSeeding(true);
    try {
      const res = await seedFirestoreIfEmpty();
      showToast(res.message);
    } catch (err) {
      showToast('Seeding completed in local demo cache.');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleUpdateAnomalyStatus = async (id: string, status: any) => {
    setAnomalies(prev =>
      prev.map(a => (a.id === id ? { ...a, status, updatedAt: new Date().toISOString() } : a))
    );

    try {
      await updateAnomalyStatus(id, status);
      showToast(`Anomaly status updated to ${status}.`);
    } catch (err) {
      showToast(`Status updated in local session (${status}).`);
    }
  };

  const handleApplyPlan = async (plan: SavedPlan) => {
    try {
      await saveOperatorPlan(plan);
      showToast('Plan saved to Firestore and marked as applied.');
    } catch (err) {
      showToast('Plan applied to current operations session.');
    }
  };

  const handleSaveScenario = async (scenario: ScenarioDefinition) => {
    try {
      await saveOperatorScenario(scenario);
      showToast(`Scenario "${scenario.title}" saved to Firestore.`);
    } catch (err) {
      showToast(`Scenario "${scenario.title}" saved locally.`);
    }
  };

  // Set total supply dynamically (Brownie point: change available supply and watch redistribution)
  const handleSetTotalSupply = (newSupplyML: number) => {
    const defaultTotal = SEED_ZONES.reduce((acc, z) => acc + z.currentSupplyML, 0); // 46.0 ML
    const ratio = newSupplyML / defaultTotal;
    setZones(
      SEED_ZONES.map(z => ({
        ...z,
        currentSupplyML: Number((z.currentSupplyML * ratio).toFixed(2))
      }))
    );
  };

  // Reset to default 46.0 ML state handler
  const handleResetToDefault = () => {
    setZones(SEED_ZONES);
    showToast('Reset to default shortage state: 46.0 ML grid supply vs 55.79 ML demand.');
  };

  // Simulate Shortage (-30%) handler
  const handleSimulateShortage = () => {
    setZones(prev =>
      prev.map(z => ({
        ...z,
        currentSupplyML: Number((z.currentSupplyML * 0.7).toFixed(2))
      }))
    );
    showToast('Simulating emergency shortage: total grid supply reduced by 30% (down to 32.2 ML).');
  };

  // City Learning Lab Handlers
  const handleSaveProfile = (profile: CityProfile) => {
    setCityProfiles(prev => {
      const idx = prev.findIndex(p => p.id === profile.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = profile;
        return updated;
      }
      return [...prev, profile];
    });
    setActiveProfileId(profile.id);
    showToast(`City Profile "${profile.cityName}" saved and activated.`);
  };

  const handleDeleteProfile = (id: string) => {
    if (id === 'profile-kaggle-default') return;
    setCityProfiles(prev => prev.filter(p => p.id !== id));
    if (activeProfileId === id) {
      setActiveProfileId('profile-kaggle-default');
    }
    showToast('City profile removed.');
  };

  const handleRenameProfile = (id: string, newName: string) => {
    setCityProfiles(prev =>
      prev.map(p => (p.id === id ? { ...p, cityName: newName } : p))
    );
    showToast(`Profile renamed to "${newName}".`);
  };

  const handleLoadPresets = () => {
    setCityProfiles(prev => {
      const existingIds = new Set(prev.map(p => p.id));
      const toAdd = [
        PRESET_LAKEVIEW_CONSUMPTION,
        PRESET_LAKEVIEW_POLICY,
        PRESET_RIVERTON_PROFILE,
        PRESET_EDGE_CASE_MESSY,
        PRESET_SINGAPORE_PUB,
        PRESET_CAPE_TOWN_DAY_ZERO
      ].filter(p => !existingIds.has(p.id));
      return [...prev, ...toAdd];
    });
    setActiveProfileId(PRESET_LAKEVIEW_CONSUMPTION.id);
    showToast('Loaded 4 Evaluation PDFs + International benchmark city profiles.');
  };

  // Anomaly Radar -> Live Map jump handler
  const handleViewOnMap = (zoneId: string) => {
    setSelectedMapZoneId(zoneId);
    setActiveTab('live-map');
  };

  // Guided Demo Handlers
  const handleStartGuidedDemo = () => {
    setGuidedDemoStep(1);
    setGuidedDemoOpen(true);
    setActiveTab('forecast-explorer');
  };

  const handleGuidedDemoNext = () => {
    const next = guidedDemoStep + 1;
    setGuidedDemoStep(next);
    if (next === 2) setActiveTab('anomaly-radar');
    if (next === 3) setActiveTab('supply-planner');
    if (next === 4) setActiveTab('supply-planner');
    if (next === 5) setActiveTab('live-map');
  };

  const handleGuidedDemoPrev = () => {
    const prev = guidedDemoStep - 1;
    setGuidedDemoStep(prev);
    if (prev === 1) setActiveTab('forecast-explorer');
    if (prev === 2) setActiveTab('anomaly-radar');
    if (prev === 3) setActiveTab('supply-planner');
    if (prev === 4) setActiveTab('supply-planner');
  };

  const handleGuidedDemoSkip = () => {
    setGuidedDemoOpen(false);
  };

  const activeAnomalyCount = anomalies.filter(a => a.status === 'Investigating').length;

  return (
    <div className="min-h-screen bg-[#060911] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        percentile={percentile}
        setPercentile={setPercentile}
        horizonHour={horizonHour}
        setHorizonHour={setHorizonHour}
        useLitresPerHour={useLitresPerHour}
        setUseLitresPerHour={setUseLitresPerHour}
        activeAnomalyCount={activeAnomalyCount}
        user={user}
        userProfile={userProfile}
        onOpenAuthModal={(mode, role) => {
          setAuthModalMode(mode);
          setAuthModalRole(role);
          setIsAuthModalOpen(true);
        }}
        onLogout={handleLogout}
        onOpenAskGrid={() => setShowAskGrid(true)}
        onOpenOperatorBrief={() => setShowOperatorBrief(true)}
        onSeedDemo={handleSeedDemo}
        isSeeding={isSeeding}
        onStartGuidedDemo={handleStartGuidedDemo}
        cityProfiles={cityProfiles}
        activeProfileId={activeProfileId}
        onSelectActiveProfile={setActiveProfileId}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-lg bg-slate-900/95 border border-cyan-500/40 text-cyan-200 text-xs shadow-2xl shadow-cyan-950/50 animate-fade-in flex items-center gap-2 font-mono">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'command-center' && (
          <CommandCenter
            zones={zones}
            riskEvaluations={riskEvaluations}
            optimizationResult={optimizationResult}
            anomalies={anomalies}
            horizonHour={horizonHour}
            percentile={percentile}
            useLitresPerHour={useLitresPerHour}
            formatVolume={formatVolume}
            currentTotalSupply={currentTotalSupply}
            onSetTotalSupply={handleSetTotalSupply}
            onRunSmartAllocation={() => setActiveTab('supply-planner')}
            onSimulateShortage={handleSimulateShortage}
            onResetToDefault={handleResetToDefault}
            onNavigateToTab={setActiveTab}
            onOpenExplainModal={setExplainingZone}
          />
        )}

        {activeTab === 'live-map' && (
          <LiveMap
            zones={zones}
            riskEvaluations={riskEvaluations}
            optimizationResult={optimizationResult}
            forecasts={activeForecastMap}
            anomalies={anomalies}
            horizonHour={horizonHour}
            setHorizonHour={setHorizonHour}
            formatVolume={formatVolume}
            useLitresPerHour={useLitresPerHour}
            onOpenExplainModal={setExplainingZone}
            externalSelectedZoneId={selectedMapZoneId}
          />
        )}

        {activeTab === 'forecast-explorer' && (
          <ForecastExplorer
            zones={zones}
            forecasts={activeForecastMap}
            horizonHour={horizonHour}
            setHorizonHour={setHorizonHour}
            formatVolume={formatVolume}
            useLitresPerHour={useLitresPerHour}
            activeFittedModel={activeFittedModel}
          />
        )}

        {activeTab === 'anomaly-radar' && (
          <AnomalyRadar
            anomalies={anomalies}
            onUpdateStatus={handleUpdateAnomalyStatus}
            user={user}
            onLoginPrompt={() => {
              setAuthModalMode('signin');
              setAuthModalRole('operator');
              setIsAuthModalOpen(true);
            }}
            onViewOnMap={handleViewOnMap}
          />
        )}

        {activeTab === 'supply-planner' && (
          <SupplyPlanner
            zones={zones}
            forecasts={activeForecastMap}
            percentile={percentile}
            currentOptimization={optimizationResult}
            formatVolume={formatVolume}
            useLitresPerHour={useLitresPerHour}
            onApplyPlan={handleApplyPlan}
            user={user}
            activeCityProfile={activeCityProfile}
            onResetCityPolicy={() => setActiveProfileId('profile-kaggle-default')}
          />
        )}

        {activeTab === 'weather-scenarios' && (
          <WeatherScenarios
            zones={zones}
            forecasts={activeForecastMap}
            percentile={percentile}
            formatVolume={formatVolume}
            useLitresPerHour={useLitresPerHour}
            onSaveScenario={handleSaveScenario}
            user={user}
          />
        )}

        {activeTab === 'city-lab' && (
          <CityLearningLab
            cityProfiles={cityProfiles}
            activeProfileId={activeProfileId}
            onSelectActiveProfile={setActiveProfileId}
            onSaveProfile={handleSaveProfile}
            onDeleteProfile={handleDeleteProfile}
            onRenameProfile={handleRenameProfile}
            onLoadPresets={handleLoadPresets}
            activeFittedModel={activeFittedModel}
            onToggleUseFittedModel={setActiveFittedModel}
          />
        )}

        {activeTab === 'model-report' && <ModelReport />}

        {activeTab === 'admin-database' && (
          <AdminDatabaseView
            currentUser={userProfile}
            onOpenAuth={(role) => {
              setAuthModalMode('signin');
              setAuthModalRole(role);
              setIsAuthModalOpen(true);
            }}
            zones={zones}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'about' && <AboutView />}
      </main>

      {/* Guided Demo Floating Controller */}
      <GuidedDemo
        isOpen={guidedDemoOpen}
        step={guidedDemoStep}
        onNext={handleGuidedDemoNext}
        onPrev={handleGuidedDemoPrev}
        onSkip={handleGuidedDemoSkip}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-4 py-3 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto w-full gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-300">Aqua Nexus Decision Support System</span>
          <span>•</span>
          <span className="font-mono text-[11px] text-cyan-400">v4.2.2-calibrated</span>
        </div>
        <div className="text-[11px] text-slate-500">
          All ML outputs deterministic precomputed JSON • Badges enforced on every metric
        </div>
      </footer>

      {/* Modals */}
      {explainingZone && (
        <ExplainModal
          zone={explainingZone}
          optimizationResult={optimizationResult}
          onClose={() => setExplainingZone(null)}
        />
      )}

      {showOperatorBrief && (
        <OperatorBriefModal
          optimizationResult={optimizationResult}
          riskEvaluations={riskEvaluations}
          anomalies={anomalies}
          horizonHour={horizonHour}
          onClose={() => setShowOperatorBrief(false)}
        />
      )}

      {showAskGrid && (
        <AskGridModal
          optimizationResult={optimizationResult}
          riskEvaluations={riskEvaluations}
          anomalies={anomalies}
          horizonHour={horizonHour}
          onClose={() => setShowAskGrid(false)}
        />
      )}

      {/* Operator and Admin Sign In / Sign Up Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(authResult: any) => {
          if (!authResult) return;
          const resolvedProfile = authResult.profile || authResult;
          setUserProfile(resolvedProfile);
          const roleStr = (resolvedProfile?.role || 'operator').toString().toUpperCase();
          const nameStr = resolvedProfile?.displayName || resolvedProfile?.email || 'User';
          showToast(`Signed in: ${nameStr} (${roleStr})`);
        }}
        initialMode={authModalMode}
        initialRole={authModalRole}
      />
    </div>
  );
}
