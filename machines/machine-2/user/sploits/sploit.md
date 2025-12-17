# User vulns

### 1. Race Cond. (TOCTOU)

`handlers.c - функции prepare_file_path() и verify_file_access()`

- Два соединения от одного пользователя разделяют один `UserSession` объект
- `UserSession->current_filepath` является общим между потоками
- Проверка пути (`verify_file_access`) и чтение файла (`handle_get`) разнесены во времени

Sploiting:
1. Открываем 2 соединения под одним пользователем (sv.grench)
2. В первом соединении: **GET test.txt** - начинает проверку легитимного файла
3. Во втором соединении одновременно: `GET ../../../sensitive_file.txt` - подменяет user_session->current_filepath
4. Первое соединение проходит проверку на легитимный путь, но читает подмененный файл

**Код**
```c
snprintf(combined, MAX_PATH_LEN, "%s%s", ctx->shared_directory, filename);
PathCanonicalizeA(us->current_filepath, combined);

if (strstr(us->current_filepath, ctx->shared_directory) != us->current_filepath) {
    return -1;
}
hFile = CreateFileA(us->current_filepath, ...);
```

---

### 2. UAF

`crypto.c - функция crypto_context_free()`

- При **SWITCH** вызывается `crypto_context_free()`, который освобождает `key` (32 байта)
- Указатель `ctx->key` НЕ обнуляется после `HeapFree()`
- При следующем шифровании используется dangling pointer

**Код**
```c
void crypto_context_free(CryptoContext* ctx) {
    if (!ctx) return;
    
    if (ctx->key) {
        HeapFree(GetProcessHeap(), 0, ctx->key);
        // ctx->key не обнуляется :0
    }
    
    ctx->initialized = 0;
}
```

**Sploiting:**

1. Подключаемся под пользователем (ex.: sv.grench)
2. **SWITCH** → освобождается `key` (32 байта в куче)
3. **Heap spraying** через команду `INFO`:
   - `handle_info()` многократно вызывается с именем файла
   - Каждый вызов делает `HeapAlloc(32 bytes)` для временного буфера
   - Записывает туда имя файла (ex.: `test.txt`)
   - Освобождает буфер через `HeapFree()`
4. **Heap reuse**: Windows heap manager возвращает тот же освобожденный chunk
5. После спрея `ctx->key` указывает на память с содержимым `"some.txt\0\0\0..."`
6. При `GET` файл шифруется с **известным ключом** = имя файла из INFO

**Heap spray в handle_info():**
```c
int handle_info(ClientContext* ctx, const char* filename) {
    // Аллоцируем временный буфер для логирования
    char* cache = (char*)HeapAlloc(GetProcessHeap(), 0, REQUEST_CACHE_SIZE); //32 байта
    if (cache) {
        memset(cache, 0, REQUEST_CACHE_SIZE);
        strncpy(cache, filename, REQUEST_CACHE_SIZE - 1);
        
        FILE* audit = fopen("audit.log", "a");
        if (audit) {
            fprintf(audit, "[timestamp] user=%s INFO %s\n", username, cache);
            fclose(audit);
        }
        
        HeapFree(GetProcessHeap(), 0, cache);
        // Следующая аллокация 32 байт скорее всего вернет этот же chunk
    }
}
```

### 3. Предсказуемое шифрование

**Локация:** `crypto.c` - функция `crypto_encrypt_buffer()`

После успешной эксплуатации:
1. Обход проверки пути -> чтение файлов вне shared директории
2. Коррапт ключа шифрования -> предсказуемое шифрование
3. Расшифровка -> получение содержимого файлов
4. Достаем
`C:\Users\User\AppData\Roaming\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt` через относительный путь `..\\..\\..\\AppData\\Roaming\\Microsoft\\Windows\\PowerShell\\PSReadLine\\ConsoleHost_history.txt`
- Видим пароль для входа в по ssh в User в одной из строк истории консоли.
