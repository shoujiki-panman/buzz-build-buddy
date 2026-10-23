"""Tiny wrapper around `npx @iwsdk/cli` for dev checks (avoids shell quoting)."""
import json
import re
import subprocess
import sys


def cli(*args: str, payload: dict | None = None) -> dict:
    cmd = ["npx", "@iwsdk/cli", *args]
    if payload is not None:
        cmd += ["--input-json", json.dumps(payload)]
    out = subprocess.run(cmd, capture_output=True, text=True).stdout
    return json.loads(out)


def texts(entity: int, selector: str) -> list[str]:
    r = cli("ui", "inspect", payload={"entityIndex": entity, "selector": selector})
    return re.findall(r'"text": "([^"]*)"', json.dumps(r, ensure_ascii=False))


if __name__ == "__main__":
    for spec in sys.argv[1:]:
        entity, selector = spec.split(" ", 1)
        print(selector, texts(int(entity), selector)[:3])
