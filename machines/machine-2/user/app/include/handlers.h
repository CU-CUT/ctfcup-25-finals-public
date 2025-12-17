#ifndef HANDLERS_H
#define HANDLERS_H

#include "server.h"

#define REQUEST_CACHE_SIZE 32

int validate_path(const char* base_dir, const char* requested_file, char* resolved_path);
int check_file_exists(const char* filepath);
int prepare_file_path(ClientContext* ctx, const char* filename);
int verify_file_access(ClientContext* ctx);

int handle_list(ClientContext* ctx, const char* subdir);
int handle_get(ClientContext* ctx, const char* filename);
int handle_info(ClientContext* ctx, const char* filename);
int handle_switch(ClientContext* ctx);

#endif
