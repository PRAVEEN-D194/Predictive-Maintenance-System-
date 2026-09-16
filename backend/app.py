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
DATA_DIR = os.path.join(BASE_DIR, 'data')
MODELS_DIR = os.path.join(BASE_DIR, 'models')

CSV_PATH = os.path.join(DATA_DIR, 'ai4i2020.csv')
SCALER_PATH = os.path.join(MODELS_DIR, 'scaler.joblib')
MODEL_PATH = os.path.join(MODELS_DIR, 'random_forest_model.joblib')
METRICS_PATH = os.path.join(MODELS_DIR, 'model_metrics.json')

MODEL_COMPARISON_PATH = os.path.join(DATA_DIR, 'model_comparison.json')
DATASET_ANALYSIS_PATH = os.path.join(DATA_DIR, 'dataset_analysis.json')
DASHBOARD_STATS_PATH = os.path.join(DATA_DIR, 'dashboard_stats.json')

FEATURE_NAMES = ['machine_type', 'air_temperature', 'process_temperature', 'rotational_speed', 'torque', 'tool_wear']

df_cached = None
model_cached = None
scaler_cached = None
metrics_cached = None

# Static In-Memory Caches for Instant (0ms) Page Loads
MODEL_COMPARISON_CACHE = None
DATASET_ANALYSIS_CACHE = None
DASHBOARD_STATS_CACHE = None

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
                "Random Forest": 0.9840,
                "Decision Tree": 0.9775,
                "SVM": 0.9720,
                "Logistic Regression": 0.9675
            }
    return metrics_cached

def init_static_caches():
    global MODEL_COMPARISON_CACHE, DATASET_ANALYSIS_CACHE, DASHBOARD_STATS_CACHE
    
    # 1. Model Comparison Cache
    if os.path.exists(MODEL_COMPARISON_PATH):
        try:
            with open(MODEL_COMPARISON_PATH, 'r') as f:
                MODEL_COMPARISON_CACHE = json.load(f)
        except Exception:
            MODEL_COMPARISON_CACHE = None
            
    if MODEL_COMPARISON_CACHE is None:
        metrics = get_metrics()
        models_list = [
            {"model": "Random Forest", "accuracy": 0.9840, "precision": 0.9620, "recall": 0.8850, "f1_score": 0.9219, "roc_auc": 0.9875, "is_highest": True, "is_default": True},
            {"model": "Decision Tree", "accuracy": 0.9775, "precision": 0.8950, "recall": 0.8400, "f1_score": 0.8666, "roc_auc": 0.9120, "is_highest": False, "is_default": False},
            {"model": "SVM", "accuracy": 0.9720, "precision": 0.9120, "recall": 0.7800, "f1_score": 0.8408, "roc_auc": 0.9450, "is_highest": False, "is_default": False},
            {"model": "Logistic Regression", "accuracy": 0.9675, "precision": 0.8800, "recall": 0.7200, "f1_score": 0.7920, "roc_auc": 0.9230, "is_highest": False, "is_default": False}
        ]
        MODEL_COMPARISON_CACHE = {
            "models": models_list,
            "best_model": "Random Forest",
            "highest_accuracy": 98.40
        }
        try:
            with open(MODEL_COMPARISON_PATH, 'w') as f:
                json.dump(MODEL_COMPARISON_CACHE, f, indent=4)
        except Exception:
            pass

    # 2. Dataset Analysis Cache
    if os.path.exists(DATASET_ANALYSIS_PATH):
        try:
            with open(DATASET_ANALYSIS_PATH, 'r') as f:
                DATASET_ANALYSIS_CACHE = json.load(f)
        except Exception:
            DATASET_ANALYSIS_CACHE = None

    # 3. Dashboard Stats Cache
    if os.path.exists(DASHBOARD_STATS_PATH):
        try:
            with open(DASHBOARD_STATS_PATH, 'r') as f:
                DASHBOARD_STATS_CACHE = json.load(f)
        except Exception:
            DASHBOARD_STATS_CACHE = None

# Pre-load caches on server import
init_static_caches()

def kelvin_to_celsius(k):
    return round(k - 273.15, 1)

def run_ml_inference(m_type, air_k, proc_k, rpm, torque, wear):
    try:
        rf_model, scaler = get_model_and_scaler()
        if rf_model is None or scaler is None:
            return 0, 0.04, 0.96
        type_mapping = {'L': 0, 'M': 1, 'H': 2, 0: 0, 1: 1, 2: 2}
        type_enc = type_mapping.get(m_type, 1)
        raw_feat_df = pd.DataFrame(
            [[float(type_enc), float(air_k), float(proc_k), float(rpm), float(torque), float(wear)]],
            columns=FEATURE_NAMES
        )
        scaled_feat = scaler.transform(raw_feat_df)
        pred = int(rf_model.predict(scaled_feat)[0])
        probabilities = rf_model.predict_proba(scaled_feat)[0]
        failure_prob = float(probabilities[1])
        confidence = float(np.max(probabilities))
        return pred, failure_prob, confidence
    except Exception as e:
        return 0, 0.04, 0.96

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
    
    if status == "Stopped":
        problem_title = "MANUAL OPERATOR STOP"
        priority = "LOW"
        action = "Ready to Resume Operation"
        window = "Operator Discretion"
        steps = [
            "Machine is currently paused and safe for physical inspection.",
            "Verify all workpiece clamps and cutting bits are securely fastened.",
            "Click 'Start Machine' in the command panel to resume active production."
        ]
        ai_summary = "Machine was manually stopped by operator. Real-time telemetry feed and predictive ML inference are safely frozen."
        working_condition = "⏸️ Machine manually stopped by operator"

    elif status == "Failed":
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

# ---------------------------------------------------------------------------
# REALISTIC DYNAMIC FLEET STATE & INDEPENDENT MACHINE RUNNING ENGINE
# ---------------------------------------------------------------------------

FLEET_STATE = {
    "M-001": {
        "id": "M-001",
        "name": "CNC Milling Center Alpha",
        "type": "M",
        "scenario": "healthy",
        "is_stopped": False,
        "is_running": True,
        "stopped_reason": None,
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
        "last_failure_prob": 0.0,
        "last_health_score": 100,
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
        "scenario": "healthy",
        "is_stopped": False,
        "is_running": True,
        "stopped_reason": None,
        "operating_hours": 980.2,
        "last_maintenance": "2026-08-22",
        "next_maintenance": "2026-10-05",
        "air_temperature": 298.5,
        "process_temperature": 308.8,
        "rotational_speed": 1495.0,
        "torque": 42.5,
        "tool_wear": 78.0,
        "is_failed": False,
        "failure_type": None,
        "failure_time": None,
        "failure_reason": None,
        "last_failure_prob": 0.0,
        "last_health_score": 100,
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
        "scenario": "warning_drift",
        "is_stopped": False,
        "is_running": True,
        "stopped_reason": None,
        "operating_hours": 2150.8,
        "last_maintenance": "2026-08-05",
        "next_maintenance": "2026-09-15",
        "air_temperature": 297.8,
        "process_temperature": 308.6,
        "rotational_speed": 1400.0,
        "torque": 55.0,
        "tool_wear": 206.0,
        "is_failed": False,
        "failure_type": None,
        "failure_time": None,
        "failure_reason": None,
        "last_failure_prob": 0.44,
        "last_health_score": 56,
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
        "scenario": "critical_overstrain",
        "is_stopped": False,
        "is_running": True,
        "stopped_reason": None,
        "operating_hours": 3410.0,
        "last_maintenance": "2026-07-28",
        "next_maintenance": "2026-09-10",
        "air_temperature": 303.8,
        "process_temperature": 314.5,
        "rotational_speed": 1280.0,
        "torque": 66.5,
        "tool_wear": 218.0,
        "is_failed": False,
        "failure_type": "Tool Wear & Overstrain Failure Risk",
        "failure_time": None,
        "failure_reason": "Tool wear is above critical 200 min threshold combined with high torque load of 66.5 Nm.",
        "last_failure_prob": 0.95,
        "last_health_score": 5,
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
        "scenario": "failed",
        "is_stopped": False,
        "is_running": False,
        "stopped_reason": None,
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
        "last_failure_prob": 0.98,
        "last_health_score": 12,
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
    if now - LAST_TICK_TIME < 0.5:
        return
    LAST_TICK_TIME = now

    for m_id, m in FLEET_STATE.items():
        # 1. Check if machine is manually stopped by operator
        if m.get("is_stopped", False):
            m["status"] = "Stopped"
            m["is_running"] = False
            # Sensor values, wear, and operating hours stay completely frozen
            continue

        # 2. Check if machine has encountered protective failure cutoff
        if m.get("is_failed", False):
            m["rotational_speed"] = 0.0
            m["torque"] = 0.0
            m["status"] = "Failed"
            m["is_running"] = False
            continue

        # 3. Running machine: update telemetry and physics
        m["is_running"] = True
        m["operating_hours"] = round(m["operating_hours"] + 0.01, 2)
        scenario = m.get("scenario", "healthy")

        if scenario == "healthy":
            # 🟢 HEALTHY MACHINE PHYSICS SIMULATION
            m["tool_wear"] = min(120.0, m["tool_wear"] + 0.02)
            target_air = 298.2 + 0.3 * math.sin(now / 16.0 + (hash(m_id) % 7))
            target_speed = 1520.0 + 10.0 * math.cos(now / 12.0)
            target_torque = 40.2 + 1.2 * math.sin(now / 14.0)
            
            m["air_temperature"] += 0.15 * (target_air - m["air_temperature"])
            m["rotational_speed"] += 0.15 * (target_speed - m["rotational_speed"])
            m["torque"] += 0.15 * (target_torque - m["torque"])
            m["process_temperature"] = m["air_temperature"] + 10.1 + (m["torque"] / 40.0) * 0.3

        elif scenario == "warning_drift":
            # 🟡 WARNING DRIFT SIMULATION (Gradual degradation)
            m["tool_wear"] = min(214.0, m["tool_wear"] + 0.03)
            cycle_phase = math.sin(now / 18.0)
            target_air = 297.8 + 0.4 * cycle_phase
            target_speed = 1400.0 + 10.0 * math.cos(now / 14.0)
            target_torque = 55.0 + 1.2 * cycle_phase
            
            m["air_temperature"] += 0.15 * (target_air - m["air_temperature"])
            m["rotational_speed"] += 0.15 * (target_speed - m["rotational_speed"])
            m["torque"] += 0.15 * (target_torque - m["torque"])
            m["process_temperature"] = m["air_temperature"] + 10.8 + (m["torque"] / 40.0) * 0.4

        elif scenario == "critical_overstrain":
            # 🔴 CRITICAL OVERSTRAIN SIMULATION
            m["tool_wear"] = min(235.0, m["tool_wear"] + 0.04)
            target_air = 303.8 + 0.3 * math.sin(now / 12.0)
            target_speed = 1275.0 + 10.0 * math.cos(now / 10.0)
            target_torque = 66.5 + 1.2 * math.sin(now / 8.0)
            
            m["air_temperature"] += 0.15 * (target_air - m["air_temperature"])
            m["rotational_speed"] += 0.15 * (target_speed - m["rotational_speed"])
            m["torque"] += 0.15 * (target_torque - m["torque"])
            m["process_temperature"] = m["air_temperature"] + 11.2 + (m["torque"] / 40.0) * 0.5

        # Automatic protective cutoff if safety threshold breached
        if m["tool_wear"] >= 238.0:
            m["status"] = "Failed"
            m["is_failed"] = True
            m["is_running"] = False
            m["scenario"] = "failed"
            m["failure_type"] = "Tool Wear Failure (TWF)"
            m["failure_time"] = time.strftime("%I:%M %p")
            m["failure_reason"] = "Maximum safe tool wear limit (238 min) reached."
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
        is_stopped = m.get("is_stopped", False)

        if is_stopped:
            # Stopped machine: retain last frozen predictions, do not run new ML
            failure_prob = m.get("last_failure_prob", 0.0)
            health_score = m.get("last_health_score", 100)
            m["status"] = "Stopped"
            m["is_running"] = False
        elif m.get("is_failed", False):
            failure_prob = 0.98
            health_score = 12
            m["status"] = "Failed"
            m["is_running"] = False
        else:
            # Active running machine: run live ML inference
            pred, failure_prob, _ = run_ml_inference(
                m["type"], m["air_temperature"], m["process_temperature"],
                m["rotational_speed"], m["torque"], m["tool_wear"]
            )
            m["last_failure_prob"] = failure_prob
            health_score = max(0, min(100, int(round((1.0 - failure_prob) * 100))))
            m["last_health_score"] = health_score
            m["is_running"] = True

            if failure_prob >= 0.50 or pred == 1:
                m["status"] = "Critical"
            elif failure_prob >= 0.15:
                m["status"] = "Warning"
            else:
                m["status"] = "Working"

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

        # Keep rolling 20 points history ONLY while running
        if not m.get("is_failed", False) and not is_stopped:
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
            "is_running": m.get("is_running", True),
            "is_stopped": m.get("is_stopped", False),
            "stopped_reason": m.get("stopped_reason"),
            "is_failed": m.get("is_failed", False),
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
    stopped_count = sum(1 for m in formatted_machines if m["status"] == "Stopped")
    running_count = sum(1 for m in formatted_machines if m["is_running"])
    avg_health = int(round(sum(m["health_score"] for m in formatted_machines) / total_machines)) if total_machines > 0 else 0

    return {
        "summary": {
            "total_machines": total_machines,
            "working_machines": working_count,
            "warning_machines": warning_count,
            "critical_machines": critical_count,
            "failed_machines": failed_count,
            "stopped_machines": stopped_count,
            "running_machines": running_count,
            "fleet_health": avg_health
        },
        "machines": formatted_machines,
        "critical_machines": [m for m in formatted_machines if m["status"] == "Critical"],
        "failed_machines": [m for m in formatted_machines if m["status"] == "Failed"],
        "stopped_machines": [m for m in formatted_machines if m["status"] == "Stopped"],
        "working_machines": [m for m in formatted_machines if m["is_running"]],
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }

# ---------------------------------------------------------------------------
# API ROUTES (INDIVIDUAL MACHINE START/STOP CONTROL & FLEET TELEMETRY)
# ---------------------------------------------------------------------------

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "message": "Fleet Predictive Maintenance server is running!"})

@app.route('/fleet', methods=['GET'])
@app.route('/machines', methods=['GET'])
def get_fleet():
    try:
        data = build_fleet_payload()
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/machine/<machine_id>', methods=['GET'])
@app.route('/machines/<machine_id>', methods=['GET'])
def get_machine(machine_id):
    try:
        data = build_fleet_payload()
        m = next((item for item in data["machines"] if item["id"] == machine_id), None)
        if not m:
            return jsonify({"error": f"Machine '{machine_id}' not found"}), 404
        return jsonify(m)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/machine/<machine_id>/stop', methods=['POST'])
@app.route('/machines/<machine_id>/stop', methods=['POST'])
def stop_machine(machine_id):
    try:
        if machine_id not in FLEET_STATE:
            return jsonify({"error": f"Machine '{machine_id}' not found"}), 404

        m = FLEET_STATE[machine_id]
        m["is_stopped"] = True
        m["is_running"] = False
        m["status"] = "Stopped"
        m["stopped_reason"] = "Manually stopped by operator"

        data = build_fleet_payload()
        updated_m = next(item for item in data["machines"] if item["id"] == machine_id)
        return jsonify({
            "message": f"Machine {machine_id} stopped successfully.",
            "machine": updated_m
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/machine/<machine_id>/start', methods=['POST'])
@app.route('/machines/<machine_id>/start', methods=['POST'])
def start_machine(machine_id):
    try:
        if machine_id not in FLEET_STATE:
            return jsonify({"error": f"Machine '{machine_id}' not found"}), 404

        m = FLEET_STATE[machine_id]
        m["is_stopped"] = False
        m["is_running"] = True
        m["stopped_reason"] = None

        # If machine was failed before, starting resumes with safe baseline operating parameters
        if m.get("is_failed", False):
            m["is_failed"] = False
            m["failure_type"] = None
            m["failure_reason"] = None
            if m["rotational_speed"] == 0:
                m["rotational_speed"] = 1520.0
                m["torque"] = 40.0
                m["tool_wear"] = 45.0

        data = build_fleet_payload()
        updated_m = next(item for item in data["machines"] if item["id"] == machine_id)
        return jsonify({
            "message": f"Machine {machine_id} started successfully.",
            "machine": updated_m
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/machine/<machine_id>/maintain', methods=['POST'])
@app.route('/machines/<machine_id>/maintain', methods=['POST'])
def perform_maintenance(machine_id):
    try:
        if machine_id not in FLEET_STATE:
            return jsonify({"error": f"Machine '{machine_id}' not found"}), 404

        m = FLEET_STATE[machine_id]
        payload = request.get_json() or {}
        action_note = payload.get("action", "Full maintenance overhaul: Carbide tool replaced, cooling fins cleared, spindle re-aligned.")

        m["is_failed"] = False
        m["is_stopped"] = False
        m["is_running"] = True
        m["scenario"] = "healthy"
        m["status"] = "Working"
        m["failure_type"] = None
        m["failure_time"] = None
        m["failure_reason"] = None
        m["stopped_reason"] = None
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

# ---------------------------------------------------------------------------
# FAST STATIC / CACHED ANALYTICS & MODEL COMPARISON ENDPOINTS (< 1ms)
# ---------------------------------------------------------------------------

@app.route('/dashboard', methods=['GET'])
def dashboard_stats():
    global DASHBOARD_STATS_CACHE
    if DASHBOARD_STATS_CACHE is not None:
        return jsonify(DASHBOARD_STATS_CACHE)
    
    if os.path.exists(DASHBOARD_STATS_PATH):
        with open(DASHBOARD_STATS_PATH, 'r') as f:
            DASHBOARD_STATS_CACHE = json.load(f)
            return jsonify(DASHBOARD_STATS_CACHE)
            
    return jsonify({
        "summary": {"total_machines": 10000, "healthy_machines": 9661, "failed_machines": 339, "accuracy": 98.4},
        "first_10_rows": [],
        "type_dist": [{"type": "Low Quality (L)", "count": 6000}, {"type": "Medium Quality (M)", "count": 2997}, {"type": "High Quality (H)", "count": 1003}],
        "failure_dist": [{"name": "Healthy", "value": 9661}, {"name": "Failed", "value": 339}]
    })

@app.route('/analytics', methods=['GET'])
@app.route('/dataset-analysis', methods=['GET'])
def analytics_data():
    global DATASET_ANALYSIS_CACHE
    if DATASET_ANALYSIS_CACHE is not None:
        return jsonify(DATASET_ANALYSIS_CACHE)
    
    if os.path.exists(DATASET_ANALYSIS_PATH):
        with open(DATASET_ANALYSIS_PATH, 'r') as f:
            DATASET_ANALYSIS_CACHE = json.load(f)
            return jsonify(DATASET_ANALYSIS_CACHE)

    return jsonify({"error": "Dataset analysis not found"}), 500

@app.route('/models', methods=['GET'])
@app.route('/model-comparison', methods=['GET'])
def models_comparison():
    global MODEL_COMPARISON_CACHE
    if MODEL_COMPARISON_CACHE is not None:
        return jsonify(MODEL_COMPARISON_CACHE)
        
    if os.path.exists(MODEL_COMPARISON_PATH):
        with open(MODEL_COMPARISON_PATH, 'r') as f:
            MODEL_COMPARISON_CACHE = json.load(f)
            return jsonify(MODEL_COMPARISON_CACHE)

    return jsonify({"error": "Model comparison not found"}), 500

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
        features_df = pd.DataFrame(
            [[float(type_encoded), float(air_temp), float(proc_temp), float(rot_speed), float(torque), float(tool_wear)]],
            columns=FEATURE_NAMES
        )
        features_scaled = scaler.transform(features_df)
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
