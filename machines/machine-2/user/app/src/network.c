#include "network.h"
#include <stdio.h>

static int g_wsa_initialized = 0;

int net_init(void) {
    if (g_wsa_initialized) return 0;
    
    WSADATA wsa_data;
    if (WSAStartup(MAKEWORD(2, 2), &wsa_data) != 0) {
        fprintf(stderr, " WSAStartup failed: %d\n", WSAGetLastError());
        return -1;
    }
    
    g_wsa_initialized = 1;
    return 0;
}

void net_cleanup(void) {
    if (g_wsa_initialized) {
        WSACleanup();
        g_wsa_initialized = 0;
    }
}

SOCKET net_create_server(int port) {
    SOCKET server_socket = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (server_socket == INVALID_SOCKET) {
        fprintf(stderr, " Socket creation failed: %d\n", WSAGetLastError());
        return INVALID_SOCKET;
    }
    
    int opt = 1;
    setsockopt(server_socket, SOL_SOCKET, SO_REUSEADDR, (char*)&opt, sizeof(opt));
    
    struct sockaddr_in server_addr;
    server_addr.sin_family = AF_INET;
    server_addr.sin_addr.s_addr = INADDR_ANY;
    server_addr.sin_port = htons((u_short)port);
    
    if (bind(server_socket, (struct sockaddr*)&server_addr, sizeof(server_addr)) == SOCKET_ERROR) {
        fprintf(stderr, " Bind failed: %d\n", WSAGetLastError());
        closesocket(server_socket);
        return INVALID_SOCKET;
    }
    
    if (listen(server_socket, SOMAXCONN) == SOCKET_ERROR) {
        fprintf(stderr, " Listen failed: %d\n", WSAGetLastError());
        closesocket(server_socket);
        return INVALID_SOCKET;
    }
    
    return server_socket;
}

SOCKET net_connect(const char* host, int port) {
    SOCKET sock = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (sock == INVALID_SOCKET) {
        fprintf(stderr, " Socket creation failed: %d\n", WSAGetLastError());
        return INVALID_SOCKET;
    }
    
    struct sockaddr_in server_addr;
    server_addr.sin_family = AF_INET;
    server_addr.sin_port = htons((u_short)port);
    
    /* Try to parse as IP address first */
    if (inet_pton(AF_INET, host, &server_addr.sin_addr) != 1) {
        /* Try DNS resolution */
        struct hostent* he = gethostbyname(host);
        if (!he) {
            fprintf(stderr, " Cannot resolve hostname: %s\n", host);
            closesocket(sock);
            return INVALID_SOCKET;
        }
        memcpy(&server_addr.sin_addr, he->h_addr_list[0], he->h_length);
    }
    
    if (connect(sock, (struct sockaddr*)&server_addr, sizeof(server_addr)) == SOCKET_ERROR) {
        fprintf(stderr, " Connection failed: %d\n", WSAGetLastError());
        closesocket(sock);
        return INVALID_SOCKET;
    }
    
    return sock;
}

void net_close(SOCKET sock) {
    if (sock != INVALID_SOCKET) {
        closesocket(sock);
    }
}

int net_send(SOCKET sock, const char* data, int len) {
    int total_sent = 0;
    while (total_sent < len) {
        int sent = send(sock, data + total_sent, len - total_sent, 0);
        if (sent == SOCKET_ERROR) {
            return -1;
        }
        total_sent += sent;
    }
    return total_sent;
}

int net_recv(SOCKET sock, char* buffer, int max_len) {
    return recv(sock, buffer, max_len, 0);
}

int net_recv_line(SOCKET sock, char* buffer, int max_len) {
    int received = 0;
    
    while (received < max_len - 1) {
        char c;
        int r = recv(sock, &c, 1, 0);
        if (r <= 0) {
            break;
        }
        
        if (c == '\n') {
            break;
        }
        
        if (c != '\r') {
            buffer[received++] = c;
        }
    }
    
    buffer[received] = '\0';
    return received;
}

int net_recv_all(SOCKET sock, char* buffer, int max_len, int timeout_ms) {
    /* Set receive timeout */
    DWORD timeout = (DWORD)timeout_ms;
    setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, (char*)&timeout, sizeof(timeout));
    
    int total = 0;
    while (total < max_len) {
        int r = recv(sock, buffer + total, max_len - total, 0);
        if (r <= 0) {
            break;
        }
        total += r;
    }
    
    /* Reset timeout */
    timeout = 0;
    setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, (char*)&timeout, sizeof(timeout));
    
    return total;
}

const char* net_get_peer_ip(SOCKET sock, char* buffer, int buffer_len) {
    struct sockaddr_in peer_addr;
    int peer_len = sizeof(peer_addr);
    
    if (getpeername(sock, (struct sockaddr*)&peer_addr, &peer_len) == 0) {
        inet_ntop(AF_INET, &peer_addr.sin_addr, buffer, buffer_len);
        return buffer;
    }
    
    return "unknown";
}
