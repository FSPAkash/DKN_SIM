import pandas as pd
import numpy as np
import os
from datetime import datetime
from ..utils.constants import (
    PRODUCT_APS_MAPPING, MONTHS, EXCEL_SHEETS, WEIGHT_COLUMNS
)
from ..config import Config


class ExcelHandler:
    def __init__(self):
        self.data_dir = Config.DATA_DIR
        print(f"[DEBUG] ExcelHandler initialized with data_dir: {self.data_dir}")
    
    def get_product_filename(self, product, file_type, aps_class=None):
        """Generate product-specific or APS-specific filename"""
        if aps_class:
            filename = f"{product}_{aps_class.replace(' ', '_')}_{file_type}.csv"
        else:
            filename = f"{product}_{file_type}.csv"
        
        full_path = os.path.join(self.data_dir, filename)
        print(f"[DEBUG] get_product_filename: {full_path}, exists: {os.path.exists(full_path)}")
        
        return full_path
    
    def parse_unified_excel(self, file_path, product_code, aps_class=None):
        """
        Parse a unified Excel file with multiple sheets.
        """
        result = {
            'success': False,
            'files_created': [],
            'errors': [],
            'warnings': []
        }
        
        try:
            print(f"[DEBUG] Parsing Excel file: {file_path}")
            print(f"[DEBUG] Product: {product_code}, APS Class: {aps_class}")
            
            xl = pd.ExcelFile(file_path)
            available_sheets = xl.sheet_names
            print(f"[DEBUG] Available sheets: {available_sheets}")
            
            # Process Baseline (required)
            if EXCEL_SHEETS['baseline'] in available_sheets:
                df = pd.read_excel(xl, sheet_name=EXCEL_SHEETS['baseline'])
                print(f"[DEBUG] Baseline sheet columns: {df.columns.tolist()}")
                print(f"[DEBUG] Baseline sheet shape: {df.shape}")
                print(f"[DEBUG] Baseline sheet head:\n{df.head()}")
                
                baseline_path = self.get_product_filename(
                    product_code, 'post_processed', aps_class
                )
                self._save_yearly_data(df, baseline_path)
                result['files_created'].append(f"Baseline: {os.path.basename(baseline_path)}")
            else:
                result['errors'].append(f"Baseline sheet '{EXCEL_SHEETS['baseline']}' is required. Available sheets: {available_sheets}")
                return result
            
            # Process Actuals (optional)
            if EXCEL_SHEETS['actuals'] in available_sheets:
                df = pd.read_excel(xl, sheet_name=EXCEL_SHEETS['actuals'])
                print(f"[DEBUG] Actuals sheet columns: {df.columns.tolist()}")
                actuals_path = self.get_product_filename(
                    product_code, 'actual', aps_class
                )
                self._save_yearly_data(df, actuals_path)
                result['files_created'].append(f"Actuals: {os.path.basename(actuals_path)}")
            else:
                result['warnings'].append(f"Actuals sheet not found")
            
            # Process Delivered (optional)
            if EXCEL_SHEETS['delivered'] in available_sheets:
                df = pd.read_excel(xl, sheet_name=EXCEL_SHEETS['delivered'])
                print(f"[DEBUG] Delivered sheet columns: {df.columns.tolist()}")
                delivered_path = self.get_product_filename(
                    product_code, 'Delivered', aps_class
                )
                self._save_yearly_data(df, delivered_path)
                result['files_created'].append(f"Delivered: {os.path.basename(delivered_path)}")
            else:
                result['warnings'].append(f"Delivered sheet not found")
            
            # Process Weights (product-level only, not APS-specific)
            if EXCEL_SHEETS['weights'] in available_sheets and aps_class is None:
                df = pd.read_excel(xl, sheet_name=EXCEL_SHEETS['weights'])
                print(f"[DEBUG] Weights sheet columns: {df.columns.tolist()}")
                weights_path = self.get_product_filename(product_code, 'weights', None)
                self._save_weights(df, weights_path)
                result['files_created'].append(f"Weights: {os.path.basename(weights_path)}")
            
            # Process Market Share (product-level only)
            if EXCEL_SHEETS['market_share'] in available_sheets and aps_class is None:
                df = pd.read_excel(xl, sheet_name=EXCEL_SHEETS['market_share'])
                print(f"[DEBUG] MarketShare sheet columns: {df.columns.tolist()}")
                ms_path = self.get_product_filename(product_code, 'market_share', None)
                self._save_yearly_data(df, ms_path)
                result['files_created'].append(f"Market Share: {os.path.basename(ms_path)}")
            
            result['success'] = True
            print(f"[DEBUG] Parse result: {result}")
            
        except Exception as e:
            print(f"[ERROR] Parse error: {str(e)}")
            import traceback
            traceback.print_exc()
            result['errors'].append(str(e))
        
        return result
    
    def _save_yearly_data(self, df, path):
        """Save yearly data to CSV in standard format"""
        print(f"[DEBUG] Saving yearly data to: {path}")
        print(f"[DEBUG] Input columns: {df.columns.tolist()}")
        
        # Ensure proper column names
        expected_cols = ['Year'] + MONTHS
        
        # Try to normalize column names - strip whitespace
        df.columns = df.columns.str.strip()
        
        # Handle Year column
        if 'Year' not in df.columns:
            if 'year' in df.columns:
                df = df.rename(columns={'year': 'Year'})
            elif 'YEAR' in df.columns:
                df = df.rename(columns={'YEAR': 'Year'})
        
        # Ensure all month columns exist with proper casing
        for col in MONTHS:
            if col not in df.columns:
                # Try case-insensitive match
                for existing_col in df.columns:
                    if existing_col.lower() == col.lower():
                        df = df.rename(columns={existing_col: col})
                        break
        
        # Convert Year to integer
        if 'Year' in df.columns:
            df['Year'] = df['Year'].astype(int)
        
        # Convert month columns to float, replacing NaN with 0
        for col in MONTHS:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0.0)
        
        print(f"[DEBUG] Output columns: {df.columns.tolist()}")
        print(f"[DEBUG] Output data:\n{df}")
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(path), exist_ok=True) if os.path.dirname(path) else None
        
        df.to_csv(path, index=False)
        print(f"[DEBUG] Saved to {path}, file exists: {os.path.exists(path)}")
    
    def _save_weights(self, df, path):
        """Save weights data to CSV"""
        print(f"[DEBUG] Saving weights to: {path}")
        df.to_csv(path, index=False)
    
    def read_yearly_data(self, path, expected_months=12):
        """Read CSV with Year column and monthly data"""
        print(f"[DEBUG] read_yearly_data called with path: {path}")
        
        try:
            if not path or not os.path.exists(path):
                print(f"[DEBUG] Path does not exist: {path}")
                return {}
            
            df = pd.read_csv(path)
            print(f"[DEBUG] Read CSV successfully")
            print(f"[DEBUG] Columns: {df.columns.tolist()}")
            print(f"[DEBUG] Shape: {df.shape}")
            print(f"[DEBUG] Dtypes:\n{df.dtypes}")
            print(f"[DEBUG] Head:\n{df.head()}")
            
            # Check if it's old format (no Year column)
            if 'Year' not in df.columns and 'year' not in df.columns:
                print(f"[DEBUG] No Year column found, checking for old format")
                df_old = pd.read_csv(path, header=None)
                if df_old.shape[0] == 1 and df_old.shape[1] >= expected_months:
                    current_year = datetime.now().year
                    values = df_old.iloc[0, :expected_months].astype(float).tolist()
                    print(f"[DEBUG] Old format detected, using year {current_year}")
                    return {current_year: values}
                print(f"[DEBUG] Not old format, returning empty")
                return {}
            
            # Process year-based format
            year_col = 'Year' if 'Year' in df.columns else 'year'
            df[year_col] = df[year_col].astype(int)
            
            yearly_data = {}
            month_cols = MONTHS[:expected_months]
            
            print(f"[DEBUG] Looking for month columns: {month_cols}")
            
            # Check which month columns exist
            existing_month_cols = [col for col in month_cols if col in df.columns]
            print(f"[DEBUG] Existing month columns: {existing_month_cols}")
            
            for _, row in df.iterrows():
                year = int(row[year_col])
                values = []
                
                if len(existing_month_cols) == expected_months:
                    # All month columns exist
                    for col in month_cols:
                        val = row[col]
                        if pd.isna(val):
                            values.append(0.0)
                        else:
                            values.append(float(val))
                elif len(existing_month_cols) > 0:
                    # Some month columns exist
                    for col in month_cols:
                        if col in df.columns:
                            val = row[col]
                            if pd.isna(val):
                                values.append(0.0)
                            else:
                                values.append(float(val))
                        else:
                            values.append(0.0)
                else:
                    # No month columns, try numeric columns
                    numeric_cols = [col for col in df.columns if col != year_col]
                    print(f"[DEBUG] Using fallback numeric columns: {numeric_cols}")
                    for i in range(min(expected_months, len(numeric_cols))):
                        val = row[numeric_cols[i]]
                        if pd.isna(val):
                            values.append(0.0)
                        else:
                            values.append(float(val))
                
                # Pad with zeros if needed
                while len(values) < expected_months:
                    values.append(0.0)
                
                yearly_data[year] = values[:expected_months]
                print(f"[DEBUG] Year {year}: {values[:3]}... (first 3 values)")
            
            print(f"[DEBUG] Final yearly_data keys: {list(yearly_data.keys())}")
            return yearly_data
            
        except Exception as e:
            print(f"[ERROR] Error reading {path}: {str(e)}")
            import traceback
            traceback.print_exc()
            return {}
    
    def read_weights(self, path):
        """Read weights file"""
        print(f"[DEBUG] read_weights called with path: {path}")
        
        try:
            if not path or not os.path.exists(path):
                print(f"[DEBUG] Weights path does not exist: {path}")
                return None
            
            wf = pd.read_csv(path)
            print(f"[DEBUG] Weights columns: {wf.columns.tolist()}")
            print(f"[DEBUG] Weights shape: {wf.shape}")
            
            weights_dict = {}
            
            for col in wf.columns:
                col_data = wf[col].dropna().tolist()
                numeric = []
                for x in col_data:
                    try:
                        numeric.append(float(x))
                    except Exception:
                        pass
                
                if len(numeric) >= 12:
                    weights_dict[col] = numeric[:12]
                elif len(numeric) == 1:
                    weights_dict[col] = float(numeric[0])
                elif len(numeric) == 0:
                    weights_dict[col] = 1.0
                else:
                    arr = numeric[:]
                    while len(arr) < 12:
                        arr.append(arr[-1] if arr else 1.0)
                    weights_dict[col] = arr
            
            print(f"[DEBUG] Weights dict keys: {list(weights_dict.keys())}")
            return weights_dict
            
        except Exception as e:
            print(f"[ERROR] Error reading weights {path}: {str(e)}")
            import traceback
            traceback.print_exc()
            return None
    
    def discover_products_and_aps(self):
        """Scan data directory for available products and APS classes"""
        print(f"[DEBUG] discover_products_and_aps called")
        print(f"[DEBUG] Data dir: {self.data_dir}")
        
        products = set()
        aps_classes = {}
        
        if not os.path.exists(self.data_dir):
            print(f"[DEBUG] Data directory does not exist: {self.data_dir}")
            return [], {}
        
        all_files = os.listdir(self.data_dir)
        print(f"[DEBUG] All files in data dir: {all_files}")
        
        # Find all weights files (product-level only)
        for filename in all_files:
            if filename.endswith('_weights.csv'):
                parts = filename.replace('_weights.csv', '').split('_')
                if len(parts) == 1:
                    product = parts[0]
                    if product in PRODUCT_APS_MAPPING:
                        products.add(product)
                        print(f"[DEBUG] Found product from weights: {product}")
        
        # Also check for post_processed files
        for filename in all_files:
            if filename.endswith('_post_processed.csv'):
                parts = filename.replace('_post_processed.csv', '').split('_')
                if len(parts) == 1:
                    product = parts[0]
                    if product in PRODUCT_APS_MAPPING:
                        products.add(product)
                        print(f"[DEBUG] Found product from post_processed: {product}")
        
        # Find APS-level data files
        for product in products:
            aps_classes[product] = []
            if product in PRODUCT_APS_MAPPING:
                for aps in PRODUCT_APS_MAPPING[product]:
                    aps_filename = aps.replace(' ', '_')
                    # Check if any APS-level file exists
                    for filename in all_files:
                        if filename.startswith(f"{product}_{aps_filename}_"):
                            aps_classes[product].append(aps)
                            print(f"[DEBUG] Found APS class: {product} -> {aps}")
                            break
        
        print(f"[DEBUG] Final products: {sorted(list(products))}")
        print(f"[DEBUG] Final aps_classes: {aps_classes}")
        
        return sorted(list(products)), aps_classes
    
    def generate_template_excel(self, product_code, include_aps=False):
        """Generate a template Excel file for data upload"""
        template_path = os.path.join(self.data_dir, f"{product_code}_template.xlsx")
        
        print(f"[DEBUG] Generating template at: {template_path}")
        
        # Ensure directory exists
        os.makedirs(self.data_dir, exist_ok=True)
        
        output = pd.ExcelWriter(template_path, engine='openpyxl')
        
        # Baseline template
        baseline_df = pd.DataFrame({
            'Year': [2024, 2025],
            **{month: [0.0, 0.0] for month in MONTHS}
        })
        baseline_df.to_excel(output, sheet_name=EXCEL_SHEETS['baseline'], index=False)
        
        # Actuals template
        actuals_df = pd.DataFrame({
            'Year': [2024],
            **{month: [0.0] for month in MONTHS}
        })
        actuals_df.to_excel(output, sheet_name=EXCEL_SHEETS['actuals'], index=False)
        
        # Delivered template
        delivered_df = pd.DataFrame({
            'Year': [2025],
            **{month: [0.0] for month in MONTHS}
        })
        delivered_df.to_excel(output, sheet_name=EXCEL_SHEETS['delivered'], index=False)
        
        # Weights template (12 rows for months)
        weights_data = {col: [1.0] * 12 for col in WEIGHT_COLUMNS}
        weights_df = pd.DataFrame(weights_data)
        weights_df.to_excel(output, sheet_name=EXCEL_SHEETS['weights'], index=False)
        
        # Market Share template
        ms_df = pd.DataFrame({
            'Year': [2023, 2024],
            **{month: [25.0, 25.0] for month in MONTHS}
        })
        ms_df.to_excel(output, sheet_name=EXCEL_SHEETS['market_share'], index=False)
        
        # Metadata template
        if include_aps and product_code in PRODUCT_APS_MAPPING:
            aps_list = PRODUCT_APS_MAPPING[product_code]
        else:
            aps_list = []
        
        metadata_df = pd.DataFrame({
            'Property': ['Product', 'APS Classes', 'Created'],
            'Value': [product_code, ', '.join(aps_list), datetime.now().isoformat()]
        })
        metadata_df.to_excel(output, sheet_name=EXCEL_SHEETS['metadata'], index=False)
        
        output.close()
        
        print(f"[DEBUG] Template created at: {template_path}")
        return template_path


# Singleton instance
excel_handler = ExcelHandler()