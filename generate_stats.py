import json
import random

with open('assets/monsters.json', 'r') as f:
    monsters = json.load(f)

# Define behaviors mapping to generic engine logic
# The engine will read `move_pattern` and parameters from the JSON.
enriched_monsters = {}

for name, data in monsters.items():
    if name in ["Mage", "Acolyte", "Commoner"]:
        continue
    random.seed(name)
    
    # Base variations
    hp = random.randint(30, 80)
    speed = round(random.uniform(0.8, 2.0), 2)
    radius = random.randint(12, 18)
    
    pattern = "DIRECT" # default
    params = {}
    
    # Keyword-based thematic stats
    if "Dragon" in name or "Giant" in name or "Golem" in name:
        pattern = "SLOW_APPROACH"
        hp += 150
        radius += 10
        speed *= 0.6
    elif "Bat" in name or "Eagle" in name or "Flying" in name or "Vulture" in name:
        pattern = "ZIGZAG"
        speed *= 1.5
        params = {"zigzagAmplitude": round(random.uniform(2, 5), 2), "zigzagFrequency": round(random.uniform(0.005, 0.015), 4)}
    elif "Spider" in name or "Frog" in name or "Toad" in name:
        pattern = "HOPPER"
        params = {"hopCooldown": random.randint(1000, 2000), "hopDuration": 300, "hopSpeedMult": 4}
    elif "Archer" in name or "Mage" in name or "Priest" in name or "Slaad" in name:
        pattern = "ORBITER"
        params = {"orbitRadius": random.randint(250, 400)}
    elif "Snake" in name or "Worm" in name:
        pattern = "ZIGZAG"
        speed *= 1.2
        params = {"zigzagAmplitude": 1.5, "zigzagFrequency": 0.01}
    elif "Boar" in name or "Minotaur" in name or "Rhino" in name or "Triceratops" in name:
        pattern = "CHARGER"
        speed *= 0.5 # slow walk before charge
        params = {"chargeDistance": 300, "chargeSpeedMult": 4, "chargeCooldown": 3000, "chargeDuration": 600}
    else:
        # random distribution for the rest
        roll = random.random()
        if roll < 0.2:
            pattern = "ZIGZAG"
            params = {"zigzagAmplitude": 3, "zigzagFrequency": 0.01}
        elif roll < 0.35:
            pattern = "ORBITER"
            params = {"orbitRadius": 300}
        elif roll < 0.55:
            pattern = "HOPPER"
            params = {"hopCooldown": 1500, "hopDuration": 400, "hopSpeedMult": 3.5}
        elif roll < 0.7:
            pattern = "CHARGER"
            params = {"chargeDistance": 250, "chargeSpeedMult": 3, "chargeCooldown": 2500, "chargeDuration": 500}
        else:
            pattern = "DIRECT"
            
    # CR Formula based on Speed and HP
    cr = max(1, int(round((hp / 10) * (speed ** 2))))
        
    enriched_monsters[name] = {
        "name": name,
        "path": data["path"],
        "hp": hp,
        "speed": speed,
        "radius": radius,
        "cr": cr,
        "move_pattern": pattern,
        "move_params": params,
        "color": "#" + "".join([random.choice('456789ABCDEF') for _ in range(6)])
    }

with open('assets/game_data.json', 'w') as f:
    json.dump(enriched_monsters, f, indent=4)

print(f"Generated advanced AI game_data.json with {len(enriched_monsters)} enemies.")
