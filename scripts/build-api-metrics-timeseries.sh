#!/bin/bash
# build-api-metrics-timeseries.sh - Builds a time series of API metrics by analyzing git history

# --- Configuration ---
START_COMMIT="fa45b9b1a150164cb5340a178178e6e9e54e2553"
PYTHON_SCRIPT="analyze_cpp_api.py"      # Your Python script that generates api_metrics.json output
OUTPUT_CSV="timeseries.csv"
GIT_BRANCH="main"            # Adjust if your main branch name is different

# --- Helper function for incrementing dates in both macOS and Linux ---
increment_date() {
    local date_str=$1
    
    # Check if we're on macOS (BSD date) or Linux (GNU date)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS version
        date -j -v+1d -f "%Y-%m-%d" "$date_str" "+%Y-%m-%d"
    else
        # Linux version
        date -d "$date_str + 1 day" "+%Y-%m-%d"
    fi
}

# --- Determine Start Date from the commit ---
START_DATE=$(git show -s --format=%ci $START_COMMIT | cut -d ' ' -f1)
if [ -z "$START_DATE" ]; then
    echo "Failed to get the date for commit $START_COMMIT."
    exit 1
fi

# --- Set End Date to Today ---
END_DATE=$(date +%Y-%m-%d)

echo "Collecting data from $START_DATE to $END_DATE..."

# --- Create the CSV file with header ---
echo "date,num_files,num_types,num_methods,num_lines" > $OUTPUT_CSV

# --- Initialize variables to store the last valid metrics ---
LAST_NUM_FILES=""
LAST_NUM_TYPES=""
LAST_NUM_METHODS=""
LAST_NUM_LINES=""

# --- Loop through each day ---
current_date="$START_DATE"
while [[ "$current_date" < "$END_DATE" ]] || [[ "$current_date" == "$END_DATE" ]]; do
    echo "Processing date: $current_date"

    # Find the last commit before (or on) the current date.
    COMMIT=$(git rev-list -n 1 --before="$current_date 23:59:59" $GIT_BRANCH)
    if [ -z "$COMMIT" ]; then
        echo "No commit found for $current_date, using previous values..."
        
        # Skip if we don't have previous values yet
        if [ -z "$LAST_NUM_FILES" ]; then
            echo "No previous values available yet, skipping..."
            current_date=$(increment_date "$current_date")
            continue
        fi
        
        # Use last valid metrics and write to CSV
        echo "$current_date,$LAST_NUM_FILES,$LAST_NUM_TYPES,$LAST_NUM_METHODS,$LAST_NUM_LINES" >> $OUTPUT_CSV
    else
        # Checkout the commit in detached HEAD mode.
        git checkout --quiet $COMMIT || { echo "Failed to checkout commit $COMMIT"; exit 1; }

        # Run your Python script and capture its JSON output.
        JSON_OUTPUT=$(python3 $PYTHON_SCRIPT)
        if [ $? -ne 0 ]; then
            echo "Python script failed on commit $COMMIT"
            # If we have previous values, use them
            if [ ! -z "$LAST_NUM_FILES" ]; then
                echo "$current_date,$LAST_NUM_FILES,$LAST_NUM_TYPES,$LAST_NUM_METHODS,$LAST_NUM_LINES" >> $OUTPUT_CSV
            fi
            current_date=$(increment_date "$current_date")
            continue
        fi

        # Instead of using the JSON's "date", get the commit date from Git.
        COMMIT_DATE=$(git show -s --format=%ci $COMMIT | cut -d ' ' -f1)

        # Use jq to parse the other fields.
        NUM_FILES=$(echo "$JSON_OUTPUT" | jq -r '.num_files')
        NUM_TYPES=$(echo "$JSON_OUTPUT" | jq -r '.num_types')
        NUM_METHODS=$(echo "$JSON_OUTPUT" | jq -r '.num_methods')
        NUM_LINES=$(echo "$JSON_OUTPUT" | jq -r '.num_lines')

        # Store the current values as the last valid metrics
        LAST_NUM_FILES=$NUM_FILES
        LAST_NUM_TYPES=$NUM_TYPES
        LAST_NUM_METHODS=$NUM_METHODS
        LAST_NUM_LINES=$NUM_LINES

        # Append the commit date and metrics as a new row in the CSV.
        echo "$current_date,$NUM_FILES,$NUM_TYPES,$NUM_METHODS,$NUM_LINES" >> $OUTPUT_CSV
    fi

    # Move to the next day.
    current_date=$(increment_date "$current_date")
done

# --- Checkout back to the main branch ---
git checkout --quiet $GIT_BRANCH

echo "Data collection complete. Results saved in $OUTPUT_CSV"