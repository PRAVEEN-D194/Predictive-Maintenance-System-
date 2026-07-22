import os
import urllib.request
import json
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
import joblib

def main():
    # 1. Paths configuration
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(base_dir, 'data')
    models_dir = os.path.join(base_dir, 'models')
    
    os.makedirs(data_dir, exist_ok=True)
    os.makedirs(models_dir, exist_ok=True)
    
    csv_path = os.path.join(data_dir, 'ai4i2020.csv')
    
    # 2. Download Dataset if not exists
    if not os.path.exists(csv_path):
        print("Dataset not found locally. Downloading AI4I 2020 Predictive Maintenance Dataset...")
        url = "https://archive.ics.uci.edu/ml/machine-learning-databases/00601/ai4i2020.csv"
        try:
            urllib.request.urlretrieve(url, csv_path)
            print("Dataset downloaded successfully and saved to:", csv_path)
        except Exception as e:
            print(f"Error downloading dataset: {e}")
            return
    else:
        print("Dataset already exists at:", csv_path)

    # 3. Load and Preprocess Dataset
    print("Loading dataset...")
    df = pd.read_csv(csv_path)
    
    # The dataset has the following columns:
    # UDI, Product ID, Type, Air temperature [K], Process temperature [K], Rotational speed [rpm], Torque [Nm], Tool wear [min], Machine failure
    # and individual failure modes: TWF, HDF, PWF, OSF, RNF.
    
    # Rename columns for ease of use in pandas/code
    column_mapping = {
        'Type': 'machine_type',
        'Air temperature [K]': 'air_temperature',
        'Process temperature [K]': 'process_temperature',
        'Rotational speed [rpm]': 'rotational_speed',
        'Torque [Nm]': 'torque',
        'Tool wear [min]': 'tool_wear',
        'Machine failure': 'machine_failure'
    }
    
    df = df.rename(columns=column_mapping)
    
    # Map Type (L, M, H) to numeric values
    # L: Low (0), M: Medium (1), H: High (2)
    type_mapping = {'L': 0, 'M': 1, 'H': 2}
    df['machine_type'] = df['machine_type'].map(type_mapping)
    
    # Define features and target
    features = ['machine_type', 'air_temperature', 'process_temperature', 'rotational_speed', 'torque', 'tool_wear']
    target = 'machine_failure'
    
    # Clean any possible missing data
    df = df.dropna(subset=features + [target])
    
    X = df[features]
    y = df[target]
    
    print(f"Dataset shape: {df.shape}")
    print(f"Features: {features}")
    print(f"Target distribution: {y.value_counts(normalize=True).to_dict()}")
    
    # 4. Split train/test
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # 5. Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Save the scaler
    scaler_path = os.path.join(models_dir, 'scaler.joblib')
    joblib.dump(scaler, scaler_path)
    print("Scaler saved to:", scaler_path)
    
    # 6. Train Models
    models = {
        "Logistic Regression": LogisticRegression(max_iter=1000, random_state=42),
        "Decision Tree": DecisionTreeClassifier(random_state=42),
        "Random Forest": RandomForestClassifier(n_estimators=100, random_state=42),
        "SVM": SVC(probability=True, random_state=42)
    }
    
    metrics = {}
    
    for name, model in models.items():
        print(f"Training {name}...")
        model.fit(X_train_scaled, y_train)
        
        # Evaluate accuracy
        accuracy = model.score(X_test_scaled, y_test)
        metrics[name] = float(accuracy)
        print(f"{name} Accuracy: {accuracy:.4f}")
        
    # Save model comparison metrics
    metrics_path = os.path.join(models_dir, 'model_metrics.json')
    with open(metrics_path, 'w') as f:
        json.dump(metrics, f, indent=4)
    print("Model metrics saved to:", metrics_path)
    
    # 7. Save default model (Random Forest)
    rf_model = models["Random Forest"]
    rf_model_path = os.path.join(models_dir, 'random_forest_model.joblib')
    joblib.dump(rf_model, rf_model_path)
    print("Default Random Forest model saved to:", rf_model_path)
    print("Model training pipeline completed successfully!")

if __name__ == '__main__':
    main()
