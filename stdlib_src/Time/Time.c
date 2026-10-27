#include <stdio.h>
#include <time.h>
#include "platform.h"
#include "Time/Time.h"

BS_EXPORT char* bytescript_module_map = "Time_map.bs";
BS_EXPORT TValue bytescript_module_loader(TValue* argv, size_t argc) {
    TValue fields[] = {
        new_cfunc(time_time),
        new_cfunc(clock_time),
        new_cfunc(sleep_time)
    };

    size_t field_count = sizeof(fields) / sizeof(fields[0]);
    memcpy(argv, fields, BSIZE(field_count));
}


TValue time_time(TValue* argv, size_t argc) {
    return NUM_AS_TVALUE(time(NULL));
}

TValue clock_time(TValue* argv, size_t argc) {
#ifdef _WIN32
    LARGE_INTEGER tick;
    LARGE_INTEGER freq;
    QueryPerformanceCounter(&tick);
    QueryPerformanceFrequency(&freq);

    return NUM_AS_TVALUE((double)tick.QuadPart / freq.QuadPart);
#else
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return NUM_AS_TVALUE((double)ts.tv_sec + (double)ts.tv_nsec / 1000000000.0);
#endif
}

TValue sleep_time(TValue* argv, size_t argc) {
    if (argc > 0) NUM_CHECK(0, "Time.sleep");
    bs_sleep_ms(argc > 0 ? (unsigned int)argv[0].num : 1000);

    return NIL;
}
