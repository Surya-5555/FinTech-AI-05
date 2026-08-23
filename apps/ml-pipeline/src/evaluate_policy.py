import pandas as pd
import numpy as np
import pickle
from train import MultiTreatmentTLearner

def evaluate_policy_value():
    print("Loading test data and model...")
    import os
    base_dir = os.path.dirname(os.path.abspath(__file__))
    test_df = pd.read_csv(os.path.join(base_dir, '../../../data/processed/hillstrom/test.csv'))
    
    with open(os.path.join(base_dir, '../../../artifacts/t_learner.pkl'), 'rb') as f:
        learner = pickle.load(f)
        
    # The actual outcome we care about is 'spend' in the test set. 
    # However, since this is an RCT with randomized treatment, we can estimate
    # the policy value by taking the mean spend for users who were *actually assigned*
    # the treatment that our policy *recommended*.
    
    X_test = test_df.drop(columns=['T', 'Y', 'visit', 'spend', 'invoice_amount_proxy'])
    actual_t = test_df['T']
    actual_spend = test_df['spend']
    
    # Predict Net EIV for all treatments using our model
    predictions = learner.predict_expected_incremental_value(X_test, test_df['invoice_amount_proxy'])
    
    # Policy definitions
    n_samples = len(test_df)
    
    # 1. Treat None (Control) Policy
    # Value is mean spend of people actually assigned T=0
    spend_t0 = actual_spend[actual_t == 0].mean()
    
    # 2. Treat All T1 Policy
    spend_t1 = actual_spend[actual_t == 1].mean()
    
    # 3. Treat All T2 Policy
    spend_t2 = actual_spend[actual_t == 2].mean()
    
    # 4. Random Policy
    # Assuming equal 1/3 probability of each treatment
    spend_random = (spend_t0 + spend_t1 + spend_t2) / 3
    
    # 5. Learned ML Policy
    # The learned policy recommends a treatment for each user.
    # To evaluate it on the RCT, we filter the dataset to the subset of users where the
    # policy's recommendation matches the treatment they actually received.
    
    # Our policy chooses argmax of Net EIV (or Control if both are < 0)
    # Wait, the predict script only chooses between T1 and T2 currently. Let's incorporate T0.
    # Net_EIV_T0 is always 0.
    
    policy_choices = []
    for i in range(len(predictions)):
        net_eiv_t1 = predictions.iloc[i]['Net_EIV_T1']
        net_eiv_t2 = predictions.iloc[i]['Net_EIV_T2']
        net_eiv_t0 = 0.0
        
        # argmax
        if net_eiv_t1 > net_eiv_t2 and net_eiv_t1 > net_eiv_t0:
            policy_choices.append(1)
        elif net_eiv_t2 > net_eiv_t1 and net_eiv_t2 > net_eiv_t0:
            policy_choices.append(2)
        else:
            policy_choices.append(0)
            
    policy_choices = np.array(policy_choices)
    
    # Calculate Empirical Policy Value
    # This uses Inverse Probability Weighting (IPW) intuitively for an RCT where p(T)=1/3.
    # V(pi) = E[Y | T = pi(X)]
    matches = (actual_t == policy_choices)
    if matches.sum() == 0:
        spend_learned = 0
    else:
        spend_learned = actual_spend[matches].mean()
        
    print("\n=======================================================")
    print("      OFFLINE POLICY VALUE SIMULATION (HILLSTROM)      ")
    print("=======================================================")
    print("This evaluates the Expected Revenue per customer if we ")
    print("deployed different policies on the randomized test set.")
    print("-------------------------------------------------------")
    print(f"Policy: Treat None (Control)  -> Expected Revenue: ${spend_t0:.4f}")
    print(f"Policy: Treat All T1 (Retry)  -> Expected Revenue: ${spend_t1:.4f}")
    print(f"Policy: Treat All T2 (Link)   -> Expected Revenue: ${spend_t2:.4f}")
    print(f"Policy: Random Policy         -> Expected Revenue: ${spend_random:.4f}")
    print(f"Policy: Learned ML Policy     -> Expected Revenue: ${spend_learned:.4f}")
    print("=======================================================\n")
    
    best_baseline = max(spend_t0, spend_t1, spend_t2)
    uplift_over_baseline = spend_learned - best_baseline
    
    if uplift_over_baseline > 0:
        print(f"SUCCESS: The Learned ML Policy creates an incremental revenue")
        print(f"of ${uplift_over_baseline:.4f} per customer over the best baseline.")
    else:
        print(f"WARNING: The Learned ML Policy does not beat the best baseline.")
        
if __name__ == "__main__":
    evaluate_policy_value()
