import pandas as pd
import numpy as np

def audit_dataset():
    df = pd.read_csv('data/raw/hillstrom/hillstrom.csv')
    print("Row count:", len(df))
    print("Column count:", len(df.columns))
    print("Columns:", list(df.columns))
    
    print("\n--- Missing Values ---")
    print(df.isnull().sum())
    
    print("\n--- Unique Values ---")
    print(df.nunique())
    
    print("\n--- Segment Distribution ---")
    print(df['segment'].value_counts())
    
    print("\n--- Conversion Rate by Segment ---")
    print(df.groupby('segment')['conversion'].mean())
    
    print("\n--- Visit Rate by Segment ---")
    print(df.groupby('segment')['visit'].mean())
    
    print("\n--- Spend Statistics by Segment ---")
    print(df.groupby('segment')['spend'].describe())

if __name__ == "__main__":
    audit_dataset()
