Challenge 2: Web/SWE Intern at Girly Pop Inc (girly.ctf.rusec.club)
Goal: Find the flag. Hint mentions "an intern... stealing too much food [cookies]... didn't know much about secure software development".

Steps Taken
Vulnerability Discovery (LFI):

Tested the /view?page= parameter for Local File Inclusion (LFI).
Found that ../app.py was accessible, confirming LFI.
Enumeration:

Used the LFI to probe for potential files.
Checked ../.git/index which confirmed the existence of a git repository logic.
This implied standard project files might be present.
Extracting the Flag:

Attempted to read ../README.md (a common file in project roots).
The file existed and contained the flag directly.
URL: https://girly.ctf.rusec.club/view?page=../README.md
Flag: RUSEC{a1way$_1gn0r3_3nv_f1l3s_up47910k390cyhu623}