from pymongo import MongoClient

client = MongoClient("mongodb://127.0.0.1:27017/")
db = client["caretrace_ai"]

# Drop the schema validation
db.command("collMod", "users", validator={}, validationLevel="off")
print("Validation dropped for users")

db.command("collMod", "symptoms", validator={}, validationLevel="off")
print("Validation dropped for symptoms")

