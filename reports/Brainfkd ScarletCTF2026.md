Rev / Brainf**kd — write-up (report.txt)

Flag:
  RUSEC{g0d_im_s0_s0rry_for_th1s_p4in}

------------------------------------------------------------
1) Overview
------------------------------------------------------------
The challenge provides a Brainfuck “flag checker”. It:
  • Reads user input
  • Transforms it
  • Compares it against an embedded expected value
  • Prints either:
      "Flag is correct!! :D"
    or
      "Flag is incorrect..."

The program also echoes back what it read (plus a newline).

------------------------------------------------------------
2) Input behavior (confirmed by emulation)
------------------------------------------------------------
The Brainfuck source contains a single ',' instruction placed inside a loop, so it consumes many bytes.

Observed behavior:
  • If no newline is encountered, it reads exactly 36 bytes.
  • If a newline ('\n', ASCII 10) is encountered before 36 bytes, it stops the main read and then
    performs 4 extra reads (typically yielding 0x00 if EOF). This is why short inputs like "test\n"
    get echoed as:
        test\x00\x00\x00\x00\n

So the “real” checked input length is 36 bytes.

------------------------------------------------------------
3) Tape layout and the masking step (the important part)
------------------------------------------------------------
After the input stage, the program constructs a “masked” buffer:

  masked[i] = input[i] XOR key[i]

This masked buffer is stored at Brainfuck tape indices 257..292:
  tape[257 + i] = masked[i]   for i=0..35

The key is split into:
  • key32 for the first 32 bytes (i=0..31)
  • key4  for the last  4 bytes (i=32..35)

Deriving the keys:
If you run the program with empty input (EOF -> 0x00 bytes) and stop just before it prints the
final status line, tape[257..292] holds exactly the XOR keys (since 0x00 XOR key = key).

Keys (verified):
  key32 (ASCII-ish):
    dev\x0fzSaLPHT!MS=uhsPc\x18manSWcPae\x00(
  key32 (hex):
    64 65 76 0f 7a 53 61 4c 50 48 54 21 4d 53 3d 75
    68 73 50 63 18 6d 61 6e 53 57 63 50 61 65 00 28

  key4 (ASCII):
    D|pi
  key4 (hex):
    44 7c 70 69

So:
  masked[0..31] = input[0..31] XOR key32
  masked[32..35] = input[32..35] XOR key4

------------------------------------------------------------
4) Where the expected value lives
------------------------------------------------------------
The checker compares your computed masked[0..35] against a constant 36-byte “target_mask”
embedded/constructed in memory.

Because the program’s tape is stable across different wrong inputs (except for the masked buffer),
we can locate the constant by scanning memory for any 36-byte window that, when XOR-decoded
with (key32,key4), looks like a flag.

This search returns exactly ONE hit at tape offset 473:

  target_mask = tape[473 : 473+36]

Decoding rule:
  flag[i] = target_mask[i] XOR key[i]
(where key[i] uses key32 for 0..31 and key4 for 32..35)

That yields:
  RUSEC{g0d_im_s0_s0rry_for_th1s_p4in}

Length check: 36 bytes ✅
Running the Brainfuck program with this 36-byte input prints:
  "Flag is correct!! :D"

------------------------------------------------------------
5) Minimal solver script (Python)
------------------------------------------------------------
This script:
  • Loads program.txt
  • Runs it once with empty input to derive key32/key4
  • Scans memory for a 36-byte window that decodes into a flag-like string
  • Prints the recovered flag
  • Verifies by running the BF program with the recovered flag

------------------------------------------------------------
---- solve.py ----
# solve.py
from pathlib import Path
import string

BF_PATH = "program.txt"
STOP_AT_INST = 9248  # just before printing the final status ("Flag is ...")

def compile_bf(code: str):
    ops = [c for c in code if c in "><+-.,[]"]
    inst = []
    i = 0
    while i < len(ops):
        c = ops[i]
        if c in "><+-.,":   # compress repeats
            j = i + 1
            while j < len(ops) and ops[j] == c:
                j += 1
            inst.append([c, j - i, None])
            i = j
        else:
            inst.append([c, 1, None])
            i += 1

    st = []
    for k, (op, arg, jmp) in enumerate(inst):
        if op == "[":
            st.append(k)
        elif op == "]":
            j = st.pop()
            inst[k][2] = j
            inst[j][2] = k
    return inst

def run_bf(inst, inp: bytes, stop_inst_idx=None, tape_size=200000, max_ops=200_000_000):
    tape = bytearray(tape_size)
    ptr = 0
    ip = 0
    inpos = 0
    out = bytearray()
    steps = 0

    while ip < len(inst):
        if stop_inst_idx is not None and ip == stop_inst_idx:
            break

        op, arg, jmp = inst[ip]
        steps += 1
        if steps > max_ops:
            raise RuntimeError("too many steps")

        if op == ">":
            ptr += arg
        elif op == "<":
            ptr -= arg
        elif op == "+":
            tape[ptr] = (tape[ptr] + arg) & 0xFF
        elif op == "-":
            tape[ptr] = (tape[ptr] - arg) & 0xFF
        elif op == ".":
            out.extend([tape[ptr]] * arg)
        elif op == ",":
            for _ in range(arg):
                tape[ptr] = inp[inpos] if inpos < len(inp) else 0
                inpos += 1
        elif op == "[":
            if tape[ptr] == 0:
                ip = jmp
        elif op == "]":
            if tape[ptr] != 0:
                ip = jmp

        ip += 1

    return bytes(out), tape

def decode_mask(mask36: bytes, key32: bytes, key4: bytes) -> bytes:
    first = bytes(mask36[i] ^ key32[i] for i in range(32))
    last = bytes(mask36[32+i] ^ key4[i] for i in range(4))
    return first + last

def plausible_flag(s: bytes) -> bool:
    allowed = set((string.ascii_letters + string.digits + "{}_-.").encode())
    if any(c not in allowed for c in s):
        return False
    if b"{" not in s or b"}" not in s:
        return False
    i = s.find(b"{")
    j = s.find(b"}")
    if not (0 < i < j):
        return False
    if i > 10:
        return False
    return True

def main():
    code = Path(BF_PATH).read_text()
    inst = compile_bf(code)

    # Empty input -> tape[257..292] becomes the keys at STOP point
    _, tape0 = run_bf(inst, b"", stop_inst_idx=STOP_AT_INST)
    key32 = bytes(tape0[257:289])
    key4  = bytes(tape0[289:293])

    tb = bytes(tape0)
    candidates = []
    for start in range(0, 520 - 36):
        w = tb[start:start+36]
        flag = decode_mask(w, key32, key4)
        if plausible_flag(flag):
            candidates.append((start, flag))

    print("[*] candidates:", len(candidates))
    for off, flag in candidates:
        print(f"offset={off} flag={flag.decode()}")

    # Verify by running with the recovered flag
    off, flag = candidates[0]
    out, _ = run_bf(inst, flag)
    print("[*] program output:")
    print(out.decode("latin1"))

if __name__ == "__main__":
    main()
