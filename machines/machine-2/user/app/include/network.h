#ifndef NETWORK_H
#define NETWORK_H

#include <winsock2.h>
#include <ws2tcpip.h>
#include <windows.h>

#define DEFAULT_PORT 9876
#define MAX_BUFFER 4096

int net_init(void);
void net_cleanup(void);

SOCKET net_create_server(int port);
SOCKET net_connect(const char* host, int port);
void net_close(SOCKET sock);

int net_send(SOCKET sock, const char* data, int len);
int net_recv(SOCKET sock, char* buffer, int max_len);
int net_recv_line(SOCKET sock, char* buffer, int max_len);
int net_recv_all(SOCKET sock, char* buffer, int max_len, int timeout_ms);

const char* net_get_peer_ip(SOCKET sock, char* buffer, int buffer_len);

#endif
