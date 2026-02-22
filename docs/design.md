# Game Design

Magicka Arena is designed to provide a fast-paced, tactile spellcasting experience inspired by classic action-RPGs, optimized for mobile devices.

## UI/UX Philosophy

### Mobile-First Interface
- **Dual Joystick Layout**: Left side for movement (dynamic joystick), right side for spell selection (circular menu).
- **Glassmorphism**: UI elements use subtle blurs and semi-transparent backgrounds to maintain immersion without sacrificing readability.
- **Responsive Canvas**: The game dynamically resizes to fit any screen aspect ratio, ensuring visibility on both phones and tablets.

## Spell System: The 8 Elements

The core mechanic revolves around combining **Elements** into the **Spell Queue** (max 5 slots).

| Element | Icon | Logic |
| :--- | :--- | :--- |
| Fire | 🔥 | High burst damage |
| Cold | ❄️ | Slows enemies |
| Water | 💧 | Pushes back foes |
| Lightning | ⚡ | Fast travel, chain damage |
| Earth | 🪨 | Heavy impact, AoE |
| Shield | 🛡️ | Defensive barriers |
| Life | 💚 | Self-heal and Revive |
| Arcane | 🧿 | Pure magic energy |

### Element Cancellation
Strategic depth is added through opposing elements. If you queue an element that opposes one already in your queue, both are cleared:
- **Fire** ↔️ **Cold**
- **Water** ↔️ **Lightning**
- **Life** ↔️ **Arcane**

### Combos
Specific combinations trigger unique effects:
- **Life + Lightning**: Triggers an **AoE Revive** spell to bring fallen teammates back to life.

## Monster Scaling: Combat Rating (CR)
The game uses a `CR` system to manage difficulty:
- Each monster has a CR cost.
- The Host manages a pool (Max 100 CR).
- The system prevents overwhelming spawns while allowing for more powerful elite enemies to appear as others are defeated.
