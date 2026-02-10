# FANUC TP Language - MVP Reference

Simplified subset for teach pendant learning.

## Program Structure

```
/PROG  LESSON1
/COMMENT FANUC Teach Pendant Program
/ACCESS RVP
/REL 1.0 (revision)
/ATTR COMMENT = ''
/ATTR OWNER = ''
/ATTR COMMENT = ''
/BODY

; Program starts here

END
/PTP 1 ALWAYS,  , 0,  0,  0,  0,  0,  0
```

## Basic Commands

### Movement
```
MOVE P[1]           ; Move to position 1
MOVE P[n]           ; Move to position n (1-100)
J P[1] 100%        ; Joint move at 100% speed
L P[1] 500 mm/s    ; Linear move at 500mm/s
```

### I/O
```
DOUT OT[1]=ON      ; Digital output 1 ON
DOUT OT[1]=OFF     ; Digital output 1 OFF
WAIT DIN(DI[1])    ; Wait for digital input 1 to be high
IF (DI[1]=ON)      ; Conditional on input
THEN
  DOUT OT[1]=ON
ELSE
  DOUT OT[1]=OFF
ENDIF
```

### Flow Control
```
WAIT 1.0           ; Wait 1 second
WAIT 2.5           ; Wait 2.5 seconds
FOR J=1 TO 5       ; Loop 5 times
  MOVE P[J]        ; Move to P[J]
ENDFOR
CALL LESSON2       ; Call another program
```

### Variables
```
PR[1]=100          ; Set numeric register
IF (PR[1]>50)      ; Conditional
  PR[1]=PR[1]+10
ENDIF
```

## Teach Pendant UI (MVP)

Buttons user needs to simulate:
- **SELECT** — cycle through menu options
- **+/-** — adjust values
- **ENTER** — confirm
- **CANCEL** — go back
- **TEACH** — record position
- **PLAY** — execute program

Screen shows:
- Current line of code
- Robot position (X, Y, Z, W, P, R)
- I/O status panel
- Position list (P[1]...P[100])

## Simulator State

The interpreter needs to track:
- **Positions:** P[1] through P[100] (6D: X, Y, Z, Rx, Ry, Rz)
- **Registers:** PR[1] through PR[100] (numeric)
- **Digital I/O:** DI[1-32], DO[1-32] (boolean)
- **Program counter:** current line
- **Call stack:** for nested program calls
