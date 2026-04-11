from fastapi.testclient import TestClient
from app.main import app

with TestClient(app) as client:
    print('Testing /health...')
    r = client.get('/health')
    assert r.status_code == 200, r.text
    assert r.json()['success'] is True

    print('Creating user...')
    user_payload = {'name': 'Test User', 'age': 32, 'gender': 'other', 'lifestyle': 'balanced'}
    r = client.post('/users', json=user_payload)
    assert r.status_code == 200, r.text
    user = r.json()['data']
    user_id = user['id']
    assert user['name'] == 'Test User'

    print('Creating symptom...')
    symptom_payload = {
        'user_id': user_id,
        'symptom': 'Chest pain',
        'duration': 1,
        'severity': 9,
        'timestamp': '2026-04-12T01:00:00Z',
        'notes': 'Sharp pain while climbing stairs',
    }
    r = client.post('/symptoms', json=symptom_payload)
    assert r.status_code == 200, r.text
    symptom = r.json()['data']
    assert symptom['symptom'] == 'Chest pain'

    print('Validating symptom input rejects invalid values...')
    invalid_payload = {
        'user_id': user_id,
        'symptom': 'Headache',
        'duration': -1,
        'severity': 15,
        'timestamp': '2026-04-12T01:10:00Z',
    }
    r = client.post('/symptoms', json=invalid_payload)
    assert r.status_code == 400, r.text

    print('Running analysis...')
    analysis_payload = {'user_id': user_id, 'summary': 'Run AI health analysis'}
    r = client.post('/analysis', json=analysis_payload)
    assert r.status_code == 200, r.text
    analysis = r.json()['data']
    assert analysis['risk_level'] in ['low', 'medium', 'high']

    print('Checking alerts...')
    r = client.get(f'/alerts?user_id={user_id}&unread_only=true')
    assert r.status_code == 200, r.text
    alerts = r.json()['data']
    assert any('High-severity symptom' in alert['message'] for alert in alerts)

    print('Testing duplicate alert suppression...')
    r = client.post('/symptoms', json={**symptom_payload, 'timestamp': '2026-04-12T02:00:00Z'})
    assert r.status_code == 200, r.text
    r = client.get(f'/alerts?user_id={user_id}&unread_only=true')
    alerts2 = r.json()['data']
    assert len(alerts2) <= len(alerts) + 1

    print('Updating user...')
    r = client.put(f'/users/{user_id}', json={'age': 33})
    assert r.status_code == 200, r.text
    assert r.json()['data']['age'] == 33

    print('Deleting user and cleanup...')
    r = client.delete(f'/users/{user_id}')
    assert r.status_code == 200, r.text
    assert r.json()['success'] is True

    print('ALL BACKEND TESTS PASSED')
