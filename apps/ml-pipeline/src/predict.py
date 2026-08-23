import pandas as pd
import numpy as np
import pickle
import os
import json
from train import MultiTreatmentTLearner

class CausalInferenceService:
    def __init__(self, model_path='../../../artifacts/t_learner.pkl', features_path='../../../data/processed/hillstrom/feature_columns.json'):
        # Load the trained MultiTreatmentTLearner
        import os
        base_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(base_dir, '../../../artifacts/t_learner.pkl')
        features_path = os.path.join(base_dir, '../../../data/processed/hillstrom/feature_columns.json')
        with open(model_path, 'rb') as f:
            self.model = pickle.load(f)
            
        with open(features_path, 'r') as f:
            self.expected_features = json.load(f)
            
    def prepare_features(self, payload: dict):
        """
        Converts a raw JSON payload into the exact DataFrame schema expected by the model.
        """
        # Create a single-row DataFrame
        df = pd.DataFrame([payload])
        
        # We need to one-hot encode based on expected columns
        # First, ensure categorical columns exist
        cat_cols = ['history_segment', 'zip_code', 'channel']
        for col in cat_cols:
            if col not in df.columns:
                df[col] = 'Unknown'
                
        df_features = pd.get_dummies(df, columns=cat_cols)
        
        # Ensure all expected columns are present, fill with 0 if not
        for col in self.expected_features:
            if col not in df_features.columns:
                df_features[col] = 0
                
        # Drop unexpected columns and enforce order
        X = df_features[self.expected_features]
        return X

    def predict(self, payload: dict):
        """
        Payload should contain:
        - recency, history, mens, womens, newbie, history_segment, zip_code, channel
        """
        # The invoice amount is proxy'd by history for our offline validation
        invoice_amount = payload.get('history', 0)
        
        X = self.prepare_features(payload)
        
        # Predict Expected Incremental Value
        results = self.model.predict_expected_incremental_value(X, invoice_amount)
        
        # Extract the single row result
        row = results.iloc[0]
        
        return {
            "control_probability": float(row['P_Control']),
            "treatments": [
                {
                    "treatment": "INTERVENTION_A", # Retry
                    "incremental_probability_uplift": float(row['Uplift_T1']),
                    "expected_incremental_value": float(row['EIV_T1']),
                    "net_expected_incremental_value": float(row['Net_EIV_T1'])
                },
                {
                    "treatment": "INTERVENTION_B", # Payment Link
                    "incremental_probability_uplift": float(row['Uplift_T2']),
                    "expected_incremental_value": float(row['EIV_T2']),
                    "net_expected_incremental_value": float(row['Net_EIV_T2'])
                }
            ],
            "best_treatment": "INTERVENTION_A" if row['Net_EIV_T1'] > row['Net_EIV_T2'] else "INTERVENTION_B"
        }

if __name__ == "__main__":
    service = CausalInferenceService()
    
    sample_payload = {
        "recency": 2,
        "history": 150.0,
        "mens": 1,
        "womens": 0,
        "newbie": 0,
        "history_segment": "2) $100 - $200",
        "zip_code": "Urban",
        "channel": "Web"
    }
    
    print("Testing inference...")
    result = service.predict(sample_payload)
    print(json.dumps(result, indent=2))
