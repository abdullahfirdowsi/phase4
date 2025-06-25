import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MongoDB Connection
mongo_uri = os.getenv("MONGO_URI")
print("INFO : MONGO URI", mongo_uri)
client = MongoClient(mongo_uri)

db = client["chat_db"]  # Database name
users_collection = db["users"]  # User collection
chats_collection = db["chats"]  # Chat history collection
