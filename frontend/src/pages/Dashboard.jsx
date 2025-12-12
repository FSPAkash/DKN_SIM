import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Info } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useForecast } from '../contexts/ForecastContext';
import { 
  GlassCard, 
  Button, 
  Spinner, 
  Alert 
} from '../components/common';
import Header from '../components/dashboard/Header';
import ForecastChart from '../components/chart/ForecastChart';
import ControlsPanel from '../components/controls/ControlsPanel';
import EffectToggles from '../components/controls/EffectToggles';
import SummaryMetrics from '../components/dashboard/SummaryMetrics';
import WarningModal from '../components/info/WarningModal';
import { calculateSummaryStats, generateCSV, downloadFile } from '../utils/calculations';

// Compact inline selector with centered text
function CompactSelector({ label, value, options, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => 
    (typeof opt === 'object' ? opt.value : opt) === value
  );
  
  const displayValue = selectedOption
    ? (typeof selectedOption === 'object' ? selectedOption.label : selectedOption)
    : '—';

  return (
    <div ref={containerRef} className="relative z-10">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          text-center min-w-[80px] px-3 py-1.5 rounded-lg
          transition-all duration-150
          hover:bg-white/50
          ${isOpen ? 'bg-white/50' : ''}
        `}
      >
        <span className="block text-[9px] uppercase tracking-wider text-surface-400 font-medium leading-none mb-1">
          {label}
        </span>
        <span className="block text-xs font-semibold text-daikin-dark leading-none">
          {displayValue}
        </span>
      </button>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.1 }}
          className="absolute top-full right-1/1 -translate-x-1/2 mt-2 min-w-[120px] z-50 
                     bg-white rounded-lg shadow-lg border border-surface-200
                     py-1 max-h-48 overflow-auto"
        >
          {options.map((option, index) => {
            const optValue = typeof option === 'object' ? option.value : option;
            const optLabel = typeof option === 'object' ? option.label : option;
            const isSelected = optValue === value;

            return (
              <button
                key={optValue ?? index}
                onClick={() => {
                  onChange(optValue);
                  setIsOpen(false);
                }}
                className={`
                  w-full px-3 py-1.5 text-left text-xs
                  transition-colors duration-100
                  ${isSelected 
                    ? 'bg-daikin-blue/10 text-daikin-blue font-medium' 
                    : 'text-daikin-dark hover:bg-surface-50'
                  }
                `}
              >
                {optLabel}
              </button>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

function BreathingSelector({ children }) {
  // ============================================
  // CUSTOMIZATION OPTIONS
  // ============================================
  
  // Color options (change the RGB values)
  const glowColor = {
    r: 0,
    g: 160,
    b: 228,
  };
  
  // Intensity options
  const intensity = {
    glowOpacity: 0.25,      // Inner glow strength (0.05 = subtle, 0.15 = strong)
    borderOpacity: 0.5,    // Border glow strength (0.1 = subtle, 0.25 = strong)
    shadowOpacity: 0.9,     // Outer shadow strength (0.1 = subtle, 0.3 = strong)
    shadowBlur: 100,         // Shadow blur radius in px (20 = tight, 50 = diffuse)
    maxOpacity: 0.6,        // Peak opacity during animation (0.4 = subtle, 0.8 = strong)
    scaleAmount: 1.5,      // Scale at peak (1.005 = subtle, 1.02 = noticeable)
  };

  return (
    <div className="relative flex items-center justify-center gap-4 w-full px-4 py-2 rounded-xl bg-surface-50/50 border border-surface-200/50 overflow-visible">
      {/* Animated glow layer */}
      <motion.div
        className="absolute inset-0 rounded-xl pointer-events-none"
        animate={{
          opacity: [0, intensity.maxOpacity, 0],
          scale: [0.98, intensity.scaleAmount, 0.98],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: [0.8, 0, 0.4, 1],
        }}
        style={{
          background: `radial-gradient(ellipse at center, rgba(${glowColor.r}, ${glowColor.g}, ${glowColor.b}, ${intensity.glowOpacity}) 0%, transparent 70%)`,
        }}
      />
      
      {/* Border glow */}
      <motion.div
        className="absolute inset-0 rounded-xl pointer-events-none"
        animate={{
          opacity: [0, 1, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: [0.4, 0, 0.2, 1],
        }}
        style={{
          boxShadow: `inset 0 0 0 1px rgba(${glowColor.r}, ${glowColor.g}, ${glowColor.b}, ${intensity.borderOpacity}), 0 0 ${intensity.shadowBlur}px -5px rgba(${glowColor.r}, ${glowColor.g}, ${glowColor.b}, ${intensity.shadowOpacity})`,
        }}
      />

      {/* Content */}
      {children}
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const {
    products,
    apsClasses,
    selectedProduct,
    selectedAps,
    selectedYear,
    availableYears,
    currentBaseline,
    currentActuals,
    currentDelivered,
    weights,
    marketShareData,
    simulationResult,
    lockedEvents,
    isLoading,
    error,
    setSelectedProduct,
    setSelectedAps,
    setSelectedYear,
    loadProducts,
    loadProductData,
    runSimulation,
    clearError,
  } = useForecast();

  // Chart visibility state
  const [showBaseline, setShowBaseline] = useState(true);
  const [showDelivered, setShowDelivered] = useState(true);
  const [showActuals, setShowActuals] = useState(true);

  // Warnings state
  const [warningsEnabled, setWarningsEnabled] = useState(true);
  const [warningsDismissed, setWarningsDismissed] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);

  // Simulation parameters state
  const [simParams, setSimParams] = useState({
    ms_mode: 'relative',
    ms_params: { delta: 0 },
    promo_settings: { month: null, pct: 0, spill_enabled: true, spill_pct: 10 },
    shortage_settings: { month: null, pct: 0 },
    regulation_settings: { month: null, pct: 0 },
    custom_settings: { month: null, weight: 1.0, pct: 0 },
    toggle_settings: {
      march_madness: false,
      lock_march: false,
      trend: false,
      trans: false,
      pf_pos: false,
      pf_neg: false,
    },
    damp_k: 0.5,
  });

  // Debounce ref for simulation
  const simulationTimeoutRef = useRef(null);

  // Load products on mount
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Load product data when selection changes
  useEffect(() => {
    if (selectedProduct) {
      loadProductData(selectedProduct, selectedAps);
    }
  }, [selectedProduct, selectedAps, loadProductData]);

  // Debounced simulation runner
  useEffect(() => {
    if (!selectedProduct || !selectedYear || currentBaseline.length === 0) {
      return;
    }

    if (simulationTimeoutRef.current) {
      clearTimeout(simulationTimeoutRef.current);
    }

    simulationTimeoutRef.current = setTimeout(() => {
      runSimulation(simParams);
      setWarningsDismissed(false);
    }, 150);

    return () => {
      if (simulationTimeoutRef.current) {
        clearTimeout(simulationTimeoutRef.current);
      }
    };
  }, [selectedProduct, selectedYear, currentBaseline, simParams, lockedEvents, runSimulation]);

  // Memoized handlers
  const updateSimParams = useCallback((updates) => {
    setSimParams(prev => ({
      ...prev,
      ...updates,
    }));
  }, []);

  const handleExport = useCallback(() => {
    if (!simulationResult) return;

    const csv = generateCSV({
      product: selectedProduct,
      apsClass: selectedAps,
      year: selectedYear,
      baseline: currentBaseline,
      simulated: simulationResult.simulated,
      multipliers: simulationResult.final_multipliers,
      msAdjustments: simulationResult.ms_adjustments,
      msMode: simParams.ms_mode,
      appliedDetails: simulationResult.applied_details,
    });

    const filename = `simulation_${selectedProduct}_${selectedAps || 'total'}_${selectedYear}.csv`;
    downloadFile(csv, filename);
  }, [simulationResult, selectedProduct, selectedAps, selectedYear, currentBaseline, simParams.ms_mode]);

  // Memoized toggle handlers
  const handleToggleBaseline = useCallback((val) => setShowBaseline(val), []);
  const handleToggleDelivered = useCallback((val) => setShowDelivered(val), []);
  const handleToggleActuals = useCallback((val) => setShowActuals(val), []);
  const handleWarningsChange = useCallback((e) => setWarningsEnabled(e.target.checked), []);
  const handleShowWarningModal = useCallback(() => setShowWarningModal(true), []);
  const handleCloseWarningModal = useCallback(() => setShowWarningModal(false), []);
  const handleDismissWarnings = useCallback(() => setWarningsDismissed(true), []);
  const handleNavigateToMSGuide = useCallback(() => navigate('/market-share-guide'), [navigate]);
  const handleNavigateToDev = useCallback(() => navigate('/dev'), [navigate]);

  const handleEffectToggle = useCallback((key, value) => {
    updateSimParams({
      toggle_settings: {
        ...simParams.toggle_settings,
        [key]: value,
      },
    });
  }, [simParams.toggle_settings, updateSimParams]);

  // Calculate summary stats
  const summaryStats = simulationResult
    ? calculateSummaryStats(simulationResult.simulated, currentBaseline)
    : null;

  // Get exceeded months for warnings
  const exceededMonths = simulationResult?.exceeded_months || [];
  const showWarnings = warningsEnabled && !warningsDismissed && exceededMonths.length > 0;

  // Build APS options
  const apsOptions = [
    { value: null, label: 'All Classes' },
    ...(apsClasses[selectedProduct] || []).map(aps => ({ value: aps, label: aps })),
  ];

  if (isLoading && !selectedProduct) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <Header
        user={user}
        isAdmin={isAdmin}
        onLogout={logout}
        onDevMode={handleNavigateToDev}
      />

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <Alert type="error" onClose={clearError}>
              {error}
            </Alert>
          </motion.div>
        )}

        {/* Chart Card with Integrated Selectors */}
        <div className="relative z-10">
          <GlassCard className="mb-6" padding="lg" style={{ minHeight: 520 }}>
            
            {/* Top Bar: Selectors on left, Title on right */}
            <div className="flex items-start justify-between mb-4 pb-4 border-b border-surface-200/50">
              
              {/* Left: Data Selectors */}
              <div className="flex flex-col items-start gap-2">
                {/* Label */}
                <span className="text-[12px] uppercase tracking-wider text-black font-medium w-full text-center">
                  Make Product and Class Selection
                </span>
                
                {/* Selectors with Apple Breathing Animation */}
                <BreathingSelector>
                  <CompactSelector
                    label="Product"
                    value={selectedProduct}
                    options={products}
                    onChange={setSelectedProduct}
                  />
                  
                  <div className="w-px h-6 bg-surface-200 relative z-10" />
                  
                  <CompactSelector
                    label="APS Class"
                    value={selectedAps}
                    options={apsOptions}
                    onChange={setSelectedAps}
                  />
                  
                  <div className="w-px h-6 bg-surface-200 relative z-10" />
                  
                  <CompactSelector
                    label="Year"
                    value={selectedYear}
                    options={availableYears}
                    onChange={setSelectedYear}
                  />
                </BreathingSelector>
              </div>

              {/* Right: Chart Title */}
              <div className="text-right">
                <p className="text-xs text-surface-400">
                  {selectedProduct} {selectedAps ? `· ${selectedAps}` : ''} · {selectedYear}
                </p>
              </div>
            </div>

            {/* Chart */}
            {isLoading ? (
              <div className="h-[380px] flex items-center justify-center">
                <Spinner size="lg" />
              </div>
            ) : (
              <ForecastChart
                baseline={currentBaseline}
                simulated={simulationResult?.simulated || []}
                delivered={currentDelivered}
                actuals={currentActuals}
                exceededMonths={showWarnings ? exceededMonths : []}
                product={selectedProduct}
                apsClass={selectedAps}
                year={selectedYear}
                showBaseline={showBaseline}
                showDelivered={showDelivered}
                showActuals={showActuals}
                onToggleBaseline={handleToggleBaseline}
                onToggleDelivered={handleToggleDelivered}
                onToggleActuals={handleToggleActuals}
              />
            )}

            {/* Warning Controls */}
            <div className="h-12 flex items-center justify-between mt-4 pt-4 border-t border-surface-200/50">
              <label className="flex items-center gap-2 text-sm text-surface-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={warningsEnabled}
                  onChange={handleWarningsChange}
                  style={{ accentColor: '#00A0E4' }}
                  className="w-4 h-4 rounded"
                />
                Enable Warnings
              </label>

              {showWarnings ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleShowWarningModal}
                    leftIcon={<Info className="h-4 w-4" />}
                  >
                    About
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDismissWarnings}
                  >
                    Dismiss
                  </Button>
                </div>
              ) : (
                <div className="invisible flex items-center gap-2">
                  <Button variant="ghost" size="sm" leftIcon={<Info className="h-4 w-4" />}>
                    About
                  </Button>
                  <Button variant="ghost" size="sm">
                    Dismiss
                  </Button>
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Controls Panel */}
        <div className="relative z-20" style={{ minHeight: 280 }}>
          <ControlsPanel
            weights={weights}
            marketShareData={marketShareData}
            selectedYear={selectedYear}
            lockedEvents={lockedEvents}
            simParams={simParams}
            onUpdateParams={updateSimParams}
            onNavigateToMSGuide={handleNavigateToMSGuide}
          />
        </div>

        {/* Effect Toggles */}
        <div className="relative z-10 mt-6" style={{ minHeight: 80 }}>
          <EffectToggles
            toggles={simParams.toggle_settings}
            onToggle={handleEffectToggle}
          />
        </div>

        {/* Summary Metrics */}
        <div className="relative z-0 mt-6" style={{ minHeight: 100 }}>
          <SummaryMetrics
            stats={summaryStats}
            onExport={handleExport}
            isLoading={isLoading}
          />
        </div>
      </main>

      {/* Warning Modal */}
      <WarningModal
        isOpen={showWarningModal}
        onClose={handleCloseWarningModal}
        isAdmin={isAdmin}
      />
    </div>
  );
}

export default Dashboard;