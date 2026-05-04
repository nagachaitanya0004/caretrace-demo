import pytest
from app.api.routes import evaluate_risk

def test_evaluate_risk_empty():
    risk, reason, action = evaluate_risk([])
    assert risk == 'low'
    assert 'No symptom data provided' in reason

def test_evaluate_risk_high_severity():
    symptoms = [
        {"symptom": "Chest Pain", "severity": 9, "duration": 1}
    ]
    risk, reason, action = evaluate_risk(symptoms)
    assert risk == 'high'
    assert 'high risk' in reason.lower()

def test_evaluate_risk_critical_match():
    symptoms = [
        {"symptom": "slurred speech", "severity": 5, "duration": 1}
    ]
    risk, reason, action = evaluate_risk(symptoms)
    assert risk == 'high'
    assert 'critical anomalous' in reason.lower()

def test_evaluate_risk_trend_escalation():
    # Last 3 symptoms (most recent first) are high, overall avg is low
    symptoms = [
        {"symptom": "headache", "severity": 9, "date": "2024-01-03"},
        {"symptom": "headache", "severity": 8, "date": "2024-01-02"},
        {"symptom": "headache", "severity": 7, "date": "2024-01-01"},
        {"symptom": "headache", "severity": 2, "date": "2023-12-30"},
        {"symptom": "headache", "severity": 1, "date": "2023-12-29"},
    ]
    risk, reason, action = evaluate_risk(symptoms)
    # The trend should escalate the risk level
    assert 'accelerating severity' in reason or 'Upward severity trend' in reason
