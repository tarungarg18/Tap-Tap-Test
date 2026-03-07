# TaPTaP Game Engine Architecture

## Overview

TaPTaP Engine is a lightweight, JSON-driven game engine that lets students build simple games without writing complex game logic.

The engine separates configuration and execution.

Core idea:
JSON → Engine Parser → Systems → Game Loop → Render

---

## Architecture Diagram

```
User JSON Config
        |
        ▼
   Config Loader
        |
        ▼
   Game Engine Core
        |
   ┌────┼────┐
   ▼    ▼    ▼
 Input Physics Render
        |
        ▼
   System System System
        |
        ▼
  Game State Update
        |
        ▼
  Rendering Output
```
