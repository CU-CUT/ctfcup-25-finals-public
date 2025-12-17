#include "server.h"
#include "handlers.h"
#include "database.h"
#include <shlwapi.h>
#include <process.h>

static char g_shared_directory[MAX_PATH_LEN];
static User g_users[MAX_USERS];
static int g_user_count = 0;

static UserSession g_user_sessions[MAX_USERS];
static CRITICAL_SECTION g_sessions_lock;

char* get_shared_directory(void) {
    return g_shared_directory;
}

User* get_users(int* count) {
    if (count) *count = g_user_count;
    return g_users;
}

int server_init(const char* shared_dir, const char* db_path) {
    WSADATA wsa_data;
    if (WSAStartup(MAKEWORD(2, 2), &wsa_data) != 0) {
        fprintf(stderr, "WSAStartup failed\n");
        return -1;
    }
    
    char full_path[MAX_PATH_LEN];
    if (!GetFullPathNameA(shared_dir, MAX_PATH_LEN, full_path, NULL)) {
        fprintf(stderr, "Invalid shared directory\n");
        return -1;
    }
    
    strncpy(g_shared_directory, full_path, MAX_PATH_LEN - 1);
    
    size_t len = strlen(g_shared_directory);
    if (len > 0 && g_shared_directory[len-1] != '\\') {
        strcat(g_shared_directory, "\\");
    }
    
    if (crypto_init() != 0) {
        fprintf(stderr, "Crypto initialization failed\n");
        return -1;
    }
    
    if (db_init(db_path) != 0) {
        fprintf(stderr, "Database initialization failed\n");
        return -1;
    }
    
    g_user_count = db_get_users(g_users, MAX_USERS);
    if (g_user_count <= 0) {
        fprintf(stderr, "No users in database\n");
        return -1;
    }
    
    InitializeCriticalSection(&g_sessions_lock);
    memset(g_user_sessions, 0, sizeof(g_user_sessions));
    
    printf(":: Server initialized\n");
    printf(":: Shared directory: %s\n", g_shared_directory);
    printf(":: Loaded %d users\n", g_user_count);
    
    return 0;
}

void server_cleanup(void) {
    for (int i = 0; i < MAX_USERS; i++) {
        if (g_user_sessions[i].crypto) {
            crypto_context_free(g_user_sessions[i].crypto);
            HeapFree(GetProcessHeap(), 0, g_user_sessions[i].crypto);
            g_user_sessions[i].crypto = NULL;
        }
    }
    DeleteCriticalSection(&g_sessions_lock);
    crypto_cleanup();
    db_close();
    WSACleanup();
}

UserSession* get_user_session(const char* username) {
    EnterCriticalSection(&g_sessions_lock);
    
    for (int i = 0; i < MAX_USERS; i++) {
        if (g_user_sessions[i].ref_count > 0 && 
            strcmp(g_user_sessions[i].username, username) == 0) {
            g_user_sessions[i].ref_count++;
            LeaveCriticalSection(&g_sessions_lock);
            return &g_user_sessions[i];
        }
    }
    
    User* user = NULL;
    for (int i = 0; i < g_user_count; i++) {
        if (strcmp(g_users[i].username, username) == 0) {
            user = &g_users[i];
            break;
        }
    }
    
    if (!user) {
        LeaveCriticalSection(&g_sessions_lock);
        return NULL;
    }
    
    for (int i = 0; i < MAX_USERS; i++) {
        if (g_user_sessions[i].ref_count == 0) {
            strncpy(g_user_sessions[i].username, username, 63);
            g_user_sessions[i].ref_count = 1;
            g_user_sessions[i].path_validated = 0;
            g_user_sessions[i].current_filepath[0] = '\0';
            
            g_user_sessions[i].crypto = crypto_context_create(user->aes_key, user->key_size);
            if (!g_user_sessions[i].crypto) {
                fprintf(stderr, " Failed to create crypto context for %s\n", username);
            }
            
            LeaveCriticalSection(&g_sessions_lock);
            return &g_user_sessions[i];
        }
    }
    
    LeaveCriticalSection(&g_sessions_lock);
    return NULL;
}

void release_user_session(UserSession* session) {
    if (!session) return;
    EnterCriticalSection(&g_sessions_lock);
    if (session->ref_count > 0) {
        session->ref_count--;
    }
    LeaveCriticalSection(&g_sessions_lock);
}

int send_response(SOCKET sock, const char* data, int len) {
    return send(sock, data, len, 0);
}

int recv_command(SOCKET sock, char* buffer, int max_len) {
    memset(buffer, 0, max_len);
    int received = recv(sock, buffer, max_len - 1, 0);
    if (received > 0) {
        while (received > 0 && (buffer[received-1] == '\n' || buffer[received-1] == '\r')) {
            buffer[--received] = '\0';
        }
    }
    return received;
}

void send_user_menu(SOCKET sock) {
    char menu[2048];
    int offset = 0;
    
    offset += sprintf(menu + offset, "\r\n======== Welcome to SecTrans ========\r\n");
    offset += sprintf(menu + offset, "Choose your user:\r\n");
    
    for (int i = 0; i < g_user_count; i++) {
        offset += sprintf(menu + offset, "%d %s\r\n", i + 1, g_users[i].username);
    }
    offset += sprintf(menu + offset, "> ");
    
    send_response(sock, menu, offset);
}

void send_main_menu(SOCKET sock, const char* shared_dir) {
    char menu[512];
    snprintf(menu, sizeof(menu),
        "\r\n===== MENU =====\r\n"
        "Shared: %s\r\n"
        "- LIST [subdir]\r\n"
        "- GET  <file>\r\n"
        "- INFO <file>\r\n"
        "- SWITCH\r\n"
        "> ", shared_dir);
    send_response(sock, menu, strlen(menu));
}

int handle_client(SOCKET client_socket) {
    ClientContext ctx;
    memset(&ctx, 0, sizeof(ClientContext));
    ctx.client_socket = client_socket;
    strncpy(ctx.shared_directory, g_shared_directory, MAX_PATH_LEN - 1);
    
    send_user_menu(client_socket);
    
    char buffer[MAX_BUFFER];
    if (recv_command(client_socket, buffer, MAX_BUFFER) <= 0) {
        return -1;
    }
    
    int user_idx = atoi(buffer) - 1;
    if (user_idx < 0 || user_idx >= g_user_count) {
        User* user = db_get_user_by_name(buffer);
        if (!user) {
            const char* err = "ERROR: Invalid user\r\n";
            send_response(client_socket, err, strlen(err));
            return -1;
        }
        ctx.current_user = user;
    } else {
        ctx.current_user = &g_users[user_idx];
    }
    
    ctx.user_session = get_user_session(ctx.current_user->username);
    if (!ctx.user_session) {
        const char* err = "ERROR: Too many active sessions\r\n";
        send_response(client_socket, err, strlen(err));
        return -1;
    }
    
    ctx.authenticated = 1;
    
    char welcome[256];
    DWORD key_size = ctx.user_session->crypto ? ctx.user_session->crypto->key_size : 0;
    sprintf(welcome, "\r\n[+] Authenticated as: %s\r\n[+] Encryption key: %lu bytes\r\n", 
            ctx.current_user->username, key_size);
    send_response(client_socket, welcome, strlen(welcome));
    
    while (1) {
        send_main_menu(client_socket, ctx.shared_directory);
        
        if (recv_command(client_socket, buffer, MAX_BUFFER) <= 0) {
            break;
        }
        
        if (strncmp(buffer, "LIST", 4) == 0) {
            char* subdir = buffer + 4;
            while (*subdir == ' ') subdir++;
            handle_list(&ctx, strlen(subdir) > 0 ? subdir : NULL);
        }
        else if (strncmp(buffer, "GET ", 4) == 0) {
            char* filename = buffer + 4;
            while (*filename == ' ') filename++;
            handle_get(&ctx, filename);
        }
        else if (strncmp(buffer, "INFO ", 5) == 0) {
            char* filename = buffer + 5;
            while (*filename == ' ') filename++;
            handle_info(&ctx, filename);
        }
        else if (strncmp(buffer, "SWITCH", 6) == 0) {
            if (handle_switch(&ctx) != 0) {
                break;
            }
        }
        else if (strcmp(buffer, "EXIT") == 0 || strcmp(buffer, "QUIT") == 0) {
            const char* bye = "Goodbye!\r\n";
            send_response(client_socket, bye, strlen(bye));
            break;
        }
        else {
            const char* err = "ERROR: Unknown command\r\n";
            send_response(client_socket, err, strlen(err));
        }
    }
    
    release_user_session(ctx.user_session);
    return 0;
}

DWORD WINAPI client_thread(LPVOID param) {
    SOCKET client_socket = (SOCKET)(intptr_t)param;
    handle_client(client_socket);
    closesocket(client_socket);
    printf("[-] Client disconnected\n");
    return 0;
}

int server_run(void) {
    SOCKET server_socket = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (server_socket == INVALID_SOCKET) {
        fprintf(stderr, "Socket creation failed\n");
        return -1;
    }
    
    int opt = 1;
    setsockopt(server_socket, SOL_SOCKET, SO_REUSEADDR, (char*)&opt, sizeof(opt));
    
    struct sockaddr_in server_addr;
    server_addr.sin_family = AF_INET;
    server_addr.sin_addr.s_addr = INADDR_ANY;
    server_addr.sin_port = htons(SERVER_PORT);
    
    if (bind(server_socket, (struct sockaddr*)&server_addr, sizeof(server_addr)) == SOCKET_ERROR) {
        fprintf(stderr, "Bind failed: %d\n", WSAGetLastError());
        closesocket(server_socket);
        return -1;
    }
    
    if (listen(server_socket, 10) == SOCKET_ERROR) {
        fprintf(stderr, "Listen failed\n");
        closesocket(server_socket);
        return -1;
    }
    
    printf(":: Server listening on port %d\n", SERVER_PORT);
    printf(":: Waiting for connections...\n");
    
    while (1) {
        struct sockaddr_in client_addr;
        int client_len = sizeof(client_addr);
        
        SOCKET client_socket = accept(server_socket, (struct sockaddr*)&client_addr, &client_len);
        if (client_socket == INVALID_SOCKET) {
            fprintf(stderr, "Accept failed\n");
            continue;
        }
        
        char client_ip[INET_ADDRSTRLEN];
        inet_ntop(AF_INET, &client_addr.sin_addr, client_ip, INET_ADDRSTRLEN);
        printf("[+] Connection from %s:%d\n", client_ip, ntohs(client_addr.sin_port));
        
        HANDLE hThread = CreateThread(NULL, 0, client_thread, (LPVOID)(intptr_t)client_socket, 0, NULL);
        if (hThread) {
            CloseHandle(hThread);
        } else {
            closesocket(client_socket);
        }
    }
    
    closesocket(server_socket);
    return 0;
}
