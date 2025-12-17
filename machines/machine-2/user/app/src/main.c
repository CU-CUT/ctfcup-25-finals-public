#include "server.h"
#include "client.h"
#include "network.h"
#include <stdio.h>
#include <string.h>

void print_banner() {
    printf("\n");
    printf("  ____            _____                     \n");
    printf(" / ___|  ___  ___|_   __|_ __ __ _ _ __  ___ \n");
    printf(" \\___ \\ / _ \\/   | |_| | '__/ _` | '_ \\/ __|\n");
    printf("  ___) |  __/ (__| | |__| | | (_| | | | \\__ \\\n");
    printf(" |____/ \\___|\\___| |_ __|_|  \\__,_|_| |_|___/\n");
    printf("\n");
    printf("  Secure File Transfer Utility © 2017\n");
    printf("  AES-256 Encryption\n");
    printf("\n");
}

void print_usage(const char* prog) {
    printf("Usage:\n");
    printf("  %s --server <dir> [--db path]   Start server\n", prog);
    printf("  %s --connect <host> [-p port] [--key file]\n", prog);
    printf("\n");
}

int main(int argc, char* argv[]) {
    int quiet_mode = 0;
    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "--key") == 0) {
            quiet_mode = 1;
            break;
        }
    }
    
    if (!quiet_mode) {
        print_banner();
    }
    
    if (argc < 3) {
        print_usage(argv[0]);
        return 1;
    }
    if (strcmp(argv[1], "--server") == 0 || strcmp(argv[1], "--shared") == 0) {
        const char* shared_dir = argv[2];
        const char* db_path = "sectrans.db";
        
        for (int i = 3; i < argc - 1; i++) {
            if (strcmp(argv[i], "--db") == 0) {
                db_path = argv[i + 1];
            }
        }
        
        printf("=================================\n");
        printf("  SecTrans File Sharing Server\n");
        printf("=================================\n\n");
        
        if (server_init(shared_dir, db_path) != 0) {
            fprintf(stderr, "Failed to initialize server\n");
            return 1;
        }
        
        int result = server_run();
        server_cleanup();
        return result;
    }
    // client mode
    else if (strcmp(argv[1], "--connect") == 0) {
        const char* host = argv[2];
        int port = DEFAULT_PORT;
        const char* key_file = NULL;
        
        for (int i = 3; i < argc - 1; i++) {
            if (strcmp(argv[i], "-p") == 0 || strcmp(argv[i], "--port") == 0) {
                port = atoi(argv[i + 1]);
            }
            else if (strcmp(argv[i], "--key") == 0) {
                key_file = argv[i + 1];
            }
        }
        
        if (client_init() != 0) {
            fprintf(stderr, "Failed to initialize client\n");
            return 1;
        }
        
        int result = client_interactive_with_key(host, port, key_file);
        client_cleanup();
        return result;
    }
    else {
        print_usage(argv[0]);
        return 1;
    }
}
