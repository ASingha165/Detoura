import React from 'react';
import { useTranslation } from '../DetouraContext';

export interface BudgetTierOption {
  tier: number;
  label: string;
  maxBudget?: number;
}

interface BudgetFilterProps {
  minBudget: number;
  maxBudget: number;
  selectedBudget: number;
  onBudgetChange: (budget: number) => void;
  selectedTier: string;
  onTierChange: (tier: string) => void;
  availableTiers?: number[];
  filteredCount?: number;
  totalCount?: number;
  onReset?: () => void;
}

export default function BudgetFilter({
  minBudget,
  maxBudget,
  selectedBudget,
  onBudgetChange,
  selectedTier,
  onTierChange,
  availableTiers = [1, 2, 3],
  filteredCount,
  totalCount,
  onReset
}: BudgetFilterProps) {
  const { t } = useTranslation();
  const isAtMax = selectedBudget >= maxBudget && selectedTier === 'all';
  const progressPercent = Math.min(
    100,
    Math.max(0, ((selectedBudget - minBudget) / (maxBudget - minBudget)) * 100)
  );

  const tierNames: Record<number, string> = {
    1: t('budgetFilter.tier1'),
    2: t('budgetFilter.tier2'),
    3: t('budgetFilter.tier3')
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    onBudgetChange(val);
  };

  const handleTierClick = (tierId: string) => {
    onTierChange(tierId);
  };

  return (
    <div className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant/30 shadow-xs flex flex-col gap-3">
      {/* Top Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-primary font-label-md text-label-md font-semibold uppercase tracking-wider">
          <span className="material-symbols-outlined text-[18px]">payments</span>
          <span>{t('budgetFilter.title')}</span>
        </div>

        <div className="flex items-center gap-2">
          {filteredCount !== undefined && totalCount !== undefined && (
            <span className="text-[11px] font-label-sm text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded-full">
              {t('budgetFilter.spotsCount').replace('{filteredCount}', String(filteredCount)).replace('{totalCount}', String(totalCount))}
            </span>
          )}
          {!isAtMax && onReset && (
            <button
              onClick={onReset}
              className="text-secondary hover:text-primary font-label-sm text-[11px] font-semibold underline cursor-pointer"
            >
              {t('budgetFilter.reset')}
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Current Budget Display */}
      <div className="flex flex-col items-center justify-center pt-1">
        <span className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider font-medium">
          {t('budgetFilter.maxDailyCeiling')}
        </span>
        <div className="flex items-baseline gap-1 mt-0.5">
          <span className="text-primary font-headline-md text-[22px] font-bold">
            {isAtMax ? t('budgetFilter.allBudgets') : `₹${selectedBudget.toLocaleString('en-IN')}`}
          </span>
          {!isAtMax && (
            <span className="text-on-surface-variant font-label-sm text-label-sm">{t('budgetFilter.perDay')}</span>
          )}
        </div>
      </div>

      {/* Horizontal Range Slider */}
      <div className="flex flex-col gap-1.5 px-1">
        <div className="relative flex items-center py-2">
          <input
            id="budget-range-slider"
            type="range"
            min={minBudget}
            max={maxBudget}
            step={50}
            value={selectedBudget}
            onChange={handleSliderChange}
            aria-label="Adjust daily budget ceiling"
            className="detoura-slider w-full h-2 rounded-lg cursor-pointer appearance-none bg-surface-container-high focus:outline-none"
            style={{
              background: `linear-gradient(to right, #9f3c16 0%, #9f3c16 ${progressPercent}%, #dcd7ce ${progressPercent}%, #dcd7ce 100%)`
            }}
          />
        </div>

        {/* Min and Max Limits */}
        <div className="flex justify-between items-center text-on-surface-variant font-label-sm text-[11px]">
          <span>₹{minBudget.toLocaleString('en-IN')}{t('budgetFilter.perDay')}</span>
          <span>₹{maxBudget.toLocaleString('en-IN')}+{t('budgetFilter.perDay')}</span>
        </div>
      </div>

      {/* Tier Quick Filter Buttons */}
      <div className="pt-2 border-t border-surface-container flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-[11px]">
          <span className="font-medium uppercase tracking-wider">{t('budgetFilter.presetLabel')}</span>
          {selectedTier !== 'all' && (
            <span className="text-secondary font-semibold">{t('budgetFilter.tierActive').replace('{selectedTier}', selectedTier)}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {/* All Tier Button */}
          <button
            id="tier-btn-all"
            type="button"
            onClick={() => handleTierClick('all')}
            className={`shrink-0 px-3 py-1.5 rounded-xl font-label-md text-label-md transition-all active:scale-95 cursor-pointer ${
              selectedTier === 'all'
                ? 'bg-secondary text-on-secondary font-semibold shadow-xs'
                : 'bg-surface-container-lowest border border-outline-variant/50 text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            {t('budgetFilter.allTiers')}
          </button>

          {/* Dynamic Available Tiers from Dataset */}
          {availableTiers.map((tierNum) => {
            const isActive = selectedTier === tierNum.toString();
            const label = tierNames[tierNum] || `Tier ${tierNum}`;

            return (
              <button
                key={tierNum}
                id={`tier-btn-${tierNum}`}
                type="button"
                onClick={() => handleTierClick(tierNum.toString())}
                className={`shrink-0 px-3 py-1.5 rounded-xl font-label-md text-label-md transition-all active:scale-95 cursor-pointer ${
                  isActive
                    ? 'bg-secondary text-on-secondary font-semibold shadow-xs'
                    : 'bg-surface-container-lowest border border-outline-variant/50 text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
