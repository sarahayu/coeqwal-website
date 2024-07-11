"""
Turn scenario CSV files to json format. All CSV files should be in `./scenarios/`.
Output will be in `./output/`.

Usage: python3 process.py
""" 

import os
import csv
import json
import math

IN_FOLDER = 'scenarios'
OUT_FOLDER = 'output'

# for decreasing file size, see `get_percentiles`
SIMPLIFY_ARR_TO_N_ELEMS = 20

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

all_objectives = []

for objective_file in all_files:
    with open(os.path.join(IN_FOLDER, objective_file), 'r') as objective_csv:
        csvreader = csv.reader(objective_csv)
        scenario_map = {}

        scen_names = next(csvreader)
        scen_names = scen_names[1:]

        for scen_name in scen_names:
            scenario_map[scen_name] = []

        SKIP_TRASH = 6

        for _ in range(SKIP_TRASH):
            next(csvreader)

        for row_nums in csvreader:
            for idx, num in enumerate(row_nums):
                if idx == 0:
                    continue
                scenario_map[scen_names[idx - 1]].append(float(num))

        for scen_name in scen_names:
            monthly_data = scenario_map[scen_name]
            tot_months = len(monthly_data)
            new_data = []
            for i in range(math.ceil(tot_months / 12)):
                year_data = monthly_data[i * 12:min((i + 1) * 12, tot_months)]
                year_avg = sum(year_data) / len(year_data)
                new_data.append(year_avg)

            simplified_data = [num_shorten(x) for x in get_percentiles(new_data, SIMPLIFY_ARR_TO_N_ELEMS)]

            scenario_map[scen_name] = simplified_data

        # convert map to array

        scenario_array = []

        for scen_name in scenario_map:
            scenario_array.append({
                'name': scen_name,
                'delivs': scenario_map[scen_name]
            })

        # with open(os.path.join(OUT_FOLDER, objective_file + '.json'), 'w') as out_json:
        #     json.dump(scenario_map, out_json)

        objective_name = objective_file.split('.')[0]

        all_objectives.append({
            'obj': objective_name,
            'scens': scenario_array
        })

with open(os.path.join(OUT_FOLDER, 'all_objectives.json'), 'w') as out_json:
    json.dump(all_objectives, out_json)