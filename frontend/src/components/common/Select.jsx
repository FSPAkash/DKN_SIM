import { forwardRef, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import clsx from 'clsx';

const Select = forwardRef(function Select(
  {
    label,
    value,
    onChange,
    options = [],
    placeholder = 'Select...',
    disabled = false,
    error,
    className,
    optionClassName,
    maxDropdownHeight = 100,
  },
  ref
) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close on outside click
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
    typeof opt === 'object' ? opt.value === value : opt === value
  );

  const displayValue = selectedOption
    ? typeof selectedOption === 'object' ? selectedOption.label : selectedOption
    : placeholder;

  return (
    <div ref={containerRef} className={clsx('relative', className)}>
      {label && (
        <label className="block text-sm font-medium text-daikin-dark mb-1.5">
          {label}
        </label>
      )}

      <button
        ref={ref}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={clsx(
          'w-full flex items-center justify-between gap-2',
          'h-10 px-3 rounded-lg',
          'glass-input text-left',
          'text-sm text-daikin-dark',
          disabled && 'opacity-50 cursor-not-allowed',
          error && 'border-red-500 focus:ring-red-500',
          isOpen && 'border-daikin-blue ring-2 ring-daikin-blue/20'
        )}
      >
        <span className={clsx(!selectedOption && 'text-surface-400')}>
          {displayValue}
        </span>
        <ChevronDown 
          className={clsx(
            'h-4 w-4 text-surface-400 transition-transform duration-200',
            isOpen && 'rotate-180'
          )} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            className={clsx(
              'absolute z-[var(--z-dropdown)] w-full mt-1',
              'py-1 rounded-lg',
              'glass-strong shadow-lg',
              'max-h-60 overflow-auto'
            )}
            style={{ maxHeight: maxDropdownHeight }}
          >
            {options.map((option, index) => {
              const optValue = typeof option === 'object' ? option.value : option;
              const optLabel = typeof option === 'object' ? option.label : option;
              const isSelected = optValue === value;

              return (
                <button
                  key={optValue ?? index}
                  type="button"
                  onClick={() => {
                    onChange(optValue);
                    setIsOpen(false);
                  }}
                  className={clsx(
                    'w-full flex items-center justify-between gap-2',
                    'px-3 py-2 text-sm text-left',
                    'transition-colors duration-100',
                    isSelected 
                      ? 'bg-daikin-blue/10 text-daikin-blue' 
                      : 'text-daikin-dark hover:bg-surface-100',
                    optionClassName
                  )}
                >
                  <span>{optLabel}</span>
                  {isSelected && (
                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-daikin-blue">
                        <Check className="h-3 w-3 text-white" strokeWidth={3} />
                    </span>
                    )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
});

export default Select;