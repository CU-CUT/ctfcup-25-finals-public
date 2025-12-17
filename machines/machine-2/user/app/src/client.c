#include "client.h"
#include "network.h"
#include <stdio.h>
#include <string.h>
#include <conio.h>

#define MAX_HISTORY 50
#define MAX_CMD_LEN 512

static char cmd_history[MAX_HISTORY][MAX_CMD_LEN];
static int history_count = 0;
static int history_pos = 0;

// Stream cipher decryption (same as server)
static void expand_keystream(const unsigned char* key, int key_len, const unsigned char* iv, 
                            unsigned char* keystream, int stream_len) {
    unsigned char state[256];
    for (int i = 0; i < 256; i++) {
        state[i] = (unsigned char)i;
    }
    
    // Key scheduling
    int j = 0;
    for (int i = 0; i < 256; i++) {
        j = (j + state[i] + key[i % key_len] + iv[i % 16]) % 256;
        unsigned char temp = state[i];
        state[i] = state[j];
        state[j] = temp;
    }
    
    // Generate keystream
    int i = 0, k = 0;
    for (int pos = 0; pos < stream_len; pos++) {
        i = (i + 1) % 256;
        k = (k + state[i]) % 256;
        unsigned char temp = state[i];
        state[i] = state[k];
        state[k] = temp;
        keystream[pos] = state[(state[i] + state[k]) % 256];
    }
}

static void add_to_history(const char* cmd) {
    if (strlen(cmd) == 0) return;
    
    if (history_count > 0 && strcmp(cmd_history[(history_count - 1) % MAX_HISTORY], cmd) == 0) {
        return;
    }
    
    strncpy(cmd_history[history_count % MAX_HISTORY], cmd, MAX_CMD_LEN - 1);
    cmd_history[history_count % MAX_HISTORY][MAX_CMD_LEN - 1] = '\0';
    history_count++;
}

static int read_line_with_history(char* buffer, int max_len) {
    int pos = 0;
    int current_history = history_count;
    char temp_buffer[MAX_CMD_LEN] = {0};
    
    while (1) {
        if (_kbhit()) {
            int ch = _getch();
            if (ch == 224 || ch == 0) {
                ch = _getch();
                
                if (ch == 72) { //UP arrow
                    if (current_history > 0) {
                        current_history--;
                        int hist_idx = current_history % MAX_HISTORY;
                        if (current_history < history_count && current_history >= (history_count > MAX_HISTORY ? history_count - MAX_HISTORY : 0)) {

                            while (pos > 0) {
                                printf("\b \b");
                                pos--;
                            }
                        
                            strcpy(buffer, cmd_history[hist_idx]);
                            pos = strlen(buffer);
                            printf("%s", buffer);
                            fflush(stdout);
                        } else {
                            current_history++;
                        }
                    }
                }
                else if (ch == 80) { // DOWN arrow 
                    if (current_history < history_count) {
                        current_history++;

                        while (pos > 0) {
                            printf("\b \b");
                            pos--;
                        }
                        if (current_history < history_count) {
                            int hist_idx = current_history % MAX_HISTORY;
                            strcpy(buffer, cmd_history[hist_idx]);
                            pos = strlen(buffer);
                            printf("%s", buffer);
                        } else {
                            buffer[0] = '\0';
                            pos = 0;
                        }
                        fflush(stdout);
                    }
                }
                continue;
            }
            
            if (ch == '\r' || ch == '\n') {
                buffer[pos] = '\0';
                printf("\n");
                return pos;
            }
            
            if (ch == '\b' || ch == 127) {
                if (pos > 0) {
                    pos--;
                    printf("\b \b");
                    fflush(stdout);
                }
                continue;
            }
            if (ch >= 32 && ch < 127 && pos < max_len - 1) {
                buffer[pos++] = ch;
                printf("%c", ch);
                fflush(stdout);
            }
        }
    }
    
    return pos;
}

static int recv_until_prompt(SOCKET sock, char* buffer, int max_len) {
    int total = 0;
    DWORD timeout = 5000;
    setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, (char*)&timeout, sizeof(timeout));
    
    while (total < max_len - 1) {
        int r = recv(sock, buffer + total, 1, 0);
        if (r <= 0) break;
        total++;

        if (total >= 2 && buffer[total-2] == '>' && buffer[total-1] == ' ') {
            break;
        }
    }
    
    buffer[total] = '\0';
    return total;
}

static int recv_until_marker(SOCKET sock, char* buffer, int max_len, const char* marker) {
    int total = 0;
    int marker_len = (int)strlen(marker);
    DWORD timeout = 10000;
    setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, (char*)&timeout, sizeof(timeout));
    
    while (total < max_len - 1) {
        int r = recv(sock, buffer + total, 1, 0);
        if (r <= 0) break;
        total++;
        
        if (total >= marker_len) {
            if (memcmp(buffer + total - marker_len, marker, marker_len) == 0) {
                break;
            }
        }
    }
    
    buffer[total] = '\0';
    return total;
}

int client_init(void) {
    return net_init();
}

void client_cleanup(void) {
    net_cleanup();
}

ClientSession* client_connect(const char* host, int port) {
    SOCKET sock = net_connect(host, port);
    if (sock == INVALID_SOCKET) {
        return NULL;
    }
    
    ClientSession* session = (ClientSession*)HeapAlloc(
        GetProcessHeap(), HEAP_ZERO_MEMORY, sizeof(ClientSession));
    
    if (!session) {
        net_close(sock);
        return NULL;
    }
    
    session->socket = sock;
    strncpy(session->host, host, 255);
    session->port = port;
    session->authenticated = 0;
    
    return session;
}

void client_disconnect(ClientSession* session) {
    if (session) {
        if (session->socket != INVALID_SOCKET) {
            net_close(session->socket);
        }
        HeapFree(GetProcessHeap(), 0, session);
    }
}

int client_authenticate(ClientSession* session, const char* username) {
    if (!session || session->socket == INVALID_SOCKET) {
        return -1;
    }
    
    char buffer[CLIENT_BUFFER_SIZE];
    

    recv_until_prompt(session->socket, buffer, CLIENT_BUFFER_SIZE);
    

    char cmd[128];
    snprintf(cmd, sizeof(cmd), "%s\n", username);
    net_send(session->socket, cmd, (int)strlen(cmd));
    
    recv_until_prompt(session->socket, buffer, CLIENT_BUFFER_SIZE);
    
    if (strstr(buffer, "[+] Authenticated") || strstr(buffer, "MENU")) {
        strncpy(session->username, username, 63);
        session->authenticated = 1;
        return 0;
    }
    
    strncpy(session->last_error, "Authentication failed", 255);
    return -1;
}

int client_list(ClientSession* session) {
    if (!session || !session->authenticated) {
        return -1;
    }
    
    net_send(session->socket, "LIST\n", 5);
    
    char buffer[CLIENT_BUFFER_SIZE];
    recv_until_prompt(session->socket, buffer, CLIENT_BUFFER_SIZE);

    char* end = strstr(buffer, "\r\n===== MENU");
    if (end) *end = '\0';
    
    printf("%s", buffer);
    return 0;
}

int client_get(ClientSession* session, const char* filename, const char* output_path) {
    if (!session || !session->authenticated) {
        return -1;
    }
    
    char cmd[512];
    snprintf(cmd, sizeof(cmd), "GET %s\n", filename);
    net_send(session->socket, cmd, (int)strlen(cmd));

    char* buffer = (char*)HeapAlloc(GetProcessHeap(), 0, 1024 * 1024);
    if (!buffer) {
        fprintf(stderr, " Memory allocation failed\n");
        return -1;
    }
    
    int received = recv_until_marker(session->socket, buffer, 1024 * 1024, "FILE_END\r\n");
    
    if (received <= 0) {
        fprintf(stderr, " No data received\n");
        HeapFree(GetProcessHeap(), 0, buffer);
        return -1;
    }
    
    if (strstr(buffer, "ERROR:")) {
        char* err = strstr(buffer, "ERROR:");
        char* err_end = strstr(err, "\r\n");
        if (err_end) *err_end = '\0';
        printf(" Server: %s\n", err);
        HeapFree(GetProcessHeap(), 0, buffer);
        return -1;
    }
    
    char* enc_header = strstr(buffer, "ENCRYPTED_FILE:");
    if (!enc_header) {
        fprintf(stderr, " No encrypted file header found\n");
        HeapFree(GetProcessHeap(), 0, buffer);
        return -1;
    }
    
    unsigned char iv[16] = {0};
    char* iv_marker = strstr(enc_header, "IV:");
    if (iv_marker) {
        memcpy(iv, iv_marker + 3, 16);
    }
    
    /* Find DATA section */
    char* data_marker = strstr(enc_header, "DATA:\r\n");
    if (!data_marker) {
        fprintf(stderr, " No DATA section found\n");
        HeapFree(GetProcessHeap(), 0, buffer);
        return -1;
    }
    
    char* data_start = data_marker + 7; /* Skip "DATA:\r\n" */
    char* data_end = strstr(data_start, "\r\nFILE_END");
    if (!data_end) {
        data_end = buffer + received;
    }
    
    int data_len = (int)(data_end - data_start);
    
    if (!session->key_loaded) {
        printf(":: Encrypted file: %s\n", filename);
        printf(":: Data size: %d bytes\n", data_len);
        printf(":: IV: ");
        for (int i = 0; i < 16; i++) printf("%02x", iv[i]);
        printf("\n");
    }
    
    /* Decrypt if key is loaded */
    unsigned char* decrypted = NULL;
    if (session->key_loaded) {
        decrypted = (unsigned char*)HeapAlloc(GetProcessHeap(), 0, data_len);
        if (decrypted) {
            // Generate keystream and decrypt
            unsigned char* keystream = (unsigned char*)HeapAlloc(GetProcessHeap(), 0, data_len);
            if (keystream) {
                expand_keystream(session->key, 32, iv, keystream, data_len);
                for (int i = 0; i < data_len; i++) {
                    decrypted[i] = (unsigned char)data_start[i] ^ keystream[i];
                }
                HeapFree(GetProcessHeap(), 0, keystream);
            } else {
                HeapFree(GetProcessHeap(), 0, decrypted);
                decrypted = NULL;
            }
        }
    }
    
    const char* out_file = output_path ? output_path : filename;
    char out_path[512];
    FILE* fp;
    
    if (decrypted) {
        strncpy(out_path, out_file, sizeof(out_path) - 1);
        out_path[sizeof(out_path) - 1] = '\0';
        fp = fopen(out_path, "wb");
        if (fp) {
            fwrite(decrypted, 1, data_len, fp);
            fclose(fp);
            printf("FILE %s SUCCESSFULLY DOWNLOADED\n", filename);
        } else {
            printf("FAILED TO DOWNLOAD THE FILE %s\n", filename);
        }
        HeapFree(GetProcessHeap(), 0, decrypted);
    } else {
        snprintf(out_path, sizeof(out_path), "%s.enc", out_file);
        fp = fopen(out_path, "wb");
        if (fp) {
            fwrite(data_start, 1, data_len, fp);
            fclose(fp);
            printf("[+] Saved encrypted: %s\n", out_path);
        }
    }
    
    HeapFree(GetProcessHeap(), 0, buffer);

    char prompt[512];
    recv_until_prompt(session->socket, prompt, 512);
    
    return 0;
}

int client_info(ClientSession* session, const char* filename) {
    if (!session || !session->authenticated) {
        return -1;
    }
    
    char cmd[512];
    snprintf(cmd, sizeof(cmd), "INFO %s\n", filename);
    net_send(session->socket, cmd, (int)strlen(cmd));
    
    char buffer[CLIENT_BUFFER_SIZE];
    recv_until_prompt(session->socket, buffer, CLIENT_BUFFER_SIZE);
    
    char* end = strstr(buffer, "\r\n===== MENU");
    if (end) *end = '\0';
    
    printf("%s", buffer);
    return 0;
}

static void print_client_help(void) {
    printf("\n");
    printf("Available commands:\n");
    printf("  list              - List files in shared directory\n");
    printf("  get <file>        - Download encrypted file\n");
    printf("  info <file>       - Get file information\n");
    printf("  key <file>        - Set AES key for decryption\n");
    printf("  switch            - Switch user\n");
    printf("  help              - Show this help\n");
    printf("  exit              - Disconnect and exit\n");
    printf("\n");
}

void client_set_key(ClientSession* session, const char* key_file) {
    if (session && key_file) {
        strncpy(session->key_file, key_file, sizeof(session->key_file) - 1);
        session->key_file[sizeof(session->key_file) - 1] = '\0';
        
        if (client_load_key(session, key_file) != 0) {
            fprintf(stderr, " Failed to load key: %s\n", key_file);
        }
    }
}

int client_load_key(ClientSession* session, const char* key_file) {
    if (!session || !key_file) return -1;
    
    FILE* fp = fopen(key_file, "rb");
    if (!fp) {
        fprintf(stderr, " Cannot open key file: %s\n", key_file);
        return -1;
    }
    
    size_t read_bytes = fread(session->key, 1, 32, fp);
    fclose(fp);
    
    if (read_bytes != 32) {
        fprintf(stderr, " Invalid key file size: %zu (expected 32)\n", read_bytes);
        return -1;
    }
    
    session->key_loaded = 1;
    return 0;
}

int client_interactive_with_key(const char* host, int port, const char* key_file) {
    printf("\n");
    printf("========================================\n");
    printf("  SecTrans Client - Interactive Mode\n");
    printf("========================================\n\n");
    
    if (key_file) {
        printf(":: Using AES key: %s\n", key_file);
    }
    
    printf(":: Connecting to %s:%d...\n", host, port);
    
    ClientSession* session = client_connect(host, port);
    if (!session) {
        fprintf(stderr, "Connection failed\n");
        return -1;
    }
    
    if (key_file) {
        if (client_load_key(session, key_file) != 0) {
            client_disconnect(session);
            return -1;
        }
        strncpy(session->key_file, key_file, sizeof(session->key_file) - 1);
        session->key_file[sizeof(session->key_file) - 1] = '\0';
    }
    
    printf("[+] Connected!\n\n");
    
    char buffer[CLIENT_BUFFER_SIZE];
    recv_until_prompt(session->socket, buffer, CLIENT_BUFFER_SIZE);
    
    printf("%s", buffer);
    
    char input[256];
    if (!fgets(input, sizeof(input), stdin)) {
        client_disconnect(session);
        return -1;
    }
    input[strcspn(input, "\r\n")] = 0;
    
    char cmd[256];
    snprintf(cmd, sizeof(cmd), "%s\n", input);
    net_send(session->socket, cmd, (int)strlen(cmd));
    
    /* Receive response */
    recv_until_prompt(session->socket, buffer, CLIENT_BUFFER_SIZE);
    
    if (strstr(buffer, "ERROR:")) {
        printf("%s\n", buffer);
        client_disconnect(session);
        return -1;
    }
    
    char* auth_msg = strstr(buffer, "Authenticated as:");
    if (auth_msg) {
        char* name_start = auth_msg + 18;
        char* name_end = strstr(name_start, "\r\n");
        if (name_end) {
            int name_len = (int)(name_end - name_start);
            if (name_len > 63) name_len = 63;
            strncpy(session->username, name_start, name_len);
            session->username[name_len] = '\0';
        }
    }
    
    session->authenticated = 1;
    
    printf("\n[+] Logged in as: %s\n", session->username);
    print_client_help();
    
    while (1) {
        printf("\nsectrans> ");
        fflush(stdout);
        
        read_line_with_history(input, sizeof(input));
        
        if (strlen(input) == 0) {
            continue;
        }
        
        add_to_history(input);
        
        if (strcmp(input, "exit") == 0 || strcmp(input, "quit") == 0) {
            printf(":: Disconnecting...\n");
            break;
        }
        else if (strcmp(input, "help") == 0 || strcmp(input, "?") == 0) {
            print_client_help();
        }
        else if (strcmp(input, "list") == 0) {
            client_list(session);
        }
        else if (strncmp(input, "get ", 4) == 0) {
            char* filename = input + 4;
            while (*filename == ' ') filename++;
            if (strlen(filename) > 0) {
                client_get(session, filename, NULL);
            } else {
                printf("Usage: get <filename>\n");
            }
        }
        else if (strncmp(input, "key ", 4) == 0) {
            char* keypath = input + 4;
            while (*keypath == ' ') keypath++;
            if (strlen(keypath) > 0) {
                client_set_key(session, keypath);
            } else {
                printf("Usage: key <path_to_private_key>\n");
            }
        }
        else if (strncmp(input, "info ", 5) == 0) {
            char* filename = input + 5;
            while (*filename == ' ') filename++;
            if (strlen(filename) > 0) {
                client_info(session, filename);
            } else {
                printf("Usage: info <filename>\n");
            }
        }
        else if (strcmp(input, "switch") == 0) {
            net_send(session->socket, "SWITCH\n", 7);
            recv_until_prompt(session->socket, buffer, CLIENT_BUFFER_SIZE);
            printf("%s", buffer);
            
            printf("Select user: ");
            if (fgets(input, sizeof(input), stdin)) {
                input[strcspn(input, "\r\n")] = 0;
                snprintf(cmd, sizeof(cmd), "%s\n", input);
                net_send(session->socket, cmd, (int)strlen(cmd));
                recv_until_prompt(session->socket, buffer, CLIENT_BUFFER_SIZE);
                
                char* switch_msg = strstr(buffer, "Switched to:");
                if (switch_msg) {
                    printf("[+] %s\n", switch_msg);
                } else {
                    printf("%s", buffer);
                }
            }
        }
        else {
            printf("Unknown command. Type 'help' for available commands.\n");
        }
    }
    
    client_disconnect(session);
    printf("[+] Disconnected.\n");
    
    return 0;
}

int client_interactive(const char* host, int port) {
    return client_interactive_with_key(host, port, NULL);
}
