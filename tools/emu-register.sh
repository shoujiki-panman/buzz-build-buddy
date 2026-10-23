#!/usr/bin/env bash
# Drive IWER through the two-screw registration on the living_room table
# (table mesh at about x=-1.54, top y=0.79, z=0.2). Dev-only helper.
set -euo pipefail
cli() { npx @iwsdk/cli "$@" | python3 -c "import sys,json; d=json.load(sys.stdin); print('ok' if d.get('ok') else d.get('error'))"; }
cli xr set-transform --input-json '{"device":"headset","position":{"x":-0.95,"y":1.2,"z":0.2}}'
cli xr look-at --input-json '{"device":"headset","target":{"x":-1.5,"y":0.8,"z":0.2}}'
cli xr set-transform --input-json '{"device":"controller-right","position":{"x":-1.1,"y":1.0,"z":0.1}}'
cli xr look-at --input-json '{"device":"controller-right","target":{"x":-1.5,"y":0.79,"z":0.222}}'
sleep 1
cli xr select --input-json '{"device":"controller-right","duration":0.2}'
sleep 1
cli xr look-at --input-json '{"device":"controller-right","target":{"x":-1.5,"y":0.79,"z":0.178}}'
sleep 1
cli xr select --input-json '{"device":"controller-right","duration":0.2}'
