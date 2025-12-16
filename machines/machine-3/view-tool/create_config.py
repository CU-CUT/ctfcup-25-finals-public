import pickle
import base64

config = {
    'message': 'Конфигурация загружена!',
    'user': 't.belov',
    'timestamp': '2024-01-15T12:00:00',
}

with open('/tmp/6DF58AF8-E675-4466-85FC-595333EDAC4B.cfg', 'wb') as f:
    f.write(pickle.dumps(config))
