#ifndef CLIENT_H
#define CLIENT_H

#include <winsock2.h>
#include <windows.h>

#define CLIENT_BUFFER_SIZE 8192

typedef struct {
    SOCKET socket;
    char host[256];
    int port;
    char username[64];
    int authenticated;
    char last_error[256];
    char key_file[512];
    unsigned char key[32];
    int key_loaded;
} ClientSession;

int client_init(void);
void client_cleanup(void);

ClientSession* client_connect(const char* host, int port);
void client_disconnect(ClientSession* session);

int client_authenticate(ClientSession* session, const char* username);
int client_list(ClientSession* session);
int client_get(ClientSession* session, const char* filename, const char* output_path);
int client_info(ClientSession* session, const char* filename);

int client_load_key(ClientSession* session, const char* key_file);
void client_set_key(ClientSession* session, const char* key_file);

int client_interactive(const char* host, int port);
int client_interactive_with_key(const char* host, int port, const char* key_file);

#endif
