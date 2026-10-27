#include <ctype.h>
#include <setjmp.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "Values/bytescript_funcs.h"
#include "Values/oop.h"
#include "Globals/globals.h"
#include "Globals/error.h"
#include "TypeResolving/type_specifiers.h"
#include "bytescript.h"

/*
 * Bytescript command line interface.
 *
 *   bytescript                     start the interactive REPL
 *   bytescript <file.bs>           run a script
 *   bytescript -e "<code>"         run a snippet of code (--eval)
 *   bytescript --version           print the version (-v)
 *   bytescript --help              print this help (-h)
 *
 * Arguments after the script name (or after a bare "--") are ignored by
 * the interpreter itself, mirroring the historic behaviour.
 */

static void print_version(void) {
    printf("Bytescript %s\n", BYTESCRIPT_VERSION);
}

static void print_help(void) {
    print_version();
    printf(
        "\n"
        "Usage:\n"
        "  bytescript                 Start the interactive REPL\n"
        "  bytescript <file.bs>       Run a Bytescript program\n"
        "  bytescript -e \"<code>\"     Run a snippet of code\n"
        "\n"
        "Options:\n"
        "  -h, --help                 Show this help and exit\n"
        "  -v, --version              Show the version and exit\n"
        "  -e, --eval \"<code>\"        Evaluate the given Bytescript code\n"
        "      --                     Treat the next argument as the file name,\n"
        "                             even if it starts with '-'\n"
        "\n"
        "Examples:\n"
        "  bytescript hello.bs\n"
        "  bytescript -e \"print(2 + 3)\"\n"
        "\n"
        "Documentation: https://github.com/gefrus112/Bytescript\n");
}

static void initialize(void) {
    intialize_dependencies();
    initialize_type_specifiers();
    initialize_oop();
    initialize_globals();
}

/* Run a snippet with errors recovered instead of exiting the process.
 * Returns 0 on success, 1 if the snippet raised an error. */
static int run_snippet_recovering(char *code) {
    jmp_buf on_error;
    if (setjmp(on_error)) {
        bs_set_error_jmp(NULL);
        return 1;
    }
    bs_set_error_jmp(&on_error);
    TValue source = make_fstring(code);
    exec(&source, 1);
    bs_set_error_jmp(NULL);
    return 0;
}

/* Crude block balance used by the REPL to decide whether to keep reading:
 * counts block openers minus `end` keywords, as whole words. */
static int block_balance(const char *code) {
    static const char *openers[] = { "func", "class", "if", "for", "while", "repeat" };
    int balance = 0;
    const char *p = code;
    while (*p) {
        while (*p && !isalpha((unsigned char)*p) && *p != '_') p++;
        const char *start = p;
        while (isalnum((unsigned char)*p) || *p == '_') p++;
        size_t len = (size_t)(p - start);
        if (len == 0) break;
        if (len == 3 && !strncmp(start, "end", 3)) { balance--; continue; }
        for (size_t i = 0; i < sizeof(openers) / sizeof(openers[0]); i++) {
            if (len == strlen(openers[i]) && !strncmp(start, openers[i], len)) balance++;
        }
    }
    return balance;
}

static int run_repl(void) {
    char line[4096];
    char buffer[16384];
    buffer[0] = '\0';

    printf("Bytescript %s - interactive REPL\n", BYTESCRIPT_VERSION);
    printf("Type Bytescript code and press Enter. Commands: .help  .exit\n\n");

    for (;;) {
        printf("%s", buffer[0] ? "... " : "bs> ");
        fflush(stdout);
        if (!fgets(line, sizeof(line), stdin)) { printf("\n"); break; }

        /* REPL commands are only recognised at the start of a statement. */
        if (!buffer[0]) {
            char *cmd = line;
            while (isspace((unsigned char)*cmd)) cmd++;
            if (!strncmp(cmd, ".exit", 5) || !strncmp(cmd, ".quit", 5)) break;
            if (!strncmp(cmd, ".help", 5)) {
                printf("Run any Bytescript statement, e.g.  print(\"hi\")\n"
                       "Blocks (func/if/for/...) may span several lines; finish them with `end`.\n"
                       ".exit leaves the REPL. Docs: docs/syntax.md\n");
                continue;
            }
        }

        strncat(buffer, line, sizeof(buffer) - strlen(buffer) - 1);
        if (block_balance(buffer) > 0 && strlen(buffer) < sizeof(buffer) - sizeof(line)) continue;

        run_snippet_recovering(buffer);
        buffer[0] = '\0';
    }
    return 0;
}

int main(int argc, char *argv[]) {
    const char *filename = NULL;
    const char *snippet = NULL;
    int no_more_flags = 0;

    for (int i = 1; i < argc; i++) {
        const char *arg = argv[i];
        if (!no_more_flags && !strcmp(arg, "--")) { no_more_flags = 1; continue; }
        if (!no_more_flags && (!strcmp(arg, "-h") || !strcmp(arg, "--help"))) { print_help(); return 0; }
        if (!no_more_flags && (!strcmp(arg, "-v") || !strcmp(arg, "--version"))) { print_version(); return 0; }
        if (!no_more_flags && (!strcmp(arg, "-e") || !strcmp(arg, "--eval"))) {
            if (i + 1 >= argc) {
                fprintf(stderr, "bytescript: option '%s' expects a code snippet\n\n", arg);
                print_help();
                return 2;
            }
            snippet = argv[++i];
            continue;
        }
        if (!no_more_flags && arg[0] == '-' && arg[1] != '\0') {
            fprintf(stderr, "bytescript: unknown option '%s'\n\n", arg);
            print_help();
            return 2;
        }
        if (!filename) filename = arg;
        /* Extra arguments are left for the script (currently unused). */
    }

    initialize();

    if (snippet) return run_snippet_recovering((char *)snippet);
    if (!filename) return run_repl();

    TValue main = easy_compile((char *)filename);
    vm_run(main);
    return 0;
}
