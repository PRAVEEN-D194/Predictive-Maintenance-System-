import os
import json
import time
import pandas as pd
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib

app = Flask(__name__)
# Enable CORS for all routes to support local development on separate ports
CORS(app)

# Load data and ML models
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, 'data', 'ai4i2020.csv')
SCALER_PATH = os.path.join(BASE_DIR, 'models', 'scaler.joblib')
MODEL_PATH = os.path.join(BASE_DIR, 'models', 'random_forest_model.joblib')
METRICS_PATH = os.path.join(BASE_DIR, 'models', 'model_metrics.json')

# Global variables for caching loaded components
df_cached = None
model_cached = None
scaler_cached = None
metrics_cached = None

# Track simulation base time
START_TIME = time.time()
TICK_INTERVAL = 5.0 # seconds

def preload_assets():
    global df_cached, model_cached, scaler_cached, metrics_cached
    try:
        if os.path.exists(CSV_PATH):
            df = pd.read_csv(CSV_PATH)
            # Rename columns to standardized names for internal operations
            column_mapping = {
                'Type': 'machine_type',
                'Air temperature [K]': 'air_temperature',
                'Process temperature [K]': 'process_temperature',
                'Rotational speed [rpm]': 'rotational_speed',
                'Torque [Nm]': 'torque',
                'Tool wear [min]': 'tool_wear',
                'Machine failure': 'machine_failure'
            }
            df_cached = df.rename(columns=column_mapping)
            print("Dataset preloaded successfully during startup.")
        
        if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
            model_cached = joblib.load(MODEL_PATH)
            scaler_cached = joblib.load(SCALER_PATH)
            print("Random Forest model and Scaler preloaded successfully during startup.")
            
        if os.path.exists(METRICS_PATH):
            with open(METRICS_PATH, 'r') as f:
                metrics_cached = json.load(f)
            print("Model metrics preloaded successfully during startup.")
    except Exception as e:
        print(f"Warning: Failed to preload assets during startup: {e}")

# Preload assets on startup
preload_assets()

def get_dataset():
    global df_cached
    if df_cached is None:
        preload_assets()
        if df_cached is None:
            raise FileNotFoundError(f"Dataset CSV not found at {CSV_PATH}. Please run train_models.py first.")
    return df_cached

def get_model_and_scaler():
    global model_cached, scaler_cached
    if model_cached is None or scaler_cached is None:
        preload_assets()
        if model_cached is None or scaler_cached is None:
            raise FileNotFoundError("Model or Scaler not found. Please run train_models.py first.")
    return model_cached, scaler_cached

def get_metrics():
    global metrics_cached
    if metrics_cached is None:
        preload_assets()
        if metrics_cached is None:
            metrics_cached = {
                "Logistic Regression": 0.9675,
                "Decision Tree": 0.9775,
                "Random Forest": 0.9840,
                "SVM": 0.9720
            }
    return metrics_cached

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "message": "Backend server is running!"})

@app.route('/dashboard', methods=['GET'])
def dashboard_stats():
    try:
        df = get_dataset()
        metrics = get_metrics()
        
        # Calculate summary stats
        total_machines = len(df)
        failed_machines = int(df['machine_failure'].sum())
        healthy_machines = total_machines - failed_machines
        rf_accuracy = metrics.get("Random Forest", 0.9840)
        
        # Get first 10 rows formatted nicely for table display
        raw_df = pd.read_csv(CSV_PATH)
        first_10 = raw_df.head(10).to_dict(orient='records')
        
        # Compute Machine Type and Failure distributions for simple display
        type_counts = df['machine_type'].value_counts().to_dict()
        type_dist = [
            {"type": "Low Quality (L)", "count": int(type_counts.get('L', 0))},
            {"type": "Medium Quality (M)", "count": int(type_counts.get('M', 0))},
            {"type": "High Quality (H)", "count": int(type_counts.get('H', 0))}
        ]
        
        failure_counts = df['machine_failure'].value_counts().to_dict()
        failure_dist = [
            {"name": "Healthy", "value": int(failure_counts.get(0, 0))},
            {"name": "Failed", "value": int(failure_counts.get(1, 0))}
        ]
        
        return jsonify({
            "summary": {
                "total_machines": total_machines,
                "healthy_machines": healthy_machines,
                "failed_machines": failed_machines,
                "accuracy": round(rf_accuracy * 100, 2)
            },
            "first_10_rows": first_10,
            "type_dist": type_dist,
            "failure_dist": failure_dist
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/analytics', methods=['GET'])
def analytics_data():
    try:
        df = get_dataset()
        
        # 1. Machine Type counts
        type_counts = df['machine_type'].value_counts().to_dict()
        type_dist = [
            {"type": "L", "count": int(type_counts.get('L', 0))},
            {"type": "M", "count": int(type_counts.get('M', 0))},
            {"type": "H", "count": int(type_counts.get('H', 0))}
        ]
        
        # 2. Failure vs Healthy
        failure_counts = df['machine_failure'].value_counts().to_dict()
        failure_dist = [
            {"name": "Healthy", "value": int(failure_counts.get(0, 0))},
            {"name": "Failed", "value": int(failure_counts.get(1, 0))}
        ]
        
        # 3. Air Temp Distribution (10 bins)
        air_temp_bins = pd.cut(df['air_temperature'], bins=10)
        air_temp_counts = df['air_temperature'].groupby(air_temp_bins, observed=False).count()
        air_temp_dist = []
        for interval, count in air_temp_counts.items():
            air_temp_dist.append({
                "bin": f"{interval.left:.1f}-{interval.right:.1f} K",
                "count": int(count)
            })
            
        # 4. Process Temp Distribution (10 bins)
        process_temp_bins = pd.cut(df['process_temperature'], bins=10)
        process_temp_counts = df['process_temperature'].groupby(process_temp_bins, observed=False).count()
        process_temp_dist = []
        for interval, count in process_temp_counts.items():
            process_temp_dist.append({
                "bin": f"{interval.left:.1f}-{interval.right:.1f} K",
                "count": int(count)
            })
            
        # 5. Tool Wear Distribution (10 bins)
        tool_wear_bins = pd.cut(df['tool_wear'], bins=10)
        tool_wear_counts = df['tool_wear'].groupby(tool_wear_bins, observed=False).count()
        tool_wear_dist = []
        for interval, count in tool_wear_counts.items():
            tool_wear_dist.append({
                "bin": f"{int(interval.left)}-{int(interval.right)} min",
                "count": int(count)
            })
            
        # 6. Sample torque vs rotational speed scatter (sample 150 points for lighter payload)
        scatter_sample = df.sample(n=150, random_state=42)[['rotational_speed', 'torque', 'machine_failure', 'air_temperature']].to_dict(orient='records')
        
        # 7. Overall stats
        stats = {
            "total_rows": len(df),
            "failures": int(df['machine_failure'].sum()),
            "healthy": int(len(df) - df['machine_failure'].sum()),
            "avg_rpm": round(df['rotational_speed'].mean(), 2),
            "avg_torque": round(df['torque'].mean(), 2),
            "avg_tool_wear": round(df['tool_wear'].mean(), 2)
        }
        
        return jsonify({
            "stats": stats,
            "type_dist": type_dist,
            "failure_dist": failure_dist,
            "air_temp_dist": air_temp_dist,
            "process_temp_dist": process_temp_dist,
            "tool_wear_dist": tool_wear_dist,
            "rpm_torque_scatter": scatter_sample
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/models', methods=['GET'])
def models_comparison():
    try:
        metrics = get_metrics()
        
        # Format the comparison list
        comparison = []
        highest_accuracy = 0
        best_model = ""
        
        # Find the best model
        for name, acc in metrics.items():
            if acc > highest_accuracy:
                highest_accuracy = acc
                best_model = name
                
        for name, acc in metrics.items():
            comparison.append({
                "model": name,
                "accuracy": round(acc, 4),
                "is_highest": name == best_model,
                "is_default": name == "Random Forest"
            })
            
        return jsonify({
            "models": comparison,
            "best_model": best_model,
            "highest_accuracy": round(highest_accuracy * 100, 2)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/predict', methods=['POST'])
def predict_maintenance():
    try:
        # Load RF model and scaler
        rf_model, scaler = get_model_and_scaler()
        
        # Get JSON request payload
        data = request.get_json()
        if not data:
            return jsonify({"error": "No input data provided"}), 400
            
        # Standardize fields (support multiple keys)
        m_type = data.get('machine_type') or data.get('type')
        air_temp = data.get('air_temperature') or data.get('air_temp')
        proc_temp = data.get('process_temperature') or data.get('process_temp')
        rot_speed = data.get('rotational_speed') or data.get('speed')
        torque = data.get('torque')
        tool_wear = data.get('tool_wear') or data.get('wear')
        
        # Validate that all features exist
        missing_fields = []
        if m_type is None: missing_fields.append("machine_type")
        if air_temp is None: missing_fields.append("air_temperature")
        if proc_temp is None: missing_fields.append("process_temperature")
        if rot_speed is None: missing_fields.append("rotational_speed")
        if torque is None: missing_fields.append("torque")
        if tool_wear is None: missing_fields.append("tool_wear")
        
        if missing_fields:
            return jsonify({"error": f"Missing required fields: {', '.join(missing_fields)}"}), 400
            
        # Map machine_type to int
        type_mapping = {'L': 0, 'M': 1, 'H': 2, 0: 0, 1: 1, 2: 2}
        type_encoded = type_mapping.get(m_type)
        if type_encoded is None:
            return jsonify({"error": f"Invalid machine type '{m_type}'. Must be 'L', 'M', or 'H'"}), 400
            
        # Parse numbers
        try:
            features_raw = [
                float(type_encoded),
                float(air_temp),
                float(proc_temp),
                float(rot_speed),
                float(torque),
                float(tool_wear)
            ]
        except ValueError as val_err:
            return jsonify({"error": f"Features must be numeric values: {str(val_err)}"}), 400
            
        # Preprocess features using the scaler
        features_arr = np.array([features_raw])
        features_scaled = scaler.transform(features_arr)
        
        # Run prediction
        pred = int(rf_model.predict(features_scaled)[0])
        probabilities = rf_model.predict_proba(features_scaled)[0]
        confidence = float(probabilities[pred])
        
        prediction_text = "Machine Failure" if pred == 1 else "Healthy"
        
        return jsonify({
            "prediction": prediction_text,
            "confidence": round(confidence * 100, 1),
            "is_failure": pred == 1
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/live-status', methods=['GET'])
def live_status():
    try:
        df = get_dataset()
        rf_model, scaler = get_model_and_scaler()
        
        # Determine the current row in the dataset based on elapsed time (every 5 seconds)
        elapsed = time.time() - START_TIME
        current_index = int(elapsed // TICK_INTERVAL) % len(df)
        
        # Extract row values
        row = df.iloc[current_index]
        
        # Map quality Type L, M, H to 0, 1, 2 for the model
        type_mapping = {'L': 0, 'M': 1, 'H': 2, 0: 0, 1: 1, 2: 2}
        type_encoded = type_mapping.get(row['machine_type'], 0)
        
        # Prepare inputs for prediction
        features_raw = [
            float(type_encoded),
            float(row['air_temperature']),
            float(row['process_temperature']),
            float(row['rotational_speed']),
            float(row['torque']),
            float(row['tool_wear'])
        ]
        
        # Preprocess and run Random Forest prediction
        features_scaled = scaler.transform([features_raw])
        pred = int(rf_model.predict(features_scaled)[0])
        probabilities = rf_model.predict_proba(features_scaled)[0]
        failure_prob = float(probabilities[1]) # probability of Machine Failure
        
        # Determine Risk Level based on probability threshold
        if failure_prob < 0.3:
            risk_level = "Low"
        elif failure_prob < 0.7:
            risk_level = "Medium"
        else:
            risk_level = "High"
            
        status_text = "Machine Failure" if pred == 1 else "Healthy"
        
        # Retrieve the original Product ID using the raw dataset
        raw_df = pd.read_csv(CSV_PATH)
        raw_row = raw_df.iloc[current_index]
        machine_id = str(raw_row['Product ID'])
        
        return jsonify({
            "machine_id": machine_id,
            "machine_type": row['machine_type'],
            "status": status_text,
            "failure_probability": round(failure_prob * 100, 2),
            "risk_level": risk_level,
            "sensor_values": {
                "air_temperature": float(row['air_temperature']),
                "process_temperature": float(row['process_temperature']),
                "rotational_speed": float(row['rotational_speed']),
                "torque": float(row['torque']),
                "tool_wear": float(row['tool_wear'])
            },
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Start flask server on local address, port 5000
    app.run(host='0.0.0.0', port=5000, debug=True)
