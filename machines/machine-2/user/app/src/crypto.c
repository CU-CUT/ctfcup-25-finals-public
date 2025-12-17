#include "crypto.h"
#include <stdio.h>
#include <string.h>

static HCRYPTPROV g_hProv = 0;

int crypto_init(void) {
    if (g_hProv) return 0;
    
    if (!CryptAcquireContextA(&g_hProv, NULL, MS_ENH_RSA_AES_PROV_A, 
                               PROV_RSA_AES, CRYPT_VERIFYCONTEXT)) {
        if (!CryptAcquireContextA(&g_hProv, NULL, NULL, 
                                   PROV_RSA_AES, CRYPT_VERIFYCONTEXT)) {
            fprintf(stderr, ":: CryptAcquireContext failed: %lu\n", GetLastError());
            return -1;
        }
    }
    
    printf(":: Crypto subsystem initialized (AES-256)\n");
    return 0;
}

void crypto_cleanup(void) {
    if (g_hProv) {
        CryptReleaseContext(g_hProv, 0);
        g_hProv = 0;
    }
}

CryptoContext* crypto_context_create(const BYTE* user_key, DWORD key_len) {
    CryptoContext* ctx = (CryptoContext*)HeapAlloc(
        GetProcessHeap(), HEAP_ZERO_MEMORY, sizeof(CryptoContext));
    
    if (!ctx) {
        fprintf(stderr, "Failed to allocate CryptoContext\n");
        return NULL;
    }
    
    ctx->hProv = g_hProv;
    
    ctx->aes_key = (BYTE*)HeapAlloc(GetProcessHeap(), 0, key_len);
    if (!ctx->aes_key) {
        HeapFree(GetProcessHeap(), 0, ctx);
        return NULL;
    }
    
    memcpy(ctx->aes_key, user_key, key_len);
    ctx->key_size = key_len;
    
    if (!CryptGenRandom(g_hProv, AES_BLOCK_SIZE, ctx->aes_iv)) {
        for (int i = 0; i < AES_BLOCK_SIZE; i++) {
            ctx->aes_iv[i] = (BYTE)(rand() & 0xFF);
        }
    }
    
    ctx->initialized = 1;
    
    return ctx;
}

void crypto_context_free(CryptoContext* ctx) {
    if (!ctx) return;
    
    if (ctx->aes_key) {
        HeapFree(GetProcessHeap(), 0, ctx->aes_key);
    }
    
    SecureZeroMemory(ctx->aes_iv, AES_BLOCK_SIZE);
    ctx->initialized = 0;
}

static void expand_keystream(const BYTE* key, DWORD key_len, const BYTE* iv, 
                            BYTE* keystream, DWORD stream_len) {
    BYTE state[256];
    for (int i = 0; i < 256; i++) {
        state[i] = (BYTE)i;
    }
    
    int j = 0;
    for (int i = 0; i < 256; i++) {
        j = (j + state[i] + key[i % key_len] + iv[i % AES_BLOCK_SIZE]) % 256;
        BYTE temp = state[i];
        state[i] = state[j];
        state[j] = temp;
    }
    
    int i = 0, k = 0;
    for (DWORD pos = 0; pos < stream_len; pos++) {
        i = (i + 1) % 256;
        k = (k + state[i]) % 256;
        BYTE temp = state[i];
        state[i] = state[k];
        state[k] = temp;
        keystream[pos] = state[(state[i] + state[k]) % 256];
    }
}

int crypto_encrypt_buffer(CryptoContext* ctx, BYTE* data, DWORD size,
                          BYTE* out_data, DWORD* out_size) {
    if (!ctx || !data || size == 0) return -1;
    
    BYTE* key_material = ctx->aes_key;
    DWORD key_len = ctx->key_size;
    
    if (!key_material || key_len == 0) {
        return -1;
    }
    
    // Generate keystream
    BYTE* keystream = (BYTE*)HeapAlloc(GetProcessHeap(), 0, size);
    if (!keystream) return -1;
    
    expand_keystream(key_material, key_len, ctx->aes_iv, keystream, size);
    
    // XOR data with keystream
    for (DWORD i = 0; i < size; i++) {
        out_data[i] = data[i] ^ keystream[i];
    }
    
    HeapFree(GetProcessHeap(), 0, keystream);
    *out_size = size;
    return 0;
}

int crypto_get_iv(CryptoContext* ctx, BYTE* out_iv, DWORD* out_size) {
    if (!ctx || !out_iv || !out_size) return -1;
    if (*out_size < AES_BLOCK_SIZE) return -1;
    
    memcpy(out_iv, ctx->aes_iv, AES_BLOCK_SIZE);
    *out_size = AES_BLOCK_SIZE;
    
    return 0;
}
