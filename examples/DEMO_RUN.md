## Engine Loop

The engine runs a continuous loop based on the configured FPS.

Example:

Input → Update Systems → Repeat

Each system registered in the engine is updated every frame.

## Demo Controls
SPACE  → Increase score

CTRL+C → Exit program


## Run on Local-System
cd TAP-TAP

node examples/demo.js

## Architecture 
```
                 GAME DATA
                (JSON FILE)
                     │
                     ▼
              CONFIG LOADER
                     │
                     ▼ 
                 GAME ENGINE
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
      Input System         Score System
          │                     │
          └──────────┬──────────┘
                     ▼
               Game Output
                (Terminal)
```

## Flow
```
                    START PROGRAM
                          │
                          ▼
                    demo.js runs
                          │
                          ▼
                Load JSON Configuration
                          │
                          ▼
                   Create GameEngine
                          │
                          ▼
                Create ScoreSystem
                          │
                          ▼
                 Create InputSystem
                          │
                          ▼
               Register Systems
                          │
                          ▼
                    Start Engine
                          │
                          ▼
                    Engine Loop
                          │
         ┌────────────────┴────────────────┐
         ▼                                 ▼
  Update Systems                   Keyboard Events
         │                                 │
         ▼                                 ▼
InputSystem.update()                SPACE pressed
ScoreSystem.update()                      │
                                           ▼
                                  InputSystem handler
                                           │
                                           ▼
                                  ScoreSystem.addScore()
                                           │
                                           ▼
                                  Score Updated

```
