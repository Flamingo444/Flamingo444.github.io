# slop - Writeup

## Overview
- Category: Pwn
- Target: statically linked x86_64 binary with per-thread seccomp
- Goal: execute `/readflag` and return the flag over the socket

## Vulnerability
The request handler reads attacker-controlled data directly into its own stack
frame:

```
read(conn, __builtin_frame_address(0), 0x300);
```

This overwrites the saved RBP and return address, giving full control of RIP via
`leave; ret`.

## Seccomp Bypass Insight
Seccomp is installed only in the worker thread. The main thread never installs
seccomp and runs in a `sched_yield` loop.

glibc NPTL registers `__nptl_setxid_sighandler` for signal 0x21 (SIGRT_1). That
handler executes an arbitrary syscall using a global pointer `xidcmd`:

```
rdi = [xidcmd+0x08]
rsi = [xidcmd+0x10]
rdx = [xidcmd+0x18]
eax = [xidcmd+0x00]
syscall
```

If we point `xidcmd` at attacker-controlled memory and signal the main thread,
the main thread will execute any syscall with our arguments outside seccomp.

## Exploit Plan
1. Build a ROP chain in the worker thread (seccomp-restricted) to write data
   into .bss and to call `tkill`.
2. Create a fake `xidcmd` in .bss and point `xidcmd` at it.
3. Signal the main thread with SIGRT_1 to run `dup2(socket_fd, 1)` (stdout to
   socket).
4. Insert a short `nanosleep` in the worker thread to avoid a race where the
   handler reads `xidcmd` after we overwrite it.
5. Rewrite `xidcmd` for `execve("/readflag", NULL, NULL)` and signal again.
6. The flag is printed to the socket.

## Key Addresses and Gadgets (Static, Non-PIE)
- `xidcmd` pointer: `0x4c6170`
- Fake `xidcmd`: `0x4c6200`
- `/readflag` string: `0x4c6280`
- Gadgets used:
  - `pop rax; ret` @ `0x4051bf`
  - `pop rdi; ret` @ `0x402701`
  - `pop rsi; ret` @ `0x405caf`
  - `pop rdx; pop rbx; ret` @ `0x46f0f7`
  - `mov qword ptr [rdx], rax; ret` @ `0x41ae9c`
  - `syscall; pop rbx; ret` @ `0x405845`

## Reliability Fix
The initial version occasionally failed remotely. Local `strace` showed the
main thread could process SIGRT_1 after we overwrote `xidcmd`, producing a
bad `execve` call.

Fix: add a short `nanosleep(0, 100ms)` in the worker thread between the first
signal (dup2) and overwriting `xidcmd` for execve.

## Networking (Instancer + WireGuard)
The instancer required a 26-bit PoW. I added a fast solver
(`slop/pow-solver-fast.cpp`) and integrated it into `exploit.py`. The instancer
then returned a WireGuard config used to reach `10.244.0.1:1024`.

## Final Result
Using main-thread TID 7 on the remote instance:

```
hxp{huH_h0w_did_tH1s_h4pp3n___i_th0ught_I_w4s_s4f3...}
```

## Files
- `exploit.py`: full exploit with PoW handling and WireGuard integration
- `slop/pow-solver-fast.cpp`: fast PoW solver
