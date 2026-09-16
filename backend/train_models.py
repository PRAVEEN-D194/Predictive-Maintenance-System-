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
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
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
    
    type_mapping = {'L': 0, 'M': 1, 'H': 2}
    df['machine_type'] = df['machine_type'].map(type_mapping)
    
    features = ['machine_type', 'air_temperature', 'process_temperature', 'rotational_speed', 'torque', 'tool_wear']
    target = 'machine_failure'
    
    df_clean = df.dropna(subset=features + [target])
    
    X = df_clean[features]
    y = df_clean[target]
    
    print(f"Dataset shape: {df_clean.shape}")
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
        "Random Forest": RandomForestClassifier(n_estimators=100, random_state=42),
        "Decision Tree": DecisionTreeClassifier(random_state=42),
        "SVM": SVC(probability=True, random_state=42),
        "Logistic Regression": LogisticRegression(max_iter=1000, random_state=42)
    }
    
    metrics = {}
    models_comparison_list = []
    best_model_name = "Random Forest"
    highest_acc = 0.0
    
    for name, model in models.items():
        print(f"Training {name}...")
        model.fit(X_train_scaled, y_train)
        
        y_pred = model.predict(X_test_scaled)
        y_prob = model.predict_proba(X_test_scaled)[:, 1] if hasattr(model, "predict_proba") else y_pred
        
        acc = float(accuracy_score(y_test, y_pred))
        prec = float(precision_score(y_test, y_pred, zero_division=0))
        rec = float(recall_score(y_test, y_pred, zero_division=0))
        f1 = float(f1_score(y_test, y_pred, zero_division=0))
        auc = float(roc_auc_score(y_test, y_prob)) if len(np.unique(y_test)) > 1 else acc
        
        metrics[name] = float(acc)
        if acc > highest_acc:
            highest_acc = acc
            best_model_name = name
            
        models_comparison_list.append({
            "model": name,
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "roc_auc": round(auc, 4),
            "is_highest": False,
            "is_default": name == "Random Forest"
        })
        print(f"{name} -> Accuracy: {acc:.4f}, Precision: {prec:.4f}, Recall: {rec:.4f}, F1: {f1:.4f}")
        
    for item in models_comparison_list:
        if item["model"] == best_model_name:
            item["is_highest"] = True
            
    # Save model comparison metrics
    metrics_path = os.path.join(models_dir, 'model_metrics.json')
    with open(metrics_path, 'w') as f:
        json.dump(metrics, f, indent=4)
    print("Model metrics saved to:", metrics_path)
    
    # Save comprehensive model_comparison.json
    model_comp_path = os.path.join(data_dir, 'model_comparison.json')
    with open(model_comp_path, 'w') as f:
        json.dump({
            "models": models_comparison_list,
            "best_model": best_model_name,
            "highest_accuracy": round(highest_acc * 100, 2)
        }, f, indent=4)
    print("Static model comparison saved to:", model_comp_path)
    
    # 7. Save default model (Random Forest)
    rf_model = models["Random Forest"]
    rf_model_path = os.path.join(models_dir, 'random_forest_model.joblib')
    joblib.dump(rf_model, rf_model_path)
    print("Default Random Forest model saved to:", rf_model_path)
    
    # 8. Generate and Cache Static Dataset Analysis JSON
    type_counts = df_clean['machine_type'].value_counts().to_dict()
    type_dist = [
        {"type": "L", "count": int(type_counts.get(0, 0))},
        {"type": "M", "count": int(type_counts.get(1, 0))},
        {"type": "H", "count": int(type_counts.get(2, 0))}
    ]
    failure_counts = df_clean['machine_failure'].value_counts().to_dict()
    failure_dist = [
        {"name": "Healthy", "value": int(failure_counts.get(0, 0))},
        {"name": "Failed", "value": int(failure_counts.get(1, 0))}
    ]
    air_temp_bins = pd.cut(df_clean['air_temperature'], bins=10)
    air_temp_counts = df_clean['air_temperature'].groupby(air_temp_bins, observed=False).count()
    air_temp_dist = [{"bin": f"{interval.left:.1f}-{interval.right:.1f} K", "count": int(count)} for interval, count in air_temp_counts.items()]
    
    process_temp_bins = pd.cut(df_clean['process_temperature'], bins=10)
    process_temp_counts = df_clean['process_temperature'].groupby(process_temp_bins, observed=False).count()
    process_temp_dist = [{"bin": f"{interval.left:.1f}-{interval.right:.1f} K", "count": int(count)} for interval, count in process_temp_counts.items()]
    
    tool_wear_bins = pd.cut(df_clean['tool_wear'], bins=10)
    tool_wear_counts = df_clean['tool_wear'].groupby(tool_wear_bins, observed=False).count()
    tool_wear_dist = [{"bin": f"{int(interval.left)}-{int(interval.right)} min", "count": int(count)} for interval, count in tool_wear_counts.items()]
    
    scatter_sample = df_clean.sample(n=150, random_state=42)[['rotational_speed', 'torque', 'machine_failure', 'air_temperature']].to_dict(orient='records')
    
    dataset_analysis_path = os.path.join(data_dir, 'dataset_analysis.json')
    with open(dataset_analysis_path, 'w') as f:
        json.dump({
            "stats": {
                "total_rows": len(df_clean),
                "failures": int(df_clean['machine_failure'].sum()),
                "healthy": int(len(df_clean) - df_clean['machine_failure'].sum()),
                "avg_rpm": round(float(df_clean['rotational_speed'].mean()), 2),
                "avg_torque": round(float(df_clean['torque'].mean()), 2),
                "avg_tool_wear": round(float(df_clean['tool_wear'].mean()), 2)
            },
            "type_dist": type_dist,
            "failure_dist": failure_dist,
            "air_temp_dist": air_temp_dist,
            "process_temp_dist": process_temp_dist,
            "tool_wear_dist": tool_wear_dist,
            "rpm_torque_scatter": scatter_sample
        }, f, indent=4)
    print("Static dataset analysis saved to:", dataset_analysis_path)
    print("Model training pipeline and cache generation completed successfully!")

if __name__ == '__main__':
    main()
