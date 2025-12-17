#ifndef SERVER_H
#define SERVER_H

#include <winsock2.h>
#include <ws2tcpip.h>
#include <windows.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "crypto.h"

#define SERVER_PORT 9876
#define MAX_BUFFER 4096
#define MAX_PATH_LEN 512
#define MAX_FILENAME 256
#define MAX_USERS 10

typedef struct {
    char username[64];
    BYTE aes_key[32];
    int key_size;
} User;

typedef struct {
    char username[64];
    int ref_count;
    char current_filepath[MAX_PATH_LEN];
    int path_validated;
    CryptoContext* crypto;
    char* request_cache;
} UserSession;

typedef struct {
    SOCKET client_socket;
    char shared_directory[MAX_PATH_LEN];
    User* current_user;
    UserSession* user_session;
    int authenticated;
} ClientContext;

/* Server lifecycle */
int server_init(const char* shared_dir, const char* db_path);
int server_run(void);
void server_cleanup(void);

/* Client handling */
DWORD WINAPI client_thread(LPVOID param);
int handle_client(SOCKET client_socket);

/* Network I/O */
int send_response(SOCKET sock, const char* data, int len);
int recv_command(SOCKET sock, char* buffer, int max_len);

/* Session management */
UserSession* get_user_session(const char* username);
void release_user_session(UserSession* session);

/* UI helpers */
void send_user_menu(SOCKET sock);
void send_main_menu(SOCKET sock, const char* shared_dir);

/* Accessors */
char* get_shared_directory(void);
User* get_users(int* count);

#endif
