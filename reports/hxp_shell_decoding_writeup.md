# hxp 39C3 CTF — shell(de)coding (Writeup)

> Shellcode golf: write **x86-64** shellcode that **base64-decodes** the provided input under a tight byte limit.

## TL;DR

- Goal: decode **44 base64 chars** into the original **32 bytes**
- Hard constraint: **< 42 bytes** of shellcode
- My progression: **41 bytes** (first working) to **28 bytes** (final)
- Key tradeoff: I intentionally **did not implement full `+` and `/` handling**, and relied on retries (worked on **attempt 8** in my run)

---

## Challenge setup

The remote service:

1. Generates **32 random bytes**
2. Base64-encodes them (result is **44 characters**)
3. Executes our shellcode to decode the base64 into bytes
4. Compares our decoded bytes to the original bytes

### I/O (calling convention)

- Input: a pointer to the base64 string
- Output: write the decoded bytes to the provided output buffer

(Exact register details depend on the provided harness; the important part is that the shellcode gets a base64 string and must write the decoded bytes back.)

---

## Approach

Base64 decoding is naturally chunked:

- Every **4 base64 characters** represent **24 bits**
- Those 24 bits become **3 output bytes**

So the shellcode repeats:

1. Read 4 input chars
2. Convert each char into a **6-bit value**
3. Accumulate into a 24-bit buffer
4. Store 3 bytes
5. Repeat until done

### Character mapping

The base64 alphabet is typically:

- `A-Z`: `0..25`
- `a-z`: `26..51`
- `0-9`: `52..61`
- `+`: `62`
- `/`: `63`

To save bytes, my implementation focused on the common ranges and **skipped perfect handling** for `+` and `/`.
That makes the decoder *probabilistic* in the sense that it won’t work for every random input — but with retries, it’s good enough for the challenge.

---

## Initial working shellcode (41 bytes)

This was my first version that consistently assembled and “mostly” decoded correctly.

```asm
L:  xor ebx, ebx        ; clear accumulator
    mov cl, 4           ; 4 chars per group

C:  lodsb               ; read next char
    sub al, 65          ; normalize from 'A'
    cmp al, 26
    jb  X               ; uppercase: done
    sub al, 6           ; adjust for lowercase gap
    cmp al, 52
    jb  X               ; lowercase: done
    add al, 75          ; wrap around for digits
    ; +/ falls through with wrong values (accepted)

X:  shl ebx, 6          ; make room for 6 bits
    add bl, al          ; add current value
    loop C              ; repeat 4 times

    xchg eax, ebx       ; move into eax
    bswap eax           ; reverse byte order
    shr eax, 8          ; align to 3 bytes
    stosd               ; write 4 bytes
    dec rdi             ; back up 1 (we only want 3)
    sub edx, 4          ; processed 4 input chars
    jnz L               ; continue until done
```

---

## Golfing it down to 28 bytes

Once I had a working baseline, the rest was pure byte-golf:

- remove anything “nice to have”
- reuse registers aggressively
- accept a narrower correctness model (especially around `+` and `/`)
- test after every cut

I ended up with a final **28-byte** payload that worked in the challenge environment.

### Public verification (no raw bytes)

I’m not publishing the raw 28-byte payload bytes in this public writeup, but you can verify a private copy with the fingerprint below.

- Expected length: **28 bytes**
- Expected SHA-256:  
  `e8cc73b1a91de9c15cea944cd93c47fc1eb4837ec9dc1331fe2b67ba82ea3260`

Verification script:

```python
import os
import sys
import hashlib

# Public writeup: raw bytes are intentionally not included.
# Provide them locally via an env var:
#   Windows (PowerShell): $env:PAYLOAD_HEX="..."; python verify_payload.py
#   Linux/macOS:          PAYLOAD_HEX="..." python verify_payload.py

EXPECTED_SHA256 = "e8cc73b1a91de9c15cea944cd93c47fc1eb4837ec9dc1331fe2b67ba82ea3260"

payload_hex = (os.environ.get("PAYLOAD_HEX") or "").strip().lower()
if not payload_hex:
    print("Set PAYLOAD_HEX to your final 28-byte shellcode hex (kept private).")
    sys.exit(1)

payload = bytes.fromhex(payload_hex)

print("Length (bytes):", len(payload))
print("SHA-256:", hashlib.sha256(payload).hexdigest())

assert len(payload) == 28, "Unexpected length"
assert hashlib.sha256(payload).hexdigest() == EXPECTED_SHA256, "Hash mismatch"

print("OK: payload matches the 28-byte final fingerprint.")
```

---

## Result

I got the solve on **attempt 8** with the “skip `+`/`/` and retry” strategy.

---

## Takeaways

- Size limits force you to think in **dataflow** (register reuse, instruction side-effects, implicit operands).
- In CTFs, “correct enough with retries” can be a valid strategy when the environment allows it.
- Shellcode golf is a great way to build intuition for assembly-level constraints and tradeoffs.

