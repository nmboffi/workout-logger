#!/usr/bin/env python3
"""Inject analysis/progression.json into the dashboard template.

Usage: python3 analysis/build_dashboard.py
Reads  analysis/dashboard_template.html  (placeholder: /*__DATA__*/null)
Writes analysis/dashboard.html — publish this file as the "Lift Progression"
artifact (URL in ~/repos/claude-skills/log-workout/SKILL.md).
"""
import json
from pathlib import Path

root = Path(__file__).parent
data = json.loads((root / "progression.json").read_text())
template = (root / "dashboard_template.html").read_text()

payload = json.dumps(data, separators=(",", ":"))
out = template.replace("/*__DATA__*/null", payload, 1)
assert out != template, "placeholder /*__DATA__*/null not found in template"

updated = max(
    (e["date"] for lift in data["lifts"].values() for e in lift.get("recent", []) if e.get("date")),
    default=data.get("generated", ""),
)
out = out.replace("__UPDATED__", updated, 1)
(root / "dashboard.html").write_text(out)
print(f"wrote dashboard.html ({len(out)//1024} KB, {len(data['lifts'])} lifts)")
