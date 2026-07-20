#!/usr/bin/env python3
"""Build per-exercise progression time series from historical cycles + app-era inbox logs."""
import json, math

hist = json.load(open('analysis/all_cycles_history.json'))
inbox = json.load(open('public/inbox.json'))

ERA_LABEL = {"2023-05": "2023 cycle", "2023-10": "2023 cycle", "2024-07": "2024 cycle",
             "2024-11": "2024-25 cycle", "2026-03": "2024-26 cycle"}
AUTOREG = {"below2": -0.05, "below1": -0.02, "hit": 0.0, 1: 0.005, 2: 0.01, 3: 0.015, 4: 0.02, 5: 0.03}

def autoreg_pct(dev):
    if dev <= -2: return -0.05
    if dev == -1: return -0.02
    if dev == 0: return 0.0
    return {1: 0.005, 2: 0.01, 3: 0.015, 4: 0.02}.get(dev, 0.03)

lifts = {}
def L(name):
    return lifts.setdefault(name, {"history": [], "recent": []})

for r in sorted(hist, key=lambda r: (r["source"], r["week"])):
    L(r["lift"])["history"].append({
        "era": ERA_LABEL.get(r["source"], r["source"]), "week": r["week"], "tm": round(r["tm"], 1),
        "weight": r["weight"], "target": r["repOutTarget"], "reps": r["repsOnLastSet"], "dev": r["dev"]})

# Replay app-era inbox entries in order to reconstruct current TMs + recent sessions
tms = {}
for entry in inbox["entries"]:
    p = entry["payload"]
    for name, v in (p.get("trainingMaxes") or {}).items():
        tms[name] = float(v)
    for w in (p.get("workouts") or []):
        for e in w.get("exercises", []):
            name = e["exerciseName"]
            rec = {"date": w["date"]}
            if e.get("repsOnLastSet") is not None:
                rec.update({"kind": "main", "weight": e.get("prescribedWeight"),
                            "reps": e["repsOnLastSet"], "target": e.get("repOutTarget"),
                            "dev": (e["repsOnLastSet"] - e["repOutTarget"]) if e.get("repOutTarget") is not None else None,
                            "tmBefore": round(tms.get(name), 1) if name in tms else None})
                if e.get("repOutTarget") is not None and name in tms:
                    tms[name] = tms[name] * (1 + autoreg_pct(e["repsOnLastSet"] - e["repOutTarget"]))
                rec["tmAfter"] = round(tms[name], 1) if name in tms else None
            else:
                sets = [[s.get("weight"), s.get("reps")] for s in e.get("accessorySets", []) if s.get("reps") is not None]
                if not sets and not e.get("calibration"): continue
                rec.update({"kind": "sets", "sets": sets})
                if e.get("calibration") and sets and name not in tms:
                    best = max((s[0] or 0) * (1 + s[1] / 30) for s in sets)
                    if best > 0: tms[name] = round(best * 0.9 / 2.5) * 2.5
            if e.get("notes"): rec["note"] = e["notes"]
            L(name)["recent"].append(rec)

out = {"generated": "2026-07-20", "currentTMs": {k: round(v, 1) for k, v in sorted(tms.items())}, "lifts": lifts}
json.dump(out, open('analysis/progression.json', 'w'), indent=1)
n_hist = sum(len(v["history"]) for v in lifts.values())
n_rec = sum(len(v["recent"]) for v in lifts.values())
print(f"lifts: {len(lifts)}  history points: {n_hist}  recent entries: {n_rec}")
print("current TMs:", json.dumps(out["currentTMs"]))
