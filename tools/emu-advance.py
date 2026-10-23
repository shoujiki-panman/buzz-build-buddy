"""Dev helper: press the palm-sized next trigger N times with the right controller."""
import sys
import time

from emu import cli

def entity(name: str) -> int:
    return cli("ecs", "find", payload={"namePattern": f"^{name}$"})["data"]["result"]["entities"][0]["entityIndex"]

def position(index: int) -> list[float]:
    comps = cli("ecs", "query", payload={"entityIndex": index})["data"]["result"]["components"]
    return next(c["values"]["position"] for c in comps if c["componentId"] == "Transform")

count = int(sys.argv[1]) if len(sys.argv) > 1 else 1
x, y, z = position(entity("Next Trigger"))
for _ in range(count):
    cli("xr", "look-at", payload={"device": "controller-right", "target": {"x": x, "y": y, "z": z}})
    cli("xr", "select", payload={"device": "controller-right", "duration": 0.2})
    time.sleep(0.8)
print("trigger at", [round(v, 3) for v in (x, y, z)])
