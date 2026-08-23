import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.metrics import accuracy_score
import pickle
import os

class MultiTreatmentTLearner:
    def __init__(self, treatments=[0, 1, 2]):
        self.treatments = treatments
        self.models = {}
        for t in treatments:
            self.models[t] = xgb.XGBClassifier(
                n_estimators=100, 
                max_depth=4, 
                learning_rate=0.05,
                objective='binary:logistic',
                eval_metric='logloss',
                random_state=42
            )
            
    def fit(self, X, T, Y):
        for t in self.treatments:
            # Train model only on data where treatment == t
            idx = (T == t)
            X_t = X[idx]
            Y_t = Y[idx]
            
            print(f"Training Model for Treatment {t} on {len(X_t)} samples...")
            self.models[t].fit(X_t, Y_t)
            
    def predict_expected_incremental_value(self, X, invoice_amount_proxy):
        """
        Returns a DataFrame with the estimated uplift probabilities 
        and expected incremental values for T1 and T2 relative to T0.
        """
        # Predict P(Y=1 | X, T) for all treatments
        p_y_t0 = self.models[0].predict_proba(X)[:, 1]
        p_y_t1 = self.models[1].predict_proba(X)[:, 1]
        p_y_t2 = self.models[2].predict_proba(X)[:, 1]
        
        # Calculate Conversion Uplift
        uplift_t1 = p_y_t1 - p_y_t0
        uplift_t2 = p_y_t2 - p_y_t0
        
        # Calculate Expected Incremental Value (Uplift * Amount)
        eiv_t1 = uplift_t1 * invoice_amount_proxy
        eiv_t2 = uplift_t2 * invoice_amount_proxy
        
        results = pd.DataFrame({
            'P_Control': p_y_t0,
            'P_T1': p_y_t1,
            'P_T2': p_y_t2,
            'Uplift_T1': uplift_t1,
            'Uplift_T2': uplift_t2,
            'EIV_T1': eiv_t1,
            'EIV_T2': eiv_t2
        })
        
        return results

def train_pipeline():
    train_df = pd.read_csv('../../data/processed/hillstrom/train.csv')
    test_df = pd.read_csv('../../data/processed/hillstrom/test.csv')
    
    # Target and Treatment
    T_train, Y_train = train_df['T'], train_df['Y']
    T_test, Y_test = test_df['T'], test_df['Y']
    
    # Features (excluding targets and meta columns)
    exclude_cols = ['T', 'Y', 'visit', 'spend', 'invoice_amount_proxy']
    feature_cols = [c for c in train_df.columns if c not in exclude_cols]
    
    X_train = train_df[feature_cols]
    X_test = test_df[feature_cols]
    
    print(f"Features: {feature_cols}")
    
    # Train
    learner = MultiTreatmentTLearner(treatments=[0, 1, 2])
    learner.fit(X_train, T_train, Y_train)
    
    # Evaluate conceptually on test set
    results = learner.predict_expected_incremental_value(X_test, test_df['invoice_amount_proxy'])
    
    print("\n--- Mean Estimated Expected Incremental Value (EIV) on Test Set ---")
    print(f"Mean EIV for Treatment 1 (Retry): {results['EIV_T1'].mean():.4f}")
    print(f"Mean EIV for Treatment 2 (Link):  {results['EIV_T2'].mean():.4f}")
    
    # Save Model
    os.makedirs('../../artifacts', exist_ok=True)
    model_path = '../../artifacts/t_learner.pkl'
    with open(model_path, 'wb') as f:
        pickle.dump(learner, f)
    
    print(f"\nModel successfully saved to {model_path}")

if __name__ == "__main__":
    train_pipeline()
