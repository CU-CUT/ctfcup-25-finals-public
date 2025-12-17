#ifndef DATABASE_H
#define DATABASE_H

#include "sqlite3.h"
#include "server.h"

int db_init(const char* db_path);
void db_close(void);
int db_get_users(User* users, int max_users);
User* db_get_user_by_name(const char* username);

#endif
