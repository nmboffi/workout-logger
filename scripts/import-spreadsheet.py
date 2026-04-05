#!/usr/bin/env python3
"""Extract SBS Hypertrophy program data from spreadsheet into program.json."""

import json
import sys
import pandas as pd
import numpy as np

SPREADSHEET = sys.argv[1] if len(sys.argv) > 1 else "/Users/boffi/Downloads/SBS Hypertrophy 3_28_26.xlsx"

def nan_to_none(v):
    if isinstance(v, float) and np.isnan(v):
        return None
    return v

def extract_quick_setup(xls):
    df = pd.read_excel(xls, "Quick Setup", header=None)

    rounding = float(df.iloc[1, 0])

    # Main lifts: rows 4-8, exercises + maxes + single@8%
    main_lifts = []
    for r in range(4, 9):
        name = df.iloc[r, 2]
        if pd.isna(name):
            break
        main_lifts.append({
            "name": str(name),
            "trainingMax": float(df.iloc[r, 3]),
            "singleAt8Pct": float(df.iloc[r, 4]),
        })

    # Auxiliary lifts: rows 10-15
    auxiliaries = []
    for r in range(10, 16):
        name = df.iloc[r, 2]
        if pd.isna(name):
            break
        auxiliaries.append({
            "name": str(name),
            "slot": str(df.iloc[r, 1]),
            "trainingMax": float(df.iloc[r, 3]),
            "singleAt8Pct": float(df.iloc[r, 4]),
        })

    # Accessory pools: row 17 = headers, rows 18+ = exercises
    pools = {}
    pool_headers = []
    for c in range(1, 8):
        h = df.iloc[17, c]
        if pd.notna(h):
            pool_headers.append((c, str(h)))

    for col, header in pool_headers:
        exercises = []
        for r in range(18, 30):
            v = df.iloc[r, col]
            if pd.notna(v):
                exercises.append(str(v))
        pools[header] = exercises

    # Autoregulation table: rows 4-14, cols 6-14
    autoreg = {}
    for r in range(5, 15):
        name = df.iloc[r, 6]
        if pd.isna(name):
            break
        sets = int(df.iloc[r, 7])
        adjustments = {}
        labels = [
            "below_by_2plus", "below_by_1", "hit_target",
            "beat_by_1", "beat_by_2", "beat_by_3", "beat_by_4"
        ]
        for i, label in enumerate(labels):
            adjustments[label] = float(df.iloc[r, 8 + i])
        autoreg[str(name)] = {"sets": sets, "adjustments": adjustments}

    # Normal set rep targets: rows 30-40
    intensities = []
    for c in range(2, 15):
        v = df.iloc[30, c]
        if pd.notna(v):
            intensities.append(float(v))

    normal_rep_targets = {}
    for r in range(31, 41):
        name = df.iloc[r, 1]
        if pd.isna(name):
            break
        reps = []
        for c in range(2, 2 + len(intensities)):
            reps.append(int(df.iloc[r, c]))
        normal_rep_targets[str(name)] = dict(zip(intensities, reps))

    # Last set rep targets: rows 45-54
    last_set_targets = {}
    for r in range(45, 55):
        name = df.iloc[r, 1]
        if pd.isna(name):
            break
        reps = []
        for c in range(2, 2 + len(intensities)):
            reps.append(int(df.iloc[r, c]))
        last_set_targets[str(name)] = dict(zip(intensities, reps))

    return {
        "rounding": rounding,
        "mainLifts": main_lifts,
        "auxiliaries": auxiliaries,
        "accessoryPools": pools,
        "autoregulation": autoreg,
        "intensityLevels": intensities,
        "normalRepTargets": normal_rep_targets,
        "lastSetRepTargets": last_set_targets,
    }

def extract_setup(xls):
    """Extract the 21-week intensity/rep schedule from the Setup sheet."""
    df = pd.read_excel(xls, "Setup", header=None)

    # Find week columns: row 0 has week numbers
    weeks = []
    for c in range(df.shape[1]):
        val = df.iloc[0, c]
        if pd.notna(val) and val != "Week":
            weeks.append((c, int(val)))

    # For each week, extract per-exercise configs
    # Rows 2-5: main lifts (BSS, Bench, Trap Bar, OHP)
    # Rows 8-13: auxiliaries
    week_configs = []
    for col_start, week_num in weeks:
        config = {}
        # Main lifts: rows 2-5
        for r in range(2, 6):
            name = str(df.iloc[r, 0])
            intensity = float(df.iloc[r, col_start])
            reps = int(df.iloc[r, col_start + 1])
            rep_out = int(df.iloc[r, col_start + 2])
            sets = int(df.iloc[r, col_start + 3])
            config[name] = {
                "intensity": intensity,
                "reps": reps,
                "repOutTarget": rep_out,
                "sets": sets,
            }
        # Auxiliaries: rows 8-13
        for r in range(8, 14):
            name = str(df.iloc[r, 0])
            if pd.isna(df.iloc[r, 0]):
                break
            intensity = float(df.iloc[r, col_start])
            reps = int(df.iloc[r, col_start + 1])
            rep_out = int(df.iloc[r, col_start + 2])
            sets = int(df.iloc[r, col_start + 3])
            config[name] = {
                "intensity": intensity,
                "reps": reps,
                "repOutTarget": rep_out,
                "sets": sets,
            }
        week_configs.append({"weekNumber": week_num, "exerciseConfigs": config})

    return week_configs

def extract_template(xls, sheet_name):
    """Extract a workout template (e.g., '4x' or '(3+1)x') with all logged data."""
    df = pd.read_excel(xls, sheet_name, header=None)

    # Find week columns from row 0
    weeks = []
    for c in range(df.shape[1]):
        val = df.iloc[0, c]
        if pd.notna(val) and str(val).startswith("Week"):
            week_num = int(str(val).replace("Week ", ""))
            weeks.append((c, week_num))

    # Parse day structure from column 0
    days = []
    current_day = None
    for r in range(2, df.shape[0]):
        cell = df.iloc[r, 0]
        if pd.isna(cell):
            continue
        cell = str(cell)
        if cell.startswith("Day"):
            if current_day is not None:
                days.append(current_day)
            current_day = {"label": cell, "exercises": []}
        elif current_day is not None:
            is_tm_row = cell.endswith(" TM")
            current_day["exercises"].append({
                "name": cell,
                "row": r,
                "isTmRow": is_tm_row,
            })
    if current_day is not None:
        days.append(current_day)

    # For each day, pair TM rows with working-set rows and extract per-week data
    template_days = []
    for day in days:
        day_exercises = []
        i = 0
        exs = day["exercises"]
        while i < len(exs):
            ex = exs[i]
            if ex["isTmRow"]:
                # Next row is the working set row
                base_name = ex["name"].replace(" TM", "")
                tm_row = ex["row"]
                ws_row = exs[i + 1]["row"] if i + 1 < len(exs) else None

                # Extract per-week data
                week_data = []
                for col_start, week_num in weeks:
                    tm_weight = nan_to_none(df.iloc[tm_row, col_start])
                    if ws_row is not None:
                        weight = nan_to_none(df.iloc[ws_row, col_start])
                        reps = nan_to_none(df.iloc[ws_row, col_start + 1])
                        rep_out = nan_to_none(df.iloc[ws_row, col_start + 2])
                        set_goal = nan_to_none(df.iloc[ws_row, col_start + 3])
                        reps_last = nan_to_none(df.iloc[ws_row, col_start + 4])
                        notes = nan_to_none(df.iloc[ws_row, col_start + 6])
                    else:
                        weight = reps = rep_out = set_goal = reps_last = notes = None

                    wd = {"weekNumber": week_num}
                    if tm_weight is not None:
                        wd["trainingMax"] = float(tm_weight)
                    if weight is not None:
                        wd["weight"] = float(weight)
                    if reps is not None:
                        wd["reps"] = int(reps) if isinstance(reps, (int, float)) and not isinstance(reps, str) else str(reps)
                    if rep_out is not None:
                        wd["repOutTarget"] = int(rep_out) if isinstance(rep_out, (int, float)) else str(rep_out)
                    if set_goal is not None:
                        wd["sets"] = int(set_goal)
                    if reps_last is not None:
                        wd["repsOnLastSet"] = int(reps_last)
                    if notes is not None:
                        wd["notes"] = str(notes)
                    week_data.append(wd)

                day_exercises.append({
                    "name": base_name,
                    "category": "main",
                    "weekData": week_data,
                })
                i += 2  # skip TM + working set rows
            else:
                # Accessory or non-programmed exercise
                # Check if it has any data in week columns
                has_data = False
                week_data = []
                for col_start, week_num in weeks:
                    weight = nan_to_none(df.iloc[ex["row"], col_start])
                    reps = nan_to_none(df.iloc[ex["row"], col_start + 1])
                    rep_out = nan_to_none(df.iloc[ex["row"], col_start + 2])
                    if weight is not None or reps is not None:
                        has_data = True
                    wd = {"weekNumber": week_num}
                    if weight is not None:
                        wd["weight"] = float(weight) if isinstance(weight, (int, float)) else str(weight)
                    if reps is not None:
                        wd["reps"] = int(reps) if isinstance(reps, (int, float)) else str(reps)
                    if rep_out is not None:
                        wd["repOutTarget"] = int(rep_out) if isinstance(rep_out, (int, float)) else str(rep_out)
                    week_data.append(wd)

                cat = "accessory"
                if ex["name"] == "Accessories":
                    i += 1
                    continue

                day_exercises.append({
                    "name": ex["name"],
                    "category": cat,
                    "weekData": week_data if has_data else [],
                })
                i += 1

        template_days.append({
            "label": day["label"],
            "exercises": day_exercises,
        })

    return template_days

def main():
    xls = pd.ExcelFile(SPREADSHEET)

    quick_setup = extract_quick_setup(xls)
    week_configs = extract_setup(xls)

    templates = {}
    for sheet in ["(3+1)x", "4x"]:
        templates[sheet] = extract_template(xls, sheet)

    program = {
        "name": "SBS Hypertrophy",
        "sourceFile": SPREADSHEET.split("/")[-1],
        "config": quick_setup,
        "weekSchedule": week_configs,
        "templates": templates,
    }

    output = "/Users/boffi/projects/workout-logger/data/program.json"
    with open(output, "w") as f:
        json.dump(program, f, indent=2)

    # Print summary
    print(f"Exported to {output}")
    print(f"Rounding: {quick_setup['rounding']}")
    print(f"Main lifts: {[l['name'] for l in quick_setup['mainLifts']]}")
    print(f"Auxiliaries: {[l['name'] for l in quick_setup['auxiliaries']]}")
    print(f"Weeks: {len(week_configs)}")
    for sheet, days in templates.items():
        print(f"Template '{sheet}': {len(days)} days")
        for d in days:
            names = [e['name'] for e in d['exercises']]
            print(f"  {d['label']}: {names}")

if __name__ == "__main__":
    main()
