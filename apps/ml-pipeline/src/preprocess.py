import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
import os

def load_and_preprocess(filepath: str):
    print("Loading data from:", filepath)
    df = pd.read_csv(filepath)
    
    # Extract features (pre-treatment)
    # We will one-hot encode categorical features: zip_code, channel, history_segment
    # We map Treatment: 'No E-Mail' -> 0, 'Mens E-Mail' -> 1, 'Womens E-Mail' -> 2
    
    treatment_map = {
        'No E-Mail': 0,
        'Mens E-Mail': 1,
        'Womens E-Mail': 2
    }
    df['treatment'] = df['segment'].map(treatment_map)
    
    # We only care about conversion for uplift, but keep others around just in case
    target = df['conversion']
    treatment = df['treatment']
    
    # Features
    feature_cols = ['recency', 'history', 'mens', 'womens', 'newbie']
    cat_cols = ['history_segment', 'zip_code', 'channel']
    
    df_features = pd.get_dummies(df[feature_cols + cat_cols], columns=cat_cols, drop_first=True)
    
    # Optional: ensure boolean dummies are int for XGBoost compatibility
    for col in df_features.columns:
        if df_features[col].dtype == bool:
            df_features[col] = df_features[col].astype(int)
            
    # Also save the pre-treatment history as our "invoice amount" proxy for later calculation
    invoice_amount_proxy = df['history']
    
    # Create the final canonical dataframe
    final_df = df_features.copy()
    final_df['T'] = treatment
    final_df['Y'] = target
    final_df['invoice_amount_proxy'] = invoice_amount_proxy
    final_df['visit'] = df['visit']
    final_df['spend'] = df['spend']
    
    return final_df

def split_and_save(df: pd.DataFrame, out_dir: str):
    os.makedirs(out_dir, exist_ok=True)
    
    # Stratified split to ensure equal treatment/conversion ratios in train/test
    train_df, test_df = train_test_split(
        df, test_size=0.2, random_state=42, 
        stratify=df[['T', 'Y']]
    )
    
    train_path = os.path.join(out_dir, 'train.csv')
    test_path = os.path.join(out_dir, 'test.csv')
    
    train_df.to_csv(train_path, index=False)
    test_df.to_csv(test_path, index=False)
    
    # Save the feature columns exactly as they appear in the model
    exclude_cols = ['T', 'Y', 'visit', 'spend', 'invoice_amount_proxy']
    feature_cols = [c for c in train_df.columns if c not in exclude_cols]
    
    import json
    with open(os.path.join(out_dir, 'feature_columns.json'), 'w') as f:
        json.dump(feature_cols, f)
    
    print(f"Saved {len(train_df)} train rows to {train_path}")
    print(f"Saved {len(test_df)} test rows to {test_path}")

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    raw_path = os.path.join(base_dir, "../../../data/raw/hillstrom/hillstrom.csv")
    out_dir = os.path.join(base_dir, "../../../data/processed/hillstrom")
    
    df = load_and_preprocess(raw_path)
    split_and_save(df, out_dir)
