# Read the Excel file
import pandas as pd
xl = pd.ExcelFile('data/CN.xlsx')

print('Sheet names found:', xl.sheet_names)
print()

for sheet in xl.sheet_names:
    df = pd.read_excel(xl, sheet_name=sheet)
    print(f'=== {sheet} ===')
    print(f'Columns: {list(df.columns)}')
    print(f'Rows: {len(df)}')
    print(df.head(3))
    print()
