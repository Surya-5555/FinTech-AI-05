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
        # Convert X to numpy array to bypass feature name validation if names were updated
        import numpy as np
        X_arr = np.array(X) if isinstance(X, pd.DataFrame) else X
        
        # Predict P(Y=1 | X, T) for all treatments
        p_y_t0 = self.models[0].predict_proba(X_arr)[:, 1]
        p_y_t1 = self.models[1].predict_proba(X_arr)[:, 1]
        p_y_t2 = self.models[2].predict_proba(X_arr)[:, 1]
        
        # Calculate Conversion Uplift
        uplift_t1 = p_y_t1 - p_y_t0
        uplift_t2 = p_y_t2 - p_y_t0
        
        # Calculate Expected Incremental Value (Gross Uplift * Amount)
        eiv_t1 = uplift_t1 * invoice_amount_proxy
        eiv_t2 = uplift_t2 * invoice_amount_proxy
        
        # Define Intervention Costs (ASSUMED / DEMO values — not from authoritative Razorpay pricing)
        cost_t0 = 0.0
        cost_t1 = 0.10  # Assumed retry API cost
        cost_t2 = 2.00  # Assumed SMS payment link cost
        
        # Calculate Net Expected Incremental Value
        net_eiv_t1 = eiv_t1 - cost_t1
        net_eiv_t2 = eiv_t2 - cost_t2
        
        results = pd.DataFrame({
            'P_Control': p_y_t0,
            'P_T1': p_y_t1,
            'P_T2': p_y_t2,
            'Uplift_T1': uplift_t1,
            'Uplift_T2': uplift_t2,
            'EIV_T1': eiv_t1,
            'EIV_T2': eiv_t2,
            'Net_EIV_T1': net_eiv_t1,
            'Net_EIV_T2': net_eiv_t2
        })
        
        return results

def train_pipeline():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    train_df = pd.read_csv(os.path.join(base_dir, '../../../data/processed/synthetic_razorpay/train.csv'))
    test_df = pd.read_csv(os.path.join(base_dir, '../../../data/processed/synthetic_razorpay/test.csv'))
    
    # Target and Treatment
    T_train, Y_train = train_df['T'], train_df['Y']
    T_test, Y_test = test_df['T'], test_df['Y']
    
    # Features (excluding targets and meta columns)
    exclude_cols = ['T', 'Y', 'visit', 'spend', 'invoice_amount_proxy']
    feature_cols = [c for c in train_df.columns if c not in exclude_cols]
    
    # Handle categorical variables via one-hot encoding
    cat_cols = ['amountSegment', 'customerLocation', 'paymentChannel']
    X_train_raw = train_df[feature_cols]
    X_test_raw = test_df[feature_cols]
    
    X_train = pd.get_dummies(X_train_raw, columns=cat_cols, drop_first=True)
    X_test = pd.get_dummies(X_test_raw, columns=cat_cols, drop_first=True)
    
    # Ensure all boolean dummies are int
    for col in X_train.columns:
        if X_train[col].dtype == bool:
            X_train[col] = X_train[col].astype(int)
    for col in X_test.columns:
        if X_test[col].dtype == bool:
            X_test[col] = X_test[col].astype(int)
            
    # Align test set columns to train set columns in case some categories are missing
    X_test = X_test.reindex(columns=X_train.columns, fill_value=0)
    
    print(f"Features after encoding: {X_train.columns.tolist()}")
    
    # Train
    learner = MultiTreatmentTLearner(treatments=[0, 1, 2])
    learner.fit(X_train, T_train, Y_train)
    
    # Per-arm accuracy & AUROC on test set
    from sklearn.metrics import roc_auc_score
    treatment_labels = {0: 'Control', 1: 'Retry', 2: 'Payment Link'}
    print("\n--- Per-Arm Model Accuracy (Test Set) ---")
    for t in [0, 1, 2]:
        idx = (T_test == t)
        X_t = X_test[idx]
        Y_t = Y_test[idx]
        preds = learner.models[t].predict(X_t)
        probs = learner.models[t].predict_proba(X_t)[:, 1]
        acc = accuracy_score(Y_t, preds)
        try:
            auc = roc_auc_score(Y_t, probs)
        except ValueError:
            auc = float('nan')
        print(f"  Model T{t} ({treatment_labels[t]}): Accuracy = {acc*100:.2f}%  |  AUROC = {auc:.4f}  |  Samples = {len(Y_t)}")
    
    # Evaluate conceptually on test set
    results = learner.predict_expected_incremental_value(X_test, test_df['invoice_amount_proxy'])
    
    print("\n--- Mean Estimated Expected Incremental Value (EIV) on Test Set ---")
    print(f"Mean Gross EIV for Treatment 1 (Retry): {results['EIV_T1'].mean():.4f}")
    print(f"Mean Gross EIV for Treatment 2 (Link):  {results['EIV_T2'].mean():.4f}")
    
    print("\n--- Mean Net Expected Incremental Value (Net EIV) on Test Set ---")
    print(f"Mean Net EIV for Treatment 1 (Retry): {results['Net_EIV_T1'].mean():.4f}")
    print(f"Mean Net EIV for Treatment 2 (Link):  {results['Net_EIV_T2'].mean():.4f}")
    
    # Save Model
    artifacts_dir = os.path.join(base_dir, '../../../artifacts')
    os.makedirs(artifacts_dir, exist_ok=True)
    model_path = os.path.join(artifacts_dir, 't_learner.pkl')
    with open(model_path, 'wb') as f:
        pickle.dump(learner, f)
    
    # Also save the exact features the model expects after encoding
    import json
    with open(os.path.join(artifacts_dir, 'model_features.json'), 'w') as f:
        json.dump(X_train.columns.tolist(), f)
    
    print(f"\nModel successfully saved to {model_path}")

if __name__ == "__main__":
    train_pipeline()
