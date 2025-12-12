import numpy as np
from ..utils.constants import MONTHS, MONTH_TO_IDX, IDX_TO_MONTH

class SimulationEngine:
    def __init__(self):
        self.damp_k = 0.5
    
    def get_base_mult(self, weights_dict, colname, month_idx):
        """Get base multiplier from weights"""
        if colname not in weights_dict:
            return 1.0
        v = weights_dict[colname]
        if isinstance(v, (list, tuple, np.ndarray)):
            try:
                return float(v[month_idx - 1])
            except:
                return 1.0
        else:
            try:
                return float(v)
            except:
                return 1.0
    
    def apply_slider_mult(self, base, pct):
        """Apply percentage adjustment to base multiplier"""
        return base * (1.0 + pct / 100.0)
    
    def find_weight_column(self, weights, patterns):
        """Find a weight column matching any of the patterns"""
        for pattern in patterns:
            for col in weights.keys():
                if pattern.lower() in col.lower():
                    return col
        return None
    
    def compute_simulation(
        self,
        baseline_vals,
        weights,
        ms_settings,
        promo_settings,
        shortage_settings,
        regulation_settings,
        custom_settings,
        toggle_settings,
        locked_events,
        damp_k=0.5
    ):
        """
        Main simulation computation - preserves all original logic
        
        Parameters:
        - baseline_vals: list of 12 monthly baseline values
        - weights: dict of weight columns
        - ms_settings: market share settings dict
        - promo_settings: promotion event settings
        - shortage_settings: shortage event settings
        - regulation_settings: regulation event settings
        - custom_settings: custom event settings
        - toggle_settings: effect toggle settings
        - locked_events: dict of locked events by type
        - damp_k: dampening factor
        """
        
        # Start with baseline values
        working_baseline = baseline_vals[:]
        
        # Apply Remove Historical March Madness if enabled
        if toggle_settings.get('march_madness', False):
            working_baseline[2] = working_baseline[2] * 0.6  # March
            working_baseline[5] = working_baseline[5] * 1.2  # June
        
        # Precompute multipliers from toggles
        base_mults = {m: 1.0 for m in MONTHS}
        applied_details = {m: [] for m in MONTHS}
        
        # Trend toggle
        if toggle_settings.get('trend', False):
            trend_col = self.find_weight_column(weights, ['trend'])
            if trend_col:
                for i, m in enumerate(MONTHS, start=1):
                    bm = self.get_base_mult(weights, trend_col, i)
                    base_mults[m] *= bm
                    applied_details[m].append((trend_col, float(bm)))
        
        # Trans Sep-Dec toggle
        if toggle_settings.get('trans', False):
            trans_col = self.find_weight_column(weights, ['trans'])
            if trans_col:
                for i in range(9, 13):  # Sep-Dec
                    mm = IDX_TO_MONTH[i]
                    bm = self.get_base_mult(weights, trans_col, i)
                    base_mults[mm] *= bm
                    applied_details[mm].append((trans_col, float(bm)))
        
        # PF Pos toggle
        if toggle_settings.get('pf_pos', False):
            pf_pos_col = self.find_weight_column(weights, ['pf_pos', 'pfpos'])
            if pf_pos_col:
                for i, m in enumerate(MONTHS, start=1):
                    bm = self.get_base_mult(weights, pf_pos_col, i)
                    base_mults[m] *= bm
                    applied_details[m].append((pf_pos_col, float(bm)))
        
        # PF Neg toggle
        if toggle_settings.get('pf_neg', False):
            pf_neg_col = self.find_weight_column(weights, ['pf_neg', 'pfneg'])
            if pf_neg_col:
                for i, m in enumerate(MONTHS, start=1):
                    bm = self.get_base_mult(weights, pf_neg_col, i)
                    base_mults[m] *= bm
                    applied_details[m].append((pf_neg_col, float(bm)))
        
        # Copy for local modifications
        local_applied = {m: applied_details[m][:] for m in MONTHS}
        local_mults = {m: base_mults[m] for m in MONTHS}
        
        # Apply locked promo events
        for locked_event in locked_events.get('Promo', []):
            month = locked_event['month']
            multiplier = locked_event['multiplier']
            local_mults[month] *= multiplier
            local_applied[month].append(("Locked_Promo", float(multiplier)))
        
        # Current promo event
        promo_month = promo_settings.get('month')
        if promo_month and promo_month != "None":
            i = MONTH_TO_IDX[promo_month]
            promo_pct = promo_settings.get('pct', 0)
            
            # Determine up/down columns based on month
            if i <= 6:
                up_col = self.find_weight_column(weights, ['upromoup'])
                dwn_col = self.find_weight_column(weights, ['upromodwn'])
            else:
                up_col = self.find_weight_column(weights, ['dpromoup'])
                dwn_col = self.find_weight_column(weights, ['dpromodwn'])
            
            if up_col:
                base_w = self.get_base_mult(weights, up_col, i)
                applied_w = self.apply_slider_mult(base_w, promo_pct)
                
                # Cap June promo
                if promo_month == "Jun":
                    applied_w = min(applied_w, 1.06)
                
                local_mults[promo_month] *= applied_w
                local_applied[promo_month].append((up_col, float(applied_w)))
                
                # March reduction (if not locked)
                lock_march = toggle_settings.get('lock_march', False)
                if not lock_march and promo_month != "Mar":
                    march_reduction = 1.0 / applied_w if applied_w > 0 else 1.0
                    local_mults["Mar"] *= march_reduction
                    local_applied["Mar"].append(("Promo_March_Reduction", float(march_reduction)))
            
            # Spillover to next month
            spill_enabled = promo_settings.get('spill_enabled', True)
            spill_pct = promo_settings.get('spill_pct', 10)
            
            if i < 12 and dwn_col and promo_month != "Jun":
                nxt = IDX_TO_MONTH[i + 1]
                base_dn = self.get_base_mult(weights, dwn_col, i + 1)
                applied_dn = base_dn
                
                if spill_enabled and promo_pct > 0 and applied_dn < 1.0:
                    reduction_frac = spill_pct / 100.0
                    promo_scale = min(promo_pct / 25.0, 1.0)
                    reduction_frac = reduction_frac * promo_scale
                    applied_dn = applied_dn + (1.0 - applied_dn) * reduction_frac
                
                local_mults[nxt] *= applied_dn
                local_applied[nxt].append((dwn_col, float(applied_dn)))
        
        # Apply locked shortage events
        for locked_event in locked_events.get('Shortage', []):
            month = locked_event['month']
            multiplier = locked_event['multiplier']
            local_mults[month] *= multiplier
            local_applied[month].append(("Locked_Shortage", float(multiplier)))
        
        # Current shortage event
        shortage_month = shortage_settings.get('month')
        if shortage_month and shortage_month != "None":
            i = MONTH_TO_IDX[shortage_month]
            shortage_pct = shortage_settings.get('pct', 0)
            
            col = self.find_weight_column(weights, ['shortage'])
            if col:
                base_w = self.get_base_mult(weights, col, i)
                applied = self.apply_slider_mult(base_w, shortage_pct)
                applied = min(applied, 1.0)  # Cap at 1.0
                local_mults[shortage_month] *= applied
                local_applied[shortage_month].append((col, float(applied)))
        
        # Apply locked regulation events
        for locked_event in locked_events.get('Regulation', []):
            month = locked_event['month']
            multiplier = locked_event['multiplier']
            local_mults[month] *= multiplier
            local_applied[month].append(("Locked_Regulation", float(multiplier)))
        
        # Current regulation event
        regulation_month = regulation_settings.get('month')
        if regulation_month and regulation_month != "None":
            i = MONTH_TO_IDX[regulation_month]
            regulation_pct = regulation_settings.get('pct', 0)
            
            col = self.find_weight_column(weights, ['regulation', 'epa'])
            if col:
                base_w = self.get_base_mult(weights, col, i)
                applied = self.apply_slider_mult(base_w, regulation_pct)
                applied = min(applied, 1.0)
                local_mults[regulation_month] *= applied
                local_applied[regulation_month].append((col, float(applied)))
        
        # Apply locked custom events
        for locked_event in locked_events.get('Custom', []):
            month = locked_event['month']
            multiplier = locked_event['multiplier']
            local_mults[month] *= multiplier
            local_applied[month].append(("Locked_Custom", float(multiplier)))
        
        # Current custom event
        custom_month = custom_settings.get('month')
        if custom_month and custom_month != "None":
            custom_weight = custom_settings.get('weight', 1.0)
            custom_pct = custom_settings.get('pct', 0)
            applied = self.apply_slider_mult(custom_weight, custom_pct)
            local_mults[custom_month] *= applied
            local_applied[custom_month].append(("Custom", float(applied)))
        
        # Apply dampening
        final_mults = {}
        final_applied = {}
        
        for m in MONTHS:
            factors = [v for (_, v) in local_applied[m]]
            ups = [v for v in factors if v > 1.0]
            others = [v for v in factors if v <= 1.0]
            
            prod_ups = np.prod(ups) if ups else 1.0
            prod_others = np.prod(others) if others else 1.0
            
            if prod_ups > 1.0 and len(ups) > 1:
                damped_up = 1.0 + (prod_ups - 1.0) / (1.0 + damp_k)
            else:
                damped_up = prod_ups
            
            final_mult = float(damped_up * prod_others)
            final_mults[m] = final_mult
            
            readable = [(name, float(val)) for (name, val) in local_applied[m]]
            if damped_up != prod_ups:
                readable.append(("DampenedUp", float(damped_up)))
            final_applied[m] = readable
        
        # Compute final simulated values
        simulated = []
        for i, m in enumerate(MONTHS):
            base_val = working_baseline[i]
            event_mult = final_mults[m]
            ms_adj = ms_settings.get('adjustments', {}).get(m, 1.0)
            sim_val = base_val * event_mult * ms_adj
            simulated.append(sim_val)
        
        return {
            'simulated': simulated,
            'final_multipliers': final_mults,
            'applied_details': final_applied,
            'working_baseline': working_baseline
        }
    
    def calculate_exceeded_months(self, simulated, baseline_vals, sensitivity=1.5):
        """
        Calculate which months exceed threshold for warnings
        Uses Coefficient of Variation approach
        """
        exceeded = []
        
        for i, m in enumerate(MONTHS):
            baseline_val = float(baseline_vals[i])
            sim_val = float(simulated[i])
            
            # Local context: 3-month rolling window
            window_start = max(0, i - 1)
            window_end = min(12, i + 2)
            local_window = baseline_vals[window_start:window_end]
            
            # Local volatility
            local_mean = np.mean(local_window)
            local_std = np.std(local_window)
            local_cv = local_std / local_mean if local_mean > 0 else 0.15
            
            # Product-level volatility
            year_mean = np.mean(baseline_vals)
            year_std = np.std(baseline_vals)
            year_cv = year_std / year_mean if year_mean > 0 else 0.15
            
            # Combined threshold
            combined_cv = max(local_cv, year_cv * 0.5)
            threshold_pct = max(0.08, combined_cv * sensitivity)
            month_threshold = baseline_val * (1 + threshold_pct)
            
            if sim_val > month_threshold:
                exceeded.append({
                    'month': m,
                    'index': i,
                    'simulated': sim_val,
                    'baseline': baseline_val,
                    'threshold': month_threshold
                })
        
        return exceeded


# Singleton instance
simulation_engine = SimulationEngine()