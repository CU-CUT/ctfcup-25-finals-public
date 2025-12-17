#include "handlers.h"
#include "database.h"
#include <shlwapi.h>

int validate_path(const char* base_dir, const char* requested_file, char* resolved_path) {
    char combined[MAX_PATH_LEN];
    snprintf(combined, MAX_PATH_LEN, "%s%s", base_dir, requested_file);
    
    if (!PathCanonicalizeA(resolved_path, combined)) {
        return -1;
    }
    
    if (strstr(resolved_path, base_dir) != resolved_path) {
        return -1;
    }
    
    return 0;
}

int check_file_exists(const char* filepath) {
    DWORD attrs = GetFileAttributesA(filepath);
    if (attrs == INVALID_FILE_ATTRIBUTES) {
        return -1;
    }
    if (attrs & FILE_ATTRIBUTE_DIRECTORY) {
        return -1;
    }
    return 0;
}

int prepare_file_path(ClientContext* ctx, const char* filename) {
    UserSession* us = ctx->user_session;
    char combined[MAX_PATH_LEN];
    
    snprintf(combined, MAX_PATH_LEN, "%s%s", ctx->shared_directory, filename);
    
    if (!PathCanonicalizeA(us->current_filepath, combined)) {
        return -1;
    }
    
    return 0;
}

int verify_file_access(ClientContext* ctx) {
    UserSession* us = ctx->user_session;
    
    if (strstr(us->current_filepath, ctx->shared_directory) != us->current_filepath) {
        return -1;
    }
    
    if (check_file_exists(us->current_filepath) != 0) {
        return -1;
    }
    
    us->path_validated = 1;
    return 0;
}

int handle_list(ClientContext* ctx, const char* subdir) {
    WIN32_FIND_DATAA find_data;
    char search_path[MAX_PATH_LEN];
    char list_dir[MAX_PATH_LEN];
    
    if (subdir && strlen(subdir) > 0) {
        char validated_path[MAX_PATH_LEN];
        if (validate_path(ctx->shared_directory, subdir, validated_path) != 0) {
            const char* err = "ERROR: Invalid path\r\n";
            send_response(ctx->client_socket, err, strlen(err));
            return -1;
        }
        snprintf(list_dir, MAX_PATH_LEN, "%s\\", validated_path);
    } else {
        strncpy(list_dir, ctx->shared_directory, MAX_PATH_LEN - 1);
    }
    
    snprintf(search_path, MAX_PATH_LEN, "%s*", list_dir);
    
    HANDLE hFind = FindFirstFileA(search_path, &find_data);
    if (hFind == INVALID_HANDLE_VALUE) {
        const char* err = "ERROR: Cannot list directory\r\n";
        send_response(ctx->client_socket, err, strlen(err));
        return -1;
    }
    
    char response[MAX_BUFFER];
    int offset = 0;
    offset += sprintf(response + offset, "\r\nFiles in shared directory:\r\n");
    offset += sprintf(response + offset, "----------------------------\r\n");
    
    do {
        if (strcmp(find_data.cFileName, ".") == 0 || strcmp(find_data.cFileName, "..") == 0) {
            continue;
        }
        
        if (find_data.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY) {
            offset += sprintf(response + offset, "[DIR]  %s\r\n", find_data.cFileName);
        } else {
            LARGE_INTEGER fsize;
            fsize.LowPart = find_data.nFileSizeLow;
            fsize.HighPart = find_data.nFileSizeHigh;
            offset += sprintf(response + offset, "[FILE] %s (%lld bytes)\r\n", 
                find_data.cFileName, fsize.QuadPart);
        }
    } while (FindNextFileA(hFind, &find_data) && offset < MAX_BUFFER - 256);
    
    FindClose(hFind);
    
    offset += sprintf(response + offset, "----------------------------\r\n");
    send_response(ctx->client_socket, response, offset);
    
    return 0;
}

int handle_get(ClientContext* ctx, const char* filename) {
    UserSession* us = ctx->user_session;
    
    if (prepare_file_path(ctx, filename) != 0) {
        const char* err = "ERROR: Invalid path\r\n";
        send_response(ctx->client_socket, err, strlen(err));
        return -1;
    }
    
    if (verify_file_access(ctx) != 0) {
        const char* err = "ERROR: Access denied\r\n";
        send_response(ctx->client_socket, err, strlen(err));
        return -1;
    }
    
    DWORD fileAttrs = GetFileAttributesA(us->current_filepath);
    if (fileAttrs == INVALID_FILE_ATTRIBUTES) {
        const char* err = "ERROR: File not accessible\r\n";
        send_response(ctx->client_socket, err, strlen(err));
        return -1;
    }
    
    if (fileAttrs & (FILE_ATTRIBUTE_SYSTEM | FILE_ATTRIBUTE_HIDDEN)) {
        const char* err = "ERROR: Access denied\r\n";
        send_response(ctx->client_socket, err, strlen(err));
        return -1;
    }
    
    HANDLE hFile = CreateFileA(
        us->current_filepath,
        GENERIC_READ,
        FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
        NULL,
        OPEN_EXISTING,
        FILE_ATTRIBUTE_NORMAL,
        NULL
    );
    
    if (hFile == INVALID_HANDLE_VALUE) {
        const char* err = "ERROR: Cannot open file\r\n";
        send_response(ctx->client_socket, err, strlen(err));
        return -1;
    }
    
    LARGE_INTEGER file_size;
    GetFileSizeEx(hFile, &file_size);
    
    BYTE buffer[MAX_BUFFER];
    BYTE enc_buffer[MAX_BUFFER];
    DWORD bytes_read;
    
    char header[512];
    DWORD key_size = us->crypto ? us->crypto->key_size : 0;
    sprintf(header, "ENCRYPTED_FILE:%s:KEY_SIZE:%lu:FILE_SIZE:%lld\r\n", 
            filename, key_size, file_size.QuadPart);
    send_response(ctx->client_socket, header, strlen(header));
    
    if (us->crypto) {
        BYTE iv[AES_BLOCK_SIZE];
        DWORD iv_size = AES_BLOCK_SIZE;
        if (crypto_get_iv(us->crypto, iv, &iv_size) == 0) {
            char iv_header[64];
            sprintf(iv_header, "IV:");
            send_response(ctx->client_socket, iv_header, strlen(iv_header));
            send_response(ctx->client_socket, (char*)iv, iv_size);
            send_response(ctx->client_socket, "\r\n", 2);
        }
    }
    
    send_response(ctx->client_socket, "DATA:\r\n", 7);
    
    while (ReadFile(hFile, buffer, MAX_BUFFER, &bytes_read, NULL) && bytes_read > 0) {
        if (us->crypto) {
            DWORD enc_size = bytes_read;
            crypto_encrypt_buffer(us->crypto, buffer, bytes_read, enc_buffer, &enc_size);
            send_response(ctx->client_socket, (char*)enc_buffer, enc_size);
        } else {
            send_response(ctx->client_socket, (char*)buffer, bytes_read);
        }
    }
    
    CloseHandle(hFile);
    
    const char* footer = "\r\nFILE_END\r\n";
    send_response(ctx->client_socket, footer, strlen(footer));
    
    us->path_validated = 0;
    
    return 0;
}

int handle_info(ClientContext* ctx, const char* filename) {
    char validated_path[MAX_PATH_LEN];
    
    if (validate_path(ctx->shared_directory, filename, validated_path) != 0) {
        const char* err = "ERROR: Invalid path\r\n";
        send_response(ctx->client_socket, err, strlen(err));
        return -1;
    }
    
    WIN32_FILE_ATTRIBUTE_DATA file_attrs;
    if (!GetFileAttributesExA(validated_path, GetFileExInfoStandard, &file_attrs)) {
        const char* err = "ERROR: File not found\r\n";
        send_response(ctx->client_socket, err, strlen(err));
        return -1;
    }

    char* cache = (char*)HeapAlloc(GetProcessHeap(), 0, REQUEST_CACHE_SIZE);
    if (cache) {
        memset(cache, 0, REQUEST_CACHE_SIZE);
        strncpy(cache, filename, REQUEST_CACHE_SIZE - 1);
        
        SYSTEMTIME now;
        GetLocalTime(&now);
        
        FILE* audit = fopen("audit.log", "a");
        if (audit) {
            fprintf(audit, "[%04d-%02d-%02d %02d:%02d:%02d] user=%s INFO %s\n",
                    now.wYear, now.wMonth, now.wDay, 
                    now.wHour, now.wMinute, now.wSecond,
                    ctx->user_session->username, cache);
            fclose(audit);
        }
        HeapFree(GetProcessHeap(), 0, cache);
    }
    
    LARGE_INTEGER file_size;
    file_size.LowPart = file_attrs.nFileSizeLow;
    file_size.HighPart = file_attrs.nFileSizeHigh;
    
    SYSTEMTIME st;
    FileTimeToSystemTime(&file_attrs.ftLastWriteTime, &st);
    
    char response[512];
    sprintf(response, 
        "\r\nFile: %s\r\n"
        "Size: %lld bytes\r\n"
        "Modified: %04d-%02d-%02d %02d:%02d:%02d\r\n"
        "Attributes: %s%s%s\r\n",
        filename,
        file_size.QuadPart,
        st.wYear, st.wMonth, st.wDay, st.wHour, st.wMinute, st.wSecond,
        (file_attrs.dwFileAttributes & FILE_ATTRIBUTE_READONLY) ? "ReadOnly " : "",
        (file_attrs.dwFileAttributes & FILE_ATTRIBUTE_HIDDEN) ? "Hidden " : "",
        (file_attrs.dwFileAttributes & FILE_ATTRIBUTE_SYSTEM) ? "System " : ""
    );
    
    send_response(ctx->client_socket, response, strlen(response));
    
    return 0;
}

int handle_switch(ClientContext* ctx) {
    UserSession* old_session = ctx->user_session;
    
    if (old_session->crypto) {
        crypto_context_free(old_session->crypto);
    }
    
    release_user_session(old_session);
    ctx->user_session = NULL;
    
    send_user_menu(ctx->client_socket);
    
    char buffer[MAX_BUFFER];
    if (recv_command(ctx->client_socket, buffer, MAX_BUFFER) <= 0) {
        return -1;
    }
    
    int user_count;
    User* users = get_users(&user_count);
    
    int user_idx = atoi(buffer) - 1;
    User* new_user = NULL;
    
    if (user_idx < 0 || user_idx >= user_count) {
        new_user = db_get_user_by_name(buffer);
        if (!new_user) {
            const char* err = "ERROR: Invalid user\r\n";
            send_response(ctx->client_socket, err, strlen(err));
            return -1;
        }
    } else {
        new_user = &users[user_idx];
    }
    
    ctx->current_user = new_user;
    ctx->user_session = get_user_session(new_user->username);
    
    if (!ctx->user_session) {
        const char* err = "ERROR: Cannot create session\r\n";
        send_response(ctx->client_socket, err, strlen(err));
        return -1;
    }
    
    char welcome[128];
    sprintf(welcome, "\r\n[+] Switched to: %s\r\n", new_user->username);
    send_response(ctx->client_socket, welcome, strlen(welcome));
    
    return 0;
}
