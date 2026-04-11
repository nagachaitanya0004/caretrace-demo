from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_read_main():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {
        "system": "CareTrace AI API",
        "status": "Online",
        "docs": "Access /docs for full API documentation"
    }
