/* LD_PRELOAD shim for ASE 16.0 SP02 on Linux >= 5.8.
 * The kernel no longer sets READ_IMPLIES_EXEC for 64-bit binaries with an executable
 * stack, and clears it on execve, so ASE's Snap JIT faults executing heap memory.
 * Re-enable it from inside the process after exec, and keep it set if the program
 * calls personality() itself. */
#define _GNU_SOURCE
#include <sys/personality.h>
#include <sys/syscall.h>
#include <unistd.h>

static long raw_personality(unsigned long p) { return syscall(SYS_personality, p); }

int personality(unsigned long persona) {
    if (persona == 0xffffffffUL) return (int)raw_personality(persona);
    return (int)raw_personality(persona | READ_IMPLIES_EXEC);
}

__attribute__((constructor)) static void rie_on(void) {
    long p = raw_personality(0xffffffffUL);
    if (p != -1) raw_personality((unsigned long)p | READ_IMPLIES_EXEC);
}
