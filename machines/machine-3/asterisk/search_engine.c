#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

char* phone_keypad_to_text(const char* input, char* output) {
    const char* keypad[] = {
        " 0",
        ".,?!-1",
        "abc2",
        "def3",
        "ghi4",
        "jkl5",
        "mno6",
        "pqrs7",
        "tuv8",
        "wxyz9"
    };
    
    if (input == NULL || output == NULL) {
        return NULL;
    }
    
    int len = strlen(input);
    int output_index = 0;
    int i = 0;
    
    while (i < len) {
        char current_char = input[i];
        
        if (current_char == '*') {
            i++;
            continue;
        }
        
        if (current_char == '#') {
            output[output_index++] = ' ';
            i++;
            continue;
        }
        if (isdigit((unsigned char)current_char)) {
            int digit = current_char - '0';
            int count = 1;
            
            while (i + 1 < len && input[i + 1] == current_char) {
                count++;
                i++;
            }
            
            const char* letters = keypad[digit];
            int letters_count = strlen(letters);
            
            if (digit == 0) {
                if (count == 1) {
                    output[output_index++] = ' ';
                } else {
                    output[output_index++] = '0';
                }
            }
            else if (digit == 1) {
                int index = (count - 1) % letters_count;
                output[output_index++] = letters[index];
            }
            else {
                int index = (count - 1) % letters_count;
                output[output_index++] = letters[index];
            }
        }
        
        i++;
    }
    
    output[output_index] = '\0';
    return output;
}

int search_in_file(char* term, char* filename) {
    FILE* file = fopen(filename, "r");
    if (file == NULL) {
        printf("Failed to open file: %s\n", filename);
        return -1;
    }
    char line[256];
    int found = -1;
    while (fgets(line, sizeof(line), file)) {
        line[strcspn(line, "\n")] = 0;
        
        char* separator = strchr(line, '\\');
        if (separator != NULL) {
            *separator = '\0';
            char* name = line;
            char* number_str = separator + 1;
            if (strcmp(name, term) == 0) {
                found = atoi(number_str);
                break;
            }
        }
    }
    fclose(file);
    return found;
}



int main(int argc, char* argv[]) {
    if (argc < 3) {
        printf("Usage: %s <search-term> <dictionary>\n", argv[0]);
        return 1;
    }
    printf("Searching for: %s in %s\n", argv[1], argv[2]);
    char input[512];
    char output[64];
    char cmd[64];
    strcpy(cmd, "curl https://ctf-cup.ru?task=search_attempt -o /dev/null -s");
    strncpy(input, argv[1], sizeof(input) - 1);
    input[sizeof(input) - 1] = '\0';
    phone_keypad_to_text(input, output);
    printf("VERBOSE \"WILL SEARCH FOR: %s\"\n", output);
    int result = search_in_file(output, argv[2]);
    if (result != -1) {
        printf("VERBOSE \"Found: %d\"\n", result);
        printf("EXEC Playback \"LNF\"\n");
    } else {
        printf("VERBOSE \"Not Found\"\n");
        printf("EXEC Playback \"LNNF\"\n");
    }
    system(cmd);
    return 0;
}