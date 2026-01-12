# Matrix (500) — Write-up

## Challenge text / hint

> “A digital lunch where the sandwiches are perfectly square, but the flavor is trapped in the corners.”

The hint points directly at **square matrices** and at the idea that the “meaning” (the plaintext) isn’t obvious in the center of the data — it’s **hidden by a transformation**, and you have to “work the corners” (i.e., undo / iterate the transform) to recover it.

---

## Goal

Recover the hidden flag from the provided artifacts:

- `main` — an executable runner
- `program.bin` — a bytecode/program consumed by `main`
- `result.txt` — an initial matrix dump (starting state)

---

## High-level approach

1. Identify what `main` does with `program.bin` and `result.txt`.
2. Notice that the output is another **matrix-like text file**.
3. Re-run the same transformation **multiple times**, each time feeding the newly produced matrix back in as input.
4. After a fixed number of iterations, the matrix output becomes readable and decodes to the flag.

This is a common CTF pattern: a **reversible permutation/diffusion** applied repeatedly eventually cycles back (or reaches a recognizable fixed point) for the intended iteration count.

---

## Key observation

Running the program once does **not** produce a readable flag.  
However, the transformation is consistent: the output from one run is a valid input to the next.

So the solve is to **iterate**:

- take `result.txt`
- run it through `main` + `program.bin`
- overwrite/rename the produced `result.txt`
- repeat

---

## Reproduction steps

Place the three files in the same directory:

- `main`
- `program.bin`
- `result.txt`

Then iterate the program **6 times**.

### Option A — Bash loop

```bash
chmod +x ./main

for i in {1..6}; do
  ./main program.bin result.txt > result_next.txt
  mv result_next.txt result.txt
done

cat result.txt
```

> If the binary writes `result.txt` directly rather than stdout, adjust the loop to copy/rename whatever output file it produces.

### Option B — Python driver (robust)

```python
import subprocess
from pathlib import Path

BIN = Path("./main")
PROG = Path("./program.bin")
STATE = Path("./result.txt")

for i in range(6):
    out = subprocess.check_output([str(BIN), str(PROG), str(STATE)])
    STATE.write_bytes(out)

print(STATE.read_text(errors="replace"))
```

---

## Flag

After **6 iterations**, the output decodes to:

```
shellmates{sh3ll_m4tr1x_vM_8x8_l33t_h4ck_th3_m4th_0f_r3v_w0rld!}
```

---

## Why iteration works (intuition)

Although the exact bytecode semantics are inside `program.bin`, the behavior matches a repeated application of a **permutation / mixing step** over a square grid:

- The matrix stays the same shape each run.
- Values get rearranged/mixed deterministically.
- Applying the mapping enough times “unwinds” the obfuscation to reveal the hidden message.

This is consistent with the challenge hint: the “sandwiches are perfectly square” (a square grid/matrix), and the “flavor” is trapped (obfuscated) until you apply the right sequence (here: repeated application).

---

## Notes / troubleshooting

- If `main` expects arguments in a different order, try:
  - `./main result.txt program.bin`
  - `./main program.bin < result.txt`
- If `main` writes an output file instead of stdout, look for newly created files after each run (e.g., `out.txt`, `result2.txt`, etc.) and feed that into the next iteration.

