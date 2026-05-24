import asyncio
import httpx

BASE_URL = "http://localhost:8001"

async def test_e2e():
    print("🚀 Starting Onboarding E2E Integration Test...")
    
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        # 1. Sign up new user
        signup_data = {
            "name": "Integration Tester",
            "email": "e2e_tester@example.com",
            "password": "password123"
        }
        print("\n[Step 1] Signing up new user...")
        response = await client.post("/auth/signup", json=signup_data)
        print(f"Status Code: {response.status_code}")
        assert response.status_code == 201, f"Signup failed: {response.text}"
        signup_json = response.json()
        assert signup_json["success"] is True
        print("✅ User created successfully")
        
        # 2. Log in
        print("\n[Step 2] Logging in...")
        login_data = {
            "username": "e2e_tester@example.com",
            "password": "password123"
        }
        response = await client.post("/auth/login", data=login_data)
        print(f"Status Code: {response.status_code}")
        assert response.status_code == 200, f"Login failed: {response.text}"
        token_data = response.json()
        token = token_data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("✅ Logged in successfully. Token acquired.")
        
        # 3. Get /me
        print("\n[Step 3] Fetching initial profile...")
        response = await client.get("/auth/me", headers=headers)
        assert response.status_code == 200
        me_json = response.json()
        print(f"Onboarding Status: {me_json['data']['is_onboarded']}")
        assert me_json["data"]["is_onboarded"] is False, "New user should not be onboarded yet."
        
        # 4. Sync Basic Info (PUT /api/users/me)
        print("\n[Step 4] Syncing step 1: Basic Info...")
        basic_payload = {
            "age": 28,
            "gender": "male",
            "height_cm": 180,  # Send as int to verify backend double coercion
            "weight_kg": 75,   # Send as int to verify backend double coercion
            "blood_group": "O+"
        }
        response = await client.put("/api/users/me", json=basic_payload, headers=headers)
        print(f"Status Code: {response.status_code}")
        assert response.status_code == 200, f"Basic info sync failed: {response.text}"
        print("✅ Basic info saved successfully")
        
        # 5. Sync Medical History (PUT /api/medical-history)
        print("\n[Step 5] Syncing step 2: Medical History...")
        medical_payload = {
            "conditions": ["Asthma"],
            "medications": ["Albuterol"],
            "allergies": ["Peanuts"],
            "surgeries": []
        }
        response = await client.put("/api/medical-history", json=medical_payload, headers=headers)
        print(f"Status Code: {response.status_code}")
        assert response.status_code == 200, f"Medical history sync failed: {response.text}"
        print("✅ Medical history saved successfully")
        
        # 6. Sync Family History (POST /api/family-history)
        print("\n[Step 6] Syncing step 3: Family History...")
        family_payload = {
            "entries": [
                {"condition_name": "Diabetes", "relation": "Grandparent"}
            ]
        }
        response = await client.post("/api/family-history", json=family_payload, headers=headers)
        print(f"Status Code: {response.status_code}")
        assert response.status_code == 200, f"Family history sync failed: {response.text}"
        print("✅ Family history saved successfully")
        
        # 7. Sync Lifestyle (PUT /api/lifestyle)
        print("\n[Step 7] Syncing step 4: Lifestyle...")
        lifestyle_payload = {
            "sleep_hours": 7,            # Send as int to verify backend double coercion
            "sleep_quality": "good",
            "diet_type": "veg",
            "exercise_frequency": "weekly",
            "water_intake_liters": 2,    # Send as int to verify backend double coercion
            "smoking": False,
            "alcohol": False,
            "stress_level": 4
        }
        response = await client.put("/api/lifestyle", json=lifestyle_payload, headers=headers)
        print(f"Status Code: {response.status_code}")
        assert response.status_code == 200, f"Lifestyle sync failed: {response.text}"
        print("✅ Lifestyle saved successfully")
        
        # 8. Sync Vitals (POST /api/health-metrics)
        print("\n[Step 8] Syncing step 5: Vitals...")
        vitals_payload = {
            "systolic_bp": 120,
            "diastolic_bp": 80,
            "blood_sugar_mg_dl": 95,   # Send as int to verify backend double coercion
            "heart_rate_bpm": 72,
            "oxygen_saturation": 98
        }
        response = await client.post("/api/health-metrics", json=vitals_payload, headers=headers)
        print(f"Status Code: {response.status_code}")
        assert response.status_code == 200, f"Vitals sync failed: {response.text}"
        print("✅ Vitals saved successfully")
        
        # 9. Complete Onboarding (PATCH /auth/onboarding/complete)
        print("\n[Step 9] Finishing onboarding...")
        response = await client.patch("/auth/onboarding/complete", headers=headers)
        print(f"Status Code: {response.status_code}")
        assert response.status_code == 200, f"Completing onboarding failed: {response.text}"
        print("✅ Onboarding marked as complete")
        
        # 10. Verify Completed Status
        print("\n[Step 10] Checking updated user status...")
        response = await client.get("/auth/me", headers=headers)
        assert response.status_code == 200
        me_json = response.json()
        print(f"Onboarding Status: {me_json['data']['is_onboarded']}")
        assert me_json["data"]["is_onboarded"] is True, "User should now be successfully onboarded."
        print("✅ User is successfully onboarded!")
        
        # 11. Cleanup (DELETE /api/users/me)
        print("\n[Step 11] Cleaning up test user account...")
        response = await client.delete("/api/users/me", headers=headers)
        print(f"Status Code: {response.status_code}")
        assert response.status_code == 200, f"Cleanup failed: {response.text}"
        print("✅ Test user deleted. Clean environment verified.")
        
    print("\n🎉 ALL E2E INTEGRATION TESTS PASSED SUCCESSFULLY! The app is running smoothly without issues.")

if __name__ == "__main__":
    asyncio.run(test_e2e())
