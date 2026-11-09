import sys
import pyart
import numpy as np

def check_coordinates(file_path):
    try:
        radar = pyart.io.read(file_path)
        print("=== Radar File Structure ===")
        print(f"File: {file_path}")
        print(f"Scan type: {radar.metadata.get('scan_type', 'Unknown')}")
        
        print("\n=== Available Fields ===")
        for field in radar.fields.keys():
            print(f" - {field}")
        
        print("\n=== Coordinate Information ===")
        # Check for geographic coordinates
        if hasattr(radar, 'latitude') and hasattr(radar, 'longitude'):
            print(f"Radar latitude: {radar.latitude['data'][0]:.4f}")
            print(f"Radar longitude: {radar.longitude['data'][0]:.4f}")
            print(f"Radar altitude: {radar.altitude['data'][0]:.1f} m")
        else:
            print("No direct latitude/longitude found in radar object")
        
        # Check gate coordinates
        print("\n=== Gate Information ===")
        print(f"Number of rays (azimuths): {radar.nrays}")
        print(f"Number of gates per ray: {radar.ngates}")
        print(f"Gate spacing: {radar.range['meters_between_gates']} m")
        print(f"First gate distance: {radar.range['data'][0]} m")
        
        # Try to get gate latitudes/longitudes
        try:
            # This will work if the radar data has gate geographic coordinates
            gate_lats, gate_lons = radar.get_gate_lat_lon(0)  # First sweep
            print(f"\nGate latitudes shape: {gate_lats.shape}")
            print(f"Gate longitudes shape: {gate_lons.shape}")
            print(f"Sample gate coordinates:")
            print(f"  Lat: {gate_lats[0, 0]:.4f} to {gate_lats[-1, -1]:.4f}")
            print(f"  Lon: {gate_lons[0, 0]:.4f} to {gate_lons[-1, -1]:.4f}")
        except Exception as e:
            print(f"Could not extract gate coordinates: {e}")
            print("We'll need to calculate gate positions from radar location")
        
        print("\n=== Metadata ===")
        for key, value in radar.metadata.items():
            print(f"{key}: {value}")
            
    except Exception as e:
        print(f"Error reading file: {e}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python check_radar_coordinates.py <path_to_netcdf_file>")
        sys.exit(1)
    
    check_coordinates(sys.argv[1])