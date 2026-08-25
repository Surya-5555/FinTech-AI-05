import pandas as pd
import numpy as np
import os
import json

def generate_synthetic_razorpay_dataset(n_samples=10000):
    np.random.seed(42)
    
    # 1. Generate Razorpay domain features
    amount_minor = np.random.lognormal(mean=7.0, sigma=1.0, size=n_samples) * 100
    days_since_last = np.random.exponential(scale=30, size=n_samples).astype(int)
    
    is_card_error = np.random.binomial(1, 0.4, size=n_samples)
    is_high_value = (amount_minor > 100000).astype(int)
    is_first_attempt = np.random.binomial(1, 0.7, size=n_samples)
    
    amount_segment = np.where(is_high_value == 1, "High", "Low")
    customer_location = np.random.choice(["Urban", "Semi-Urban", "Rural"], size=n_samples, p=[0.6, 0.3, 0.1])
    payment_channel = np.random.choice(["Web", "App", "UPI"], size=n_samples, p=[0.4, 0.4, 0.2])
    
    # 2. Assign Random Treatments (0: Control, 1: Retry, 2: PaymentLink)
    # Simulating a randomized controlled trial
    treatment = np.random.choice([0, 1, 2], size=n_samples)
    
    # 3. Simulate Causal Outcomes (Net Expected Incremental Value)
    # The outcome 'Y' (recovered or not) depends on the treatment and features
    base_prob = 0.05
    
    # Retry (T=1) works well for transient errors, but not hard declines
    uplift_t1 = np.where(is_card_error == 1, -0.02, 0.15) 
    
    # Payment Link (T=2) works well for high value and card errors
    uplift_t2 = np.where(is_card_error == 1, 0.10, 0.05)
    uplift_t2 = np.where(is_high_value == 1, uplift_t2 + 0.10, uplift_t2)
    
    # Calculate final probabilities based on assigned treatment
    prob = np.ones(n_samples) * base_prob
    prob = np.where(treatment == 1, prob + uplift_t1, prob)
    prob = np.where(treatment == 2, prob + uplift_t2, prob)
    prob = np.clip(prob, 0, 1)
    
    outcome = np.random.binomial(1, prob)
    
    # 4. Create DataFrame
    df = pd.DataFrame({
        'daysSinceLastPayment': days_since_last,
        'amountMinor': amount_minor,
        'isCardError': is_card_error,
        'isHighValueMerchant': is_high_value,
        'isFirstAttempt': is_first_attempt,
        'amountSegment': amount_segment,
        'customerLocation': customer_location,
        'paymentChannel': payment_channel,
        'T': treatment,
        'Y': outcome
    })
    
    # Optional metadata columns (as expected by training script)
    df['visit'] = outcome # Proxy
    df['spend'] = outcome * amount_minor
    df['invoice_amount_proxy'] = amount_minor
    
    return df

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    out_dir = os.path.join(base_dir, "../../../data/processed/synthetic_razorpay")
    os.makedirs(out_dir, exist_ok=True)
    
    df = generate_synthetic_razorpay_dataset(10000)
    
    from sklearn.model_selection import train_test_split
    train_df, test_df = train_test_split(df, test_size=0.2, random_state=42, stratify=df[['T', 'Y']])
    
    train_df.to_csv(os.path.join(out_dir, 'train.csv'), index=False)
    test_df.to_csv(os.path.join(out_dir, 'test.csv'), index=False)
    
    # Save the feature columns exactly as they appear in the model
    exclude_cols = ['T', 'Y', 'visit', 'spend', 'invoice_amount_proxy']
    feature_cols = [c for c in train_df.columns if c not in exclude_cols]
    
    with open(os.path.join(out_dir, 'feature_columns.json'), 'w') as f:
        json.dump(feature_cols, f)
        
    print(f"Generated synthetic Razorpay dataset in {out_dir}")
    print(f"Features: {feature_cols}")
