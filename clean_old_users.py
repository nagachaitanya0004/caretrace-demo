from pymongo import MongoClient

client = MongoClient("mongodb://127.0.0.1:27017/")
db = client["caretrace_ai"]

result = db["users"].delete_many({"email": {"$exists": False}})
print(f"Deleted {result.deleted_count} stale users missing an email.")
