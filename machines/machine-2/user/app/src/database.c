#include "database.h"
#include <string.h>
#include <stdio.h>

static sqlite3* db = NULL;
static User cached_users[MAX_USERS];
static int cached_user_count = 0;

int db_init(const char* db_path) {
    if (sqlite3_open(db_path, &db) != SQLITE_OK) {
        fprintf(stderr, "Cannot open database: %s\n", sqlite3_errmsg(db));
        return -1;
    }
    
    const char* check = "SELECT COUNT(*) FROM users;";
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(db, check, -1, &stmt, NULL) != SQLITE_OK) {
        fprintf(stderr, "Database not initialized! Pupupu\n");
        sqlite3_close(db);
        db = NULL;
        return -1;
    }
    sqlite3_finalize(stmt);
    
    return 0;
}

void db_close(void) {
    if (db) {
        sqlite3_close(db);
        db = NULL;
    }
}

int db_get_users(User* users, int max_users) {
    const char* sql = "SELECT username, aes_key, key_size FROM users LIMIT ?;";
    sqlite3_stmt* stmt;
    
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, NULL) != SQLITE_OK) {
        return -1;
    }
    
    sqlite3_bind_int(stmt, 1, max_users);
    
    int count = 0;
    while (sqlite3_step(stmt) == SQLITE_ROW && count < max_users) {
        strncpy(users[count].username, (const char*)sqlite3_column_text(stmt, 0), 63);
        const void* key_blob = sqlite3_column_blob(stmt, 1);
        int key_len = sqlite3_column_bytes(stmt, 1);
        if (key_len > 32) key_len = 32;
        memcpy(users[count].aes_key, key_blob, key_len);
        users[count].key_size = key_len;
        count++;
    }
    
    sqlite3_finalize(stmt);
    
    memcpy(cached_users, users, sizeof(User) * count);
    cached_user_count = count;
    
    return count;
}

User* db_get_user_by_name(const char* username) {
    for (int i = 0; i < cached_user_count; i++) {
        if (strcmp(cached_users[i].username, username) == 0) {
            return &cached_users[i];
        }
    }
    
    const char* sql = "SELECT username, aes_key, key_size FROM users WHERE username = ?;";
    sqlite3_stmt* stmt;
    
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, NULL) != SQLITE_OK) {
        return NULL;
    }
    
    sqlite3_bind_text(stmt, 1, username, -1, SQLITE_STATIC);
    
    User* result = NULL;
    if (sqlite3_step(stmt) == SQLITE_ROW && cached_user_count < MAX_USERS) {
        int idx = cached_user_count++;
        strncpy(cached_users[idx].username, (const char*)sqlite3_column_text(stmt, 0), 63);
        const void* key_blob = sqlite3_column_blob(stmt, 1);
        int key_len = sqlite3_column_bytes(stmt, 1);
        if (key_len > 32) key_len = 32;
        memcpy(cached_users[idx].aes_key, key_blob, key_len);
        cached_users[idx].key_size = key_len;
        result = &cached_users[idx];
    }
    
    sqlite3_finalize(stmt);
    return result;
}
