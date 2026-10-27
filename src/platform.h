#ifndef BYTESCRIPT_PLATFORM_H
#define BYTESCRIPT_PLATFORM_H

/*
 * platform.h - small portability layer for Bytescript.
 *
 * Bytescript was originally Windows-only (LoadLibrary / GetProcAddress /
 * GetModuleFileName / __declspec(dllexport)). Everything OS-specific now
 * goes through the helpers below so the interpreter and the standard
 * library build on Windows, Linux and macOS from the same sources.
 *
 *   BSModule            handle to a dynamically loaded C module
 *   bs_load_library()   LoadLibrary                 / dlopen
 *   bs_get_symbol()     GetProcAddress              / dlsym
 *   bs_executable_dir() GetModuleFileName           / /proc/self/exe, _NSGetExecutablePath
 *   bs_sleep_ms()       Sleep                       / nanosleep
 *   BS_EXPORT           __declspec(dllexport)       / visibility("default")
 *   BS_SHARED_EXT       ".dll"                      / ".so" / ".dylib"
 */

#include <stddef.h>
#include <stdio.h>
#include <string.h>

#ifdef _WIN32

#include <windows.h>

typedef HMODULE BSModule;
#define BS_MODULE_NULL NULL
#define BS_SHARED_EXT ".dll"
#define BS_PATH_SEP '\\'
#define BS_EXPORT __declspec(dllexport)

static inline BSModule bs_load_library(const char *path) {
    return LoadLibraryA(path);
}

static inline void *bs_get_symbol(BSModule module, const char *name) {
    if (!module) return NULL;
    return (void *)GetProcAddress(module, name);
}

/* Writes the directory containing the running executable (with a trailing
 * separator) into `buff`. Returns 1 on success, 0 on failure. */
static inline int bs_executable_dir(char *buff, size_t size) {
    DWORD len = GetModuleFileNameA(NULL, buff, (DWORD)size);
    if (len == 0 || len >= size) return 0;
    char *last = strrchr(buff, '\\');
    if (!last) last = strrchr(buff, '/');
    if (last) *(last + 1) = '\0'; else buff[0] = '\0';
    return 1;
}

static inline void bs_sleep_ms(unsigned int milliseconds) {
    Sleep(milliseconds);
}

#else /* !_WIN32 - Linux, macOS and other POSIX systems */

#include <dlfcn.h>
#include <limits.h>
#include <time.h>
#include <unistd.h>

typedef void *BSModule;
#define BS_MODULE_NULL NULL
#define BS_PATH_SEP '/'
#define BS_EXPORT __attribute__((visibility("default")))

#if defined(__APPLE__)
#include <mach-o/dyld.h>
#define BS_SHARED_EXT ".dylib"
#else
#define BS_SHARED_EXT ".so"
#endif

static inline BSModule bs_load_library(const char *path) {
    void *handle = dlopen(path, RTLD_NOW | RTLD_GLOBAL);
    if (!handle && !strchr(path, '/')) {
        /* dlopen() does not search the current directory for a bare
         * filename, so retry with an explicit "./" prefix. */
        char buff[4096];
        snprintf(buff, sizeof(buff), "./%s", path);
        handle = dlopen(buff, RTLD_NOW | RTLD_GLOBAL);
    }
    return handle;
}

static inline void *bs_get_symbol(BSModule module, const char *name) {
    if (!module) return NULL;
    return dlsym(module, name);
}

/* Writes the directory containing the running executable (with a trailing
 * separator) into `buff`. Returns 1 on success, 0 on failure. */
static inline int bs_executable_dir(char *buff, size_t size) {
#if defined(__APPLE__)
    uint32_t len = (uint32_t)size;
    if (_NSGetExecutablePath(buff, &len) != 0) return 0;
#else
    ssize_t len = readlink("/proc/self/exe", buff, size - 1);
    if (len < 0) return 0;
    buff[len] = '\0';
#endif
    char *last = strrchr(buff, '/');
    if (last) *(last + 1) = '\0'; else buff[0] = '\0';
    return 1;
}

static inline void bs_sleep_ms(unsigned int milliseconds) {
    struct timespec ts;
    ts.tv_sec = milliseconds / 1000;
    ts.tv_nsec = (long)(milliseconds % 1000) * 1000000L;
    nanosleep(&ts, NULL);
}

#endif /* _WIN32 */

/* Returns 1 when `path` looks like a native shared library on any of the
 * supported platforms (.dll, .so or .dylib), so Bytescript source code can
 * keep using e.g. import "Math.dll" style paths on every OS and the real
 * file is still recognised as a C module. */
static inline int bs_is_shared_library(const char *path) {
    size_t len = strlen(path);
    if (len > 4 && !strcmp(path + len - 4, ".dll")) return 1;
    if (len > 3 && !strcmp(path + len - 3, ".so")) return 1;
    if (len > 6 && !strcmp(path + len - 6, ".dylib")) return 1;
    return 0;
}

#endif /* BYTESCRIPT_PLATFORM_H */
