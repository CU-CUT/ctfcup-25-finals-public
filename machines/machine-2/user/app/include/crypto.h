#ifndef CRYPTO_H
#define CRYPTO_H

#include <windows.h>
#include <wincrypt.h>

#define AES_KEY_SIZE 32
#define AES_BLOCK_SIZE 16

typedef struct {
    HCRYPTPROV hProv;
    BYTE* aes_key;
    DWORD key_size;
    BYTE aes_iv[AES_BLOCK_SIZE];
    int initialized;
} CryptoContext;

int crypto_init(void);
void crypto_cleanup(void);
CryptoContext* crypto_context_create(const BYTE* user_key, DWORD key_len);
void crypto_context_free(CryptoContext* ctx);

int crypto_encrypt_buffer(CryptoContext* ctx, BYTE* data, DWORD size, 
                          BYTE* out_data, DWORD* out_size);
int crypto_get_iv(CryptoContext* ctx, BYTE* out_iv, DWORD* out_size);

#endif
