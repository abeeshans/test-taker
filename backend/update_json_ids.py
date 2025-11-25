import os
import json
import uuid

JSON_DIR = r"d:\Abeeshan\github\test-taker\json"

def update_json_files():
    print(f"Scanning directory: {JSON_DIR}")
    if not os.path.exists(JSON_DIR):
        print("Directory not found!")
        return

    for filename in os.listdir(JSON_DIR):
        if filename.endswith(".json"):
            filepath = os.path.join(JSON_DIR, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                if 'id' not in data:
                    new_id = str(uuid.uuid4())
                    print(f"Adding ID {new_id} to {filename}")
                    # Insert ID at the beginning
                    new_data = {"id": new_id}
                    new_data.update(data)
                    
                    with open(filepath, 'w', encoding='utf-8') as f:
                        json.dump(new_data, f, indent=2)
                else:
                    print(f"Skipping {filename} (already has ID: {data['id']})")
                    
            except Exception as e:
                print(f"Error processing {filename}: {e}")

if __name__ == "__main__":
    update_json_files()
