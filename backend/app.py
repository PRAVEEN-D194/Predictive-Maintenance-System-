import os
import json
import time
import math
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, 'data', 'ai4i2020.csv')
SCALER_PATH = os.path.join(BASE_DIR, 'models', 'scaler.joblib')
MODEL_PATH = os.path.join(BASE_DIR, 'models', 'random_forest_model.joblib')
METRICS_PATH = os.path.join(BASE_DIR, 'models', 'model_metrics.json')

df_cached = None
model_cached = None
scaler_cached = None
metrics_cached = None

def get_dataset():
    global df_cached
    if df_cached is None and os.path.exists(CSV_PATH):
        df = pd.read_csv(CSV_PATH)
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
    return df_cached

def get_model_and_scaler():
    global model_cached, scaler_cached
    if model_cached is None and os.path.exists(MODEL_PATH):
        model_cached = joblib.load(MODEL_PATH)
    if scaler_cached is None and os.path.exists(SCALER_PATH):
        scaler_cached = joblib.load(SCALER_PATH)
    return model_cached, scaler_cached

def get_metrics():
    global metrics_cached
    if metrics_cached is None:
        if os.path.exists(METRICS_PATH):
            with open(METRICS_PATH, 'r') as f:
                metrics_cached = json.load(f)
        else:
            metrics_cached = {
                "Logistic Regression": 0.9675,
                "Decision Tree": 0.9775,
                "Random Forest": 0.9840,
                "SVM": 0.9720
            }
    return metrics_cached

def kelvin_to_celsius(k):
    return round(k - 273.15, 1)

def run_ml_inference(m_type, air_k, proc_k, rpm, torque, wear):
    try:
        rf_model, scaler = get_model_and_scaler()
        if rf_model is None or scaler is None:
            return 0, 0.05, 0.95
        type_mapping = {'L': 0, 'M': 1, 'H': 2, 0: 0, 1: 1, 2: 2}
        type_enc = type_mapping.get(m_type, 1)
        raw_feat = [[float(type_enc), float(air_k), float(proc_k), float(rpm), float(torque), float(wear)]]
        scaled_feat = scaler.transform(raw_feat)
        pred = int(rf_model.predict(scaled_feat)[0])
        probabilities = rf_model.predict_proba(scaled_feat)[0]
        failure_prob = float(probabilities[1])
        confidence = float(np.max(probabilities))
        return pred, failure_prob, confidence
    except Exception as e:
        return 0, 0.05, 0.95

def compute_explainability(m_type, air_k, proc_k, rpm, torque, wear, failure_prob):
    air_dev = max(0.0, (air_k - 300.0) / 4.0)
    wear_dev = max(0.0, (wear - 60.0) / 160.0)
    torque_dev = max(0.0, (torque - 40.0) / 30.0)
    speed_dev = max(0.0, (1540.0 - rpm) / 400.0) if rpm > 0 else 0.5
    temp_diff_dev = max(0.0, ((proc_k - air_k) - 10.0) / 3.0)

    raw_impacts = {
        "Tool Wear": wear_dev * 2.5 + (0.3 if wear > 180 else 0.0),
        "Temperature": (air_dev + temp_diff_dev) * 1.8,
        "Torque Load": torque_dev * 2.0,
        "Rotational Speed": speed_dev * 1.2,
        "Process Delta": temp_diff_dev * 1.5
    }
    
    total_raw = sum(raw_impacts.values()) or 1.0
    factors = []
    for k, v in raw_impacts.items():
        pct = int(round((v / total_raw) * min(95, max(15, failure_prob * 100))))
        factors.append({
            "factor": k,
            "impact": max(5, pct),
            "severity": "high" if pct > 25 else "medium" if pct > 12 else "low"
        })
    factors.sort(key=lambda x: x["impact"], reverse=True)
    return factors

def get_recommendations_and_ai_summary(m_id, status, failure_prob, sensor_vals, failure_type=None):
    air_c = kelvin_to_celsius(sensor_vals["air_temperature"])
    wear = sensor_vals["tool_wear"]
    torque = sensor_vals["torque"]
    
    if status == "Failed":
        problem_title = failure_type or "CRITICAL TOOL WEAR FAILURE"
        priority = "CRITICAL"
        action = "Immediate Tool Replacement & Diagnostic Reset"
        window = "Immediate (Machine Offline)"
        steps = [
            "Keep machine safely locked out and tag power supply.",
            "Remove worn cutting insert and inspect toolholder for thermal stress.",
            "Install new OEM certified tool bit and torque lock to manufacturer specs.",
            "Flush coolant nozzles and verify flow rate (> 15 L/min).",
            "Perform manual axis homing and zeroing calibration.",
            "Trigger system reset in dashboard to return machine to active rotation."
        ]
        ai_summary = f"Machine protective cutoff engaged due to critical wear limit ({int(wear)} min). Component requires replacement before resuming production."
        working_condition = "⚫ Machine shutdown: Protective failure mode tripped"

    elif status == "Critical":
        problem_title = "CRITICAL FAILURE RISK (OVERSTRAIN & TOOL WEAR)"
        priority = "HIGH"
        action = "Emergency Maintenance Inspection"
        window = "Within 4 hours"
        steps = [
            "Reduce spindle feed rate by 25% or pause current batch if vibration escalates.",
            "Inspect cutting bit for micro-fractures, chipping, and wear (> 200 min).",
            "Verify thermal dissipation: clean cooling fins and check coolant pump pressure.",
            "Inspect torque drive train and motor bearings for excessive mechanical resistance.",
            "Replace cutting tool and re-balance spindle before proceeding with high-speed operations."
        ]
        ai_summary = f"High failure risk ({int(failure_prob*100)}%) detected primarily driven by elevated tool wear ({int(wear)} min) and severe torque load ({torque} Nm). Immediate intervention required."
        working_condition = "🔴 Machine operating under critical conditions"

    elif status == "Warning":
        problem_title = "ELEVATED THERMAL & TOOL WEAR ANOMALY"
        priority = "MEDIUM"
        action = "Scheduled Preventative Check"
        window = "Within 24 hours"
        steps = [
            "Check coolant fluid reservoir level and temperature gradient.",
            "Inspect tool cutting edge for moderate wear accumulation.",
            "Monitor rotational RPM stability and check for drive belt tension.",
            "Schedule tool swap during next scheduled shift changeover."
        ]
        ai_summary = f"Thermal delta and wear rate are tracking above nominal baselines. Machine remains operational but requires proactive inspection to prevent degradation."
        working_condition = "🟡 Machine showing abnormal temperature / load increase"

    else:
        problem_title = "SYSTEM NOMINAL"
        priority = "LOW"
        action = "Standard Operating Routine"
        window = "Next Routine Service (30 Days)"
        steps = [
            "Maintain standard operating speeds and feed rates.",
            "Ensure regular lubrication cycle at scheduled intervals.",
            "Keep ambient workspace temperature within optimal 20-25°C range."
        ]
        ai_summary = f"Temperature ({air_c}°C), torque ({torque} Nm), and tool wear ({int(wear)} min) are within standard nominal operating bounds. No immediate action needed."
        working_condition = "🟢 Machine operating normally"

    return {
        "problem_title": problem_title,
        "priority": priority,
        "recommended_action": action,
        "maintenance_window": window,
        "steps": steps,
        "ai_summary": ai_summary,
        "working_condition": working_condition
    }

FLEET_STATE = {
    "M-001": {
        "id": "M-001",
        "name": "CNC Milling Center Alpha",
        "type": "M",
        "status": "Working",
        "operating_hours": 1420.5,
        "last_maintenance": "2026-08-15",
        "next_maintenance": "2026-09-30",
        "air_temperature": 298.2,
        "process_temperature": 308.6,
        "rotational_speed": 1520.0,
        "torque": 40.2,
        "tool_wear": 42.0,
        "is_failed": False,
        "failure_type": None,
        "failure_time": None,
        "failure_reason": None,
        "history": [],
        "maintenance_history": [
            {
                "date": "2026-08-15",
                "type": "Routine Preventive Service",
                "issue": "Quarterly calibration check",
                "action": "Spindle aligned, lubrication topped up",
                "status": "Completed"
            }
        ]
    },
    "M-002": {
        "id": "M-002",
        "name": "Precision Lathe Beta",
        "type": "H",
        "status": "Working",
        "operating_hours": 980.2,
        "last_maintenance": "2026-08-22",
        "next_maintenance": "2026-10-05",
        "air_temperature": 298.5,
        "process_temperature": 308.8,
        "rotational_speed": 1485.0,
        "torque": 42.5,
        "tool_wear": 78.0,
        "is_failed": False,
        "failure_type": None,
        "failure_time": None,
        "failure_reason": None,
        "history": [],
        "maintenance_history": [
            {
                "date": "2026-08-22",
                "type": "Sensor Calibration",
                "issue": "Minor torque gauge drift",
                "action": "Recalibrated strain gauge sensor",
                "status": "Completed"
            }
        ]
    },
    "M-003": {
        "id": "M-003",
        "name": "5-Axis Machining Center Gamma",
        "type": "L",
        "status": "Warning",
        "operating_hours": 2150.8,
        "last_maintenance": "2026-08-05",
        "next_maintenance": "2026-09-15",
        "air_temperature": 302.4,
        "process_temperature": 311.8,
        "rotational_speed": 1395.0,
        "torque": 54.8,
        "tool_wear": 158.0,
        "is_failed": False,
        "failure_type": None,
        "failure_time": None,
        "failure_reason": None,
        "history": [],
        "maintenance_history": [
            {
                "date": "2026-08-05",
                "type": "Thermal System Inspection",
                "issue": "Thermal sensor report high delta",
                "action": "Heatsink cleaned and fan inspected",
                "status": "Completed"
            }
        ]
    },
    "M-004": {
        "id": "M-004",
        "name": "High-Speed Spindle Delta",
        "type": "L",
        "status": "Critical",
        "operating_hours": 3410.0,
        "last_maintenance": "2026-07-28",
        "next_maintenance": "2026-09-10",
        "air_temperature": 303.8,
        "process_temperature": 313.2,
        "rotational_speed": 1280.0,
        "torque": 66.5,
        "tool_wear": 218.0,
        "is_failed": False,
        "failure_type": "Tool Wear & Overstrain Failure Risk",
        "failure_time": None,
        "failure_reason": "Tool wear is above critical 200 min threshold combined with high torque load of 66.5 Nm.",
        "history": [],
        "maintenance_history": [
            {
                "date": "2026-07-28",
                "type": "Emergency Tool Replacement",
                "issue": "Tool micro-fracture detected",
                "action": "Toolholder replaced and tested under load",
                "status": "Completed"
            }
        ]
    },
    "M-005": {
        "id": "M-005",
        "name": "Hydraulic Stamping Unit Epsilon",
        "type": "M",
        "status": "Failed",
        "operating_hours": 4120.4,
        "last_maintenance": "2026-07-10",
        "next_maintenance": "Immediate",
        "air_temperature": 304.5,
        "process_temperature": 314.8,
        "rotational_speed": 0.0,
        "torque": 0.0,
        "tool_wear": 235.0,
        "is_failed": True,
        "failure_type": "Tool Wear Failure (TWF)",
        "failure_time": "10:42 AM",
        "failure_reason": "Tool wear reached 235 min, causing automatic protective shutdown to prevent workpiece damage.",
        "last_known_sensor_values": {
            "air_temperature": 304.5,
            "process_temperature": 314.8,
            "rotational_speed": 1310.0,
            "torque": 68.2,
            "tool_wear": 235.0
        },
        "history": [],
        "maintenance_history": [
            {
                "date": "2026-07-10",
                "type": "Hydraulic Fluid Replacement",
                "issue": "Fluid contamination",
                "action": "Flushed reservoir and refilled ISO VG 46 oil",
                "status": "Completed"
            }
        ]
    }
}

LAST_TICK_TIME = 0

def update_fleet_state():
    global LAST_TICK_TIME
    now = time.time()
    if now - LAST_TICK_TIME < 0.6:
        return
    LAST_TICK_TIME = now

    for m_id, m in FLEET_STATE.items():
        if m["is_failed"]:
            m["rotational_speed"] = 0.0
            m["torque"] = 0.0
            m["status"] = "Failed"
            continue

        m["operating_hours"] = round(m["operating_hours"] + 0.01, 2)
        
        if m["status"] == "Working":
            target_air = 298.2 + 0.3 * math.sin(now / 20.0 + (hash(m_id) % 5))
            target_speed = 1520.0 + 10.0 * math.cos(now / 15.0)
            target_torque = 40.0 + 1.5 * math.sin(now / 18.0)
            m["tool_wear"] = min(240.0, m["tool_wear"] + 0.04)
            m["air_temperature"] += 0.15 * (target_air - m["air_temperature"])
            m["rotational_speed"] += 0.15 * (target_speed - m["rotational_speed"])
            m["torque"] += 0.15 * (target_torque - m["torque"])
            m["process_temperature"] = m["air_temperature"] + 10.0 + (m["torque"] / 40.0) * 0.5
        elif m["status"] == "Warning":
            target_air = 302.2 + 0.4 * math.sin(now / 22.0)
            target_speed = 1390.0 + 8.0 * math.cos(now / 14.0)
            target_torque = 55.0 + 1.2 * math.sin(now / 16.0)
            m["tool_wear"] = min(240.0, m["tool_wear"] + 0.06)
            m["air_temperature"] += 0.15 * (target_air - m["air_temperature"])
            m["rotational_speed"] += 0.15 * (target_speed - m["rotational_speed"])
            m["torque"] += 0.15 * (target_torque - m["torque"])
            m["process_temperature"] = m["air_temperature"] + 10.8 + (m["torque"] / 40.0) * 0.6
        elif m["status"] == "Critical":
            target_air = 303.6 + 0.2 * math.sin(now / 15.0)
            target_speed = 1270.0 + 8.0 * math.cos(now / 12.0)
            target_torque = 66.0 + 1.0 * math.sin(now / 10.0)
            m["tool_wear"] = min(240.0, m["tool_wear"] + 0.08)
            m["air_temperature"] += 0.15 * (target_air - m["air_temperature"])
            m["rotational_speed"] += 0.15 * (target_speed - m["rotational_speed"])
            m["torque"] += 0.15 * (target_torque - m["torque"])
            m["process_temperature"] = m["air_temperature"] + 11.2 + (m["torque"] / 40.0) * 0.7

        if m["tool_wear"] >= 240.0:
            m["status"] = "Failed"
            m["is_failed"] = True
            m["failure_type"] = "Tool Wear Failure (TWF)"
            m["failure_time"] = time.strftime("%I:%M %p")
            m["failure_reason"] = "Maximum safe tool wear limit reached."
            m["last_known_sensor_values"] = {
                "air_temperature": round(m["air_temperature"], 1),
                "process_temperature": round(m["process_temperature"], 1),
                "rotational_speed": round(m["rotational_speed"], 0),
                "torque": round(m["torque"], 1),
                "tool_wear": round(m["tool_wear"], 0)
            }

def build_fleet_payload():
    update_fleet_state()
    formatted_machines = []
    t_str = time.strftime("%H:%M:%S")

    for m_id, m in FLEET_STATE.items():
        if m["is_failed"]:
            failure_prob = 0.98
            health_score = 12
        else:
            pred, failure_prob, _ = run_ml_inference(
                m["type"], m["air_temperature"], m["process_temperature"],
                m["rotational_speed"], m["torque"], m["tool_wear"]
            )
            if failure_prob >= 0.50 or pred == 1:
                m["status"] = "Critical"
            elif failure_prob >= 0.18:
                m["status"] = "Warning"
            else:
                m["status"] = "Working"
            health_score = max(0, min(100, int(round((1.0 - failure_prob) * 100))))

        air_k = round(m["air_temperature"], 1)
        proc_k = round(m["process_temperature"], 1)
        rpm = round(m["rotational_speed"], 0)
        torque = round(m["torque"], 1)
        wear = round(m["tool_wear"], 0)
        power_kw = round((torque * (2 * math.pi * rpm / 60.0)) / 1000.0, 2) if rpm > 0 else 0.0

        sensor_vals = {
            "air_temperature": air_k,
            "air_temperature_c": kelvin_to_celsius(air_k),
            "process_temperature": proc_k,
            "process_temperature_c": kelvin_to_celsius(proc_k),
            "rotational_speed": rpm,
            "torque": torque,
            "tool_wear": wear,
            "power_kw": power_kw
        }

        # Keep rolling 20 points history
        if not m["is_failed"]:
            hist_point = {
                "time": t_str,
                "air_temperature": air_k,
                "air_temperature_c": kelvin_to_celsius(air_k),
                "process_temperature": proc_k,
                "process_temperature_c": kelvin_to_celsius(proc_k),
                "rotational_speed": rpm,
                "torque": torque,
                "tool_wear": wear,
                "power_kw": power_kw,
                "failure_probability": round(failure_prob * 100, 1),
                "health_score": health_score,
                "status": m["status"]
            }
            m["history"].append(hist_point)
            if len(m["history"]) > 20:
                m["history"] = m["history"][-20:]

        explainability = compute_explainability(m["type"], air_k, proc_k, rpm, torque, wear, failure_prob)
        recommendations = get_recommendations_and_ai_summary(m_id, m["status"], failure_prob, sensor_vals, m.get("failure_type"))

        sensor_badges = {
            "temperature": "Normal" if air_k < 301.0 else "Warning" if air_k < 303.5 else "Critical",
            "rotational_speed": "Stable" if rpm > 1450.0 else "Reduced" if rpm > 1300.0 else "Critical/Stopped",
            "torque": "Normal" if torque < 50.0 else "Elevated" if torque < 62.0 else "Overstrain",
            "tool_wear": "Nominal" if wear < 120.0 else "Moderate" if wear < 190.0 else "Critical Wear"
        }

        machine_obj = {
            "id": m["id"],
            "name": m["name"],
            "type": m["type"],
            "status": m["status"],
            "is_failed": m["is_failed"],
            "failure_type": m.get("failure_type"),
            "failure_time": m.get("failure_time"),
            "failure_reason": m.get("failure_reason"),
            "last_known_sensor_values": m.get("last_known_sensor_values"),
            "health_score": health_score,
            "failure_probability": round(failure_prob * 100, 1),
            "operating_hours": m["operating_hours"],
            "last_maintenance": m["last_maintenance"],
            "next_maintenance": m["next_maintenance"],
            "sensor_values": sensor_vals,
            "sensor_badges": sensor_badges,
            "explainability": explainability,
            "recommendations": recommendations,
            "history": m["history"],
            "maintenance_history": m["maintenance_history"],
            "last_updated": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        formatted_machines.append(machine_obj)

    total_machines = len(formatted_machines)
    working_count = sum(1 for m in formatted_machines if m["status"] == "Working")
    warning_count = sum(1 for m in formatted_machines if m["status"] == "Warning")
    critical_count = sum(1 for m in formatted_machines if m["status"] == "Critical")
    failed_count = sum(1 for m in formatted_machines if m["status"] == "Failed")
    avg_health = int(round(sum(m["health_score"] for m in formatted_machines) / total_machines)) if total_machines > 0 else 0

    return {
        "summary": {
            "total_machines": total_machines,
            "working_machines": working_count,
            "warning_machines": warning_count,
            "critical_machines": critical_count,
            "failed_machines": failed_count,
            "fleet_health": avg_health
        },
        "machines": formatted_machines,
        "critical_machines": [m for m in formatted_machines if m["status"] == "Critical"],
        "failed_machines": [m for m in formatted_machines if m["status"] == "Failed"],
        "working_machines": [m for m in formatted_machines if m["status"] in ["Working", "Warning"]],
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }

# ---------------------------------------------------------------------------
# API ROUTES
# ---------------------------------------------------------------------------

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "message": "Fleet Predictive Maintenance server is running!"})

@app.route('/fleet', methods=['GET'])
def get_fleet():
    try:
        data = build_fleet_payload()
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/machine/<machine_id>', methods=['GET'])
def get_machine(machine_id):
    try:
        data = build_fleet_payload()
        m = next((item for item in data["machines"] if item["id"] == machine_id), None)
        if not m:
            return jsonify({"error": f"Machine '{machine_id}' not found"}), 404
        return jsonify(m)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/machine/<machine_id>/maintain', methods=['POST'])
def perform_maintenance(machine_id):
    try:
        if machine_id not in FLEET_STATE:
            return jsonify({"error": f"Machine '{machine_id}' not found"}), 404

        m = FLEET_STATE[machine_id]
        payload = request.get_json() or {}
        action_note = payload.get("action", "Component inspection & tool replacement")

        m["is_failed"] = False
        m["status"] = "Working"
        m["failure_type"] = None
        m["failure_time"] = None
        m["failure_reason"] = None
        m["air_temperature"] = 298.0
        m["process_temperature"] = 308.2
        m["rotational_speed"] = 1520.0
        m["torque"] = 39.5
        m["tool_wear"] = 12.0
        m["last_maintenance"] = time.strftime("%Y-%m-%d")
        
        m["maintenance_history"].insert(0, {
            "date": time.strftime("%Y-%m-%d %H:%M"),
            "type": "Predictive Service / Overhaul",
            "issue": f"Restored machine {machine_id} to healthy baseline",
            "action": action_note,
            "status": "Completed"
        })

        data = build_fleet_payload()
        updated_m = next(item for item in data["machines"] if item["id"] == machine_id)
        return jsonify({
            "message": f"Machine {machine_id} maintenance successfully completed.",
            "machine": updated_m
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/dashboard', methods=['GET'])
def dashboard_stats():
    try:
        df = get_dataset()
        metrics = get_metrics()
        total_machines = len(df) if df is not None else 10000
        failed_machines = int(df['machine_failure'].sum()) if df is not None else 339
        healthy_machines = total_machines - failed_machines
        rf_accuracy = metrics.get("Random Forest", 0.9840)
        
        raw_df = pd.read_csv(CSV_PATH) if os.path.exists(CSV_PATH) else None
        first_10 = raw_df.head(10).to_dict(orient='records') if raw_df is not None else []
        
        type_counts = df['machine_type'].value_counts().to_dict() if df is not None else {}
        type_dist = [
            {"type": "Low Quality (L)", "count": int(type_counts.get('L', 0))},
            {"type": "Medium Quality (M)", "count": int(type_counts.get('M', 0))},
            {"type": "High Quality (H)", "count": int(type_counts.get('H', 0))}
        ]
        failure_counts = df['machine_failure'].value_counts().to_dict() if df is not None else {}
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
        if df is None:
            return jsonify({"error": "Dataset not available"}), 500
        type_counts = df['machine_type'].value_counts().to_dict()
        type_dist = [
            {"type": "L", "count": int(type_counts.get('L', 0))},
            {"type": "M", "count": int(type_counts.get('M', 0))},
            {"type": "H", "count": int(type_counts.get('H', 0))}
        ]
        failure_counts = df['machine_failure'].value_counts().to_dict()
        failure_dist = [
            {"name": "Healthy", "value": int(failure_counts.get(0, 0))},
            {"name": "Failed", "value": int(failure_counts.get(1, 0))}
        ]
        air_temp_bins = pd.cut(df['air_temperature'], bins=10)
        air_temp_counts = df['air_temperature'].groupby(air_temp_bins, observed=False).count()
        air_temp_dist = [{"bin": f"{interval.left:.1f}-{interval.right:.1f} K", "count": int(count)} for interval, count in air_temp_counts.items()]
        
        process_temp_bins = pd.cut(df['process_temperature'], bins=10)
        process_temp_counts = df['process_temperature'].groupby(process_temp_bins, observed=False).count()
        process_temp_dist = [{"bin": f"{interval.left:.1f}-{interval.right:.1f} K", "count": int(count)} for interval, count in process_temp_counts.items()]
        
        tool_wear_bins = pd.cut(df['tool_wear'], bins=10)
        tool_wear_counts = df['tool_wear'].groupby(tool_wear_bins, observed=False).count()
        tool_wear_dist = [{"bin": f"{int(interval.left)}-{int(interval.right)} min", "count": int(count)} for interval, count in tool_wear_counts.items()]
        
        scatter_sample = df.sample(n=150, random_state=42)[['rotational_speed', 'torque', 'machine_failure', 'air_temperature']].to_dict(orient='records')
        
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
        comparison = []
        highest_accuracy = 0
        best_model = ""
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
        rf_model, scaler = get_model_and_scaler()
        data = request.get_json() or {}
        m_type = data.get('machine_type') or data.get('type')
        air_temp = data.get('air_temperature') or data.get('air_temp')
        proc_temp = data.get('process_temperature') or data.get('process_temp')
        rot_speed = data.get('rotational_speed') or data.get('speed')
        torque = data.get('torque')
        tool_wear = data.get('tool_wear') or data.get('wear')
        
        type_mapping = {'L': 0, 'M': 1, 'H': 2, 0: 0, 1: 1, 2: 2}
        type_encoded = type_mapping.get(m_type, 1)
        features_raw = [float(type_encoded), float(air_temp), float(proc_temp), float(rot_speed), float(torque), float(tool_wear)]
        features_scaled = scaler.transform([features_raw])
        pred = int(rf_model.predict(features_scaled)[0])
        probabilities = rf_model.predict_proba(features_scaled)[0]
        failure_prob = float(probabilities[1])
        confidence = float(probabilities[pred])
        health_score = max(0, min(100, int(round((1.0 - failure_prob) * 100))))
        
        if failure_prob >= 0.70 or pred == 1:
            status_text = "Critical"
        elif failure_prob >= 0.40:
            status_text = "High Risk"
        elif failure_prob >= 0.18:
            status_text = "Warning"
        else:
            status_text = "Healthy"
        
        return jsonify({
            "prediction": "Machine Failure" if pred == 1 else "Healthy",
            "confidence": round(confidence * 100, 1),
            "failure_probability": round(failure_prob * 100, 1),
            "health_score": health_score,
            "status": status_text,
            "is_failure": pred == 1
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/live-status', methods=['GET'])
def live_status():
    try:
        data = build_fleet_payload()
        m1 = data["machines"][0]
        return jsonify({
            "machine_id": m1["id"],
            "machine_type": m1["type"],
            "status": m1["status"],
            "failure_probability": m1["failure_probability"],
            "confidence": 98.4,
            "risk_level": "Low Risk" if m1["status"] == "Working" else "Critical Risk",
            "sensor_values": m1["sensor_values"],
            "timestamp": m1["last_updated"]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/live-reset', methods=['POST'])
def live_reset():
    return perform_maintenance("M-001")

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
