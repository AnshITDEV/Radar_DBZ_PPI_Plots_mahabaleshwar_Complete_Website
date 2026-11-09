import sys
import json
import traceback
import os

# Suppress pyART banner by redirecting stdout temporarily
class SuppressPyARTBanner:
    def __enter__(self):
        self._original_stdout = sys.stdout
        self._original_stderr = sys.stderr
        sys.stdout = open(os.devnull, 'w')
        sys.stderr = open(os.devnull, 'w')
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        sys.stdout.close()
        sys.stderr.close()
        sys.stdout = self._original_stdout
        sys.stderr = self._original_stderr

def get_variables_from_file(file_path):
    try:
        # Suppress pyART banner during import and file reading
        with SuppressPyARTBanner():
            import pyart
            radar = pyart.io.read(file_path)
            variables = list(radar.fields.keys())
        
        return {"success": True, "variables": variables}
        
    except Exception as e:
        return {"success": False, "error": str(e), "traceback": traceback.format_exc()}

if __name__ == "__main__":
    if len(sys.argv) != 2:
        result = {"success": False, "error": "Usage: python get_variables.py <file_path>"}
        print(json.dumps(result))
        sys.exit(1)
    
    file_path = sys.argv[1]
    result = get_variables_from_file(file_path)
    print(json.dumps(result))