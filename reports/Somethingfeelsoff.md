# CTF Report — Flag Verification & Final Submission

## Context
A candidate flag string initially *looked* plausible but **did not submit as correct**. The correct approach was to **verify the exact flag** against the provided checker program (`chall`) before submitting to the platform.

---

## Final Flag
**Accepted flag:**
`TSGCTF{Inv3571ga710n_1n70_BOF_Or13n73d_Pr0gramm1ng_a5_a_73chn1qu3_f0r_0bfu5ca710n}`

---

## Verification (Local Checker)
To validate the flag locally using the provided program:

### Option A — Interactive
```bash
./chall
# paste the flag when prompted
```

### Option B — Pipe the flag (recommended)
```bash
printf '%s\n' 'TSGCTF{Inv3571ga710n_1n70_BOF_Or13n73d_Pr0gramm1ng_a5_a_73chn1qu3_f0r_0bfu5ca710n}' | ./chall
```

**Expected output:**
```
FLAG> Correct!
```

---

## Why the First Submission Failed
The earlier candidate:

`TSGCTF{th3_qu1ck_fluffy_z3br4_jumps_0v3r_4_f1sh}`

…**did not match what the checker expected**, so it was rejected by the platform.

Common causes of “looks right but wrong” in CTF flags:
- Wrong derived value (solver logic mismatch vs. actual checker)
- Lookalike characters (e.g., `0` vs `O`, `1` vs `l`)
- Hidden whitespace/newlines from copy/paste
- Case differences

---

## Submission Hygiene Checklist
Before submitting, confirm:
- No leading/trailing spaces
- Exactly `TSGCTF{...}` format
- Correct underscores and casing
- No invisible characters (retype manually if unsure)

---

## Notes (Write-up Narrative)
The final flag text suggests the theme:
> Investigation into BOF Oriented Programming as a technique for obfuscation

Depending on your solve path, you can describe one of these:
- **Static reverse-engineering** (Ghidra/IDA): locate the verification routine and recover the expected string.
- **Dynamic analysis** (gdb): break/step through validation and extract the expected value from memory/registers.

---

## Conclusion
The key lesson: **always verify locally using the checker** before submitting.  
Final submission: `TSGCTF{Inv3571ga710n_1n70_BOF_Or13n73d_Pr0gramm1ng_a5_a_73chn1qu3_f0r_0bfu5ca710n}`
