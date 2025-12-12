import { X } from 'lucide-react';
import { Button, Select, Slider } from '../common';
import { useForecast } from '../../contexts/ForecastContext';
import { MONTHS, EVENT_TYPES } from '../../utils/constants';
import { formatPercent } from '../../utils/formatters';

function RegulationPanel({
  weights,
  settings,
  lockedEvents,
  onChange,
}) {
  const { addLockedEvent, removeLockedEvent } = useForecast();
  
  const lockedMonths = lockedEvents.map(e => e.month);
  const availableMonths = MONTHS.filter(m => !lockedMonths.includes(m));
  const canAddMore = lockedEvents.length < 3;

  const handleLockEvent = () => {
    if (!settings.month) return;
    
    const multiplier = 1 + (settings.pct || 0) / 100;
    const cappedMultiplier = Math.min(multiplier, 1.0);
    
    addLockedEvent(EVENT_TYPES.REGULATION, {
      month: settings.month,
      pct: settings.pct,
      multiplier: cappedMultiplier,
    });
    
    onChange({ ...settings, month: null, pct: 0 });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-daikin-dark">
        Regulation Event
      </h3>

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

      {settings.month && (
        <>
          <Slider
            label="Impact Adjust"
            value={settings.pct || 0}
            onChange={(value) => onChange({ ...settings, pct: value })}
            min={-50}
            max={50}
            step={5}
            formatValue={(v) => `${v > 0 ? '+' : ''}${v}%`}
          />

          <Button
            variant="primary"
            size="sm"
            onClick={handleLockEvent}
            className="w-full"
          >
            Lock in {settings.month} Regulation
          </Button>
        </>
      )}

      {lockedEvents.length > 0 && (
        <div className="space-y-2 pt-3 border-t border-surface-200/50">
          <p className="text-xs font-medium text-surface-500">Locked Events:</p>
          {lockedEvents.map((event) => (
            <div 
              key={event.month}
              className="flex items-center justify-between p-2 rounded-lg bg-purple-50 border border-purple-200"
            >
              <span className="text-sm text-purple-700">
                {event.month}: {formatPercent((event.multiplier - 1) * 100, 0, true)}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => removeLockedEvent(EVENT_TYPES.REGULATION, event.month)}
                className="text-purple-600 hover:text-red-500 hover:bg-red-50"
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

export default RegulationPanel;