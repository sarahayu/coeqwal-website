"""
Turn scenario CSV files to json format. 
Specifically, this takes in CSV data that is grouped by scenarios, 
where one CSV file contains all objectives fitting one scenario.
All CSV files should be in `./input/`.
Output will be in `./output/`.

Usage: python3 process.py
""" 

import os
import csv
import json
import math

IN_FOLDER = 'input'
OUT_FOLDER = 'output'

# for decreasing file size, see `get_percentiles`. use -1 to not simplify (use all data)
SIMPLIFY_ARR_TO_N_PERCENTILES = -1

# filter to only include subset of scenarios and/or objectives in final file. leave `None` if you want to include all data
FILTER_SCENARIOS = None
FILTER_OBJECTIVES = [ "DEL_CVP_PAG_N", "DEL_CVP_PRF_S"]

all_files = sorted([f for f in os.listdir(IN_FOLDER) if os.path.isfile(os.path.join(IN_FOLDER, f))])

# truncate decimals to decrease file size
def num_shorten(n):
    return int(n)

# takes arr of some length and find the `slices` percentiles.
# for our application, we just need to store enough elements to create interpolators,
# so no need to store array sizes of dozens long.
def get_percentiles(arr, slices):
    n = len(arr)
    perc_arr = []

    for i in range(0, slices + 1):
        x = i * (n - 1) / slices
        x_1 = math.floor(x)
        x_2 = math.ceil(x)

        if x_1 == x_2:
            perc_arr.append(arr[x_1])
        else:
            a = arr[x_1]
            b = arr[x_2]
            interp = x - x_1
            
            perc_arr.append(a + (b - a) * interp)
    
    return perc_arr


if not os.path.exists(OUT_FOLDER):
    os.makedirs(OUT_FOLDER)

final_objectives_map = {}

for file_idx, scenario_file in enumerate(all_files):
    with open(os.path.join(IN_FOLDER, scenario_file), 'r') as scenario_csv:
        scenario_name = scenario_file.split('.')[0]

        if FILTER_SCENARIOS and not scenario_name in FILTER_SCENARIOS:
            continue

        # print(scenario_file)

        csvreader = csv.reader(scenario_csv)
        objective_map = {}
        idx_to_objective = {}

        # skip first row; second row has objective names
        next(csvreader)

        objective_names = next(csvreader)
        objective_names = objective_names[1:]

        for idx, objective_name in enumerate(objective_names):
            if not FILTER_OBJECTIVES or objective_name in FILTER_OBJECTIVES:
                objective_map[objective_name] = []
                idx_to_objective[idx] = objective_name

        SKIP_TRASH = 6

        for _ in range(SKIP_TRASH):
            next(csvreader)

        for row_nums in csvreader:
            for idx, num in enumerate(row_nums):
                if idx == 0:
                    continue

                objective_idx = idx - 1

                if objective_idx in idx_to_objective:
                    objective_map[objective_names[objective_idx]].append(float(num))

        for objective_name in objective_map:
            monthly_data = objective_map[objective_name]
            tot_months = len(monthly_data)
            new_data = []

            for i in range(math.ceil(tot_months / 12)):
                year_data = monthly_data[(i * 12 + 3):min((i + 1) * 12 + 3, tot_months)]
                year_avg = sum(year_data) / len(year_data)
                new_data.append(year_avg)


            if SIMPLIFY_ARR_TO_N_PERCENTILES == -1:
                simplified_data = new_data
            else:
                simplified_data = get_percentiles(new_data, SIMPLIFY_ARR_TO_N_PERCENTILES)

            if objective_name not in final_objectives_map:
                final_objectives_map[objective_name] = {}

            final_objectives_map[objective_name][scenario_name] = [num_shorten(x) for x in simplified_data]

# convert map to array

final_objectives = []
objectives_not_found = FILTER_OBJECTIVES.copy() if FILTER_OBJECTIVES else []
scenarios_not_found = FILTER_SCENARIOS.copy() if FILTER_SCENARIOS else []

for objective_name in final_objectives_map:
    scenarios = []

    for scenario_name in final_objectives_map[objective_name]:
        scenarios.append({
            'name': scenario_name,
            'delivs': final_objectives_map[objective_name][scenario_name]
        })

        if scenario_name in scenarios_not_found:
            scenarios_not_found.remove(scenario_name)
    
    final_objectives.append({
        'obj': objective_name,
        'scens': scenarios,
    })

    if objective_name in objectives_not_found:
        objectives_not_found.remove(objective_name)

if len(objectives_not_found) != 0:
    print(f"Warning: the following objectives were not found: { ', '.join(objectives_not_found) }")

if len(scenarios_not_found) != 0:
    print(f"Warning: the following scenarios were not found: { ', '.join(scenarios_not_found) }")

with open(os.path.join(OUT_FOLDER, 'objectives.json'), 'w') as out_json:
    json.dump(final_objectives, out_json)
