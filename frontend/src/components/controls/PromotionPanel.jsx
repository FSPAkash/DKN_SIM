import { X } from 'lucide-react';
import { Button, Select, Slider, Checkbox, Badge } from '../common';
import { useForecast } from '../../contexts/ForecastContext';
import { MONTHS, EVENT_TYPES } from '../../utils/constants';
import { formatPercent } from '../../utils/formatters';

function PromotionPanel({
  weights,
  settings,
  toggleSettings,
  lockedEvents,
  onChange,
  onToggleChange,
}) {
  const { addLockedEvent, removeLockedEvent } = useForecast();
  
  const lockedMonths = lockedEvents.map(e => e.month);
  const availableMonths = MONTHS.filter(m => !lockedMonths.includes(m) && m !== 'Mar');
  const canAddMore = lockedEvents.length < 3;

  const handleLockEvent = () => {
    if (!settings.month) return;
    
    // Calculate multiplier (simplified - actual calculation in backend)
    const multiplier = 1 + (settings.pct || 0) / 100;
    
    addLockedEvent(EVENT_TYPES.PROMO, {
      month: settings.month,
      pct: settings.pct,
      multiplier,
    });
    
    // Reset current selection
    onChange({ ...settings, month: null, pct: 0 });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <h3 className="text-sm font-semibold text-daikin-dark">
        Promotion Event
      </h3>

      {/* March Madness Toggles */}
      <div className="space-y-2 pb-3 border-b border-surface-200/50">
        <Checkbox
          label="Remove Historical March Madness"
          checked={toggleSettings.march_madness}
          onChange={(checked) => onToggleChange('march_madness', checked)}
        />
        <Checkbox
          label="Lock March Madness"
          checked={toggleSettings.lock_march}
          onChange={(checked) => onToggleChange('lock_march', checked)}
        />
      </div>

      {/* Month Selector */}
      <Select
        label="Month"
        value={settings.month}
        onChange={(value) => onChange({ ...settings, month: value })}
        options={[
          { value: null, label: 'None' },
          ...availableMonths.map(m => ({ value: m, label: m })),
        ]}
        disabled={!canAddMore}
      />

      {/* Boost Slider */}
      {settings.month && (
        <>
          <Slider
            label="Boost Effect"
            value={settings.pct || 0}
            onChange={(value) => onChange({ ...settings, pct: value })}
            min={0}
            max={50}
            step={5}
            formatValue={(v) => `+${v}%`}
          />

          {/* Spillover Controls */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Slider
                label="Spillover Reduction"
                value={settings.spill_pct || 10}
                onChange={(value) => onChange({ ...settings, spill_pct: value })}
                min={0}
                max={50}
                step={5}
                formatValue={(v) => `${v}%`}
              />
            </div>
            <Checkbox
              label="Enable"
              checked={settings.spill_enabled !== false}
              onChange={(checked) => onChange({ ...settings, spill_enabled: checked })}
            />
          </div>

          {/* Lock Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={handleLockEvent}
            className="w-full"
          >
            Lock in {settings.month} Promo ({formatPercent(settings.pct || 0, 0, true)})
          </Button>
        </>
      )}

      {/* Locked Events */}
      {lockedEvents.length > 0 && (
        <div className="space-y-2 pt-3 border-t border-surface-200/50">
          <p className="text-xs font-medium text-surface-500">Locked Events:</p>
          {lockedEvents.map((event) => (
            <div 
              key={event.month}
              className="flex items-center justify-between p-2 rounded-lg bg-green-50 border border-green-200"
            >
              <span className="text-sm text-green-700">
                {event.month}: {formatPercent((event.multiplier - 1) * 100, 0, true)}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => removeLockedEvent(EVENT_TYPES.PROMO, event.month)}
                className="text-green-600 hover:text-red-500 hover:bg-red-50"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PromotionPanel;