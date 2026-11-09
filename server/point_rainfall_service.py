import sys
import json
import numpy as np
import pyart

def calculate_gate_coordinates(radar, sweep=0):
    """Calculate gate latitudes and longitudes from radar data"""
    try:
        # Try different methods to get gate coordinates
        # Method 1: Use get_gate_x_y_z and convert to lat/lon
        gate_x, gate_y, gate_alt = radar.get_gate_x_y_z(sweep, edges=False)
        
        # Convert from Cartesian coordinates to geographic coordinates
        # This assumes the radar data is in a Cartesian projection
        radar_lat = radar.latitude['data'][0]
        radar_lon = radar.longitude['data'][0]
        radar_alt = radar.altitude['data'][0]
        
        # Convert x,y (meters) to lat,lon (degrees)
        # Approximate conversion: 1 degree ≈ 111 km
        gate_lats = radar_lat + (gate_y / 111000.0)  # Convert meters to degrees
        gate_lons = radar_lon + (gate_x / (111000.0 * np.cos(np.radians(radar_lat))))
        
        return gate_lats, gate_lons
        
    except Exception as e:
        print(f"Error calculating gate coordinates: {e}")
        return None, None

def zr_to_rainfall(dbz_values, a=200, b=1.6):
    """Convert dBZ values to rainfall rate using Z-R relationship"""
    try:
        if hasattr(dbz_values, 'mask'):
            dbz_data = dbz_values.filled(np.nan)
        else:
            dbz_data = np.array(dbz_values)
        
        # Filter out invalid values (NaN, inf) and set negative dBZ to 0
        valid_mask = np.isfinite(dbz_data)
        dbz_data_clean = np.where(dbz_data < 0, 0, dbz_data)  # Set negative values to 0
        
        if not np.any(valid_mask):
            return np.full_like(dbz_data, np.nan).tolist()
        
        z_values = 10 ** (dbz_data_clean / 10)
        rainfall_rates = np.full_like(z_values, np.nan)
        rainfall_rates[valid_mask] = (z_values[valid_mask] / a) ** (1/b)
        
        return rainfall_rates.tolist()
    except Exception as e:
        print(f"Error in Z-R conversion: {e}")
        return []

if __name__ == "__main__":
    if len(sys.argv) >= 4:
        file_path = sys.argv[1]
        lat = float(sys.argv[2])
        lon = float(sys.argv[3])
        a = float(sys.argv[4]) if len(sys.argv) > 4 else 200
        b = float(sys.argv[5]) if len(sys.argv) > 5 else 1.6
        
        try:
            radar = pyart.io.read(file_path)
            gate_lats, gate_lons = calculate_gate_coordinates(radar)
            
            if gate_lats is None:
                result = {"success": False, "error": "Could not calculate gate coordinates"}
            else:
                # Find closest gate
                distances = np.sqrt((gate_lats - lat)**2 + (gate_lons - lon)**2)
                min_idx = np.unravel_index(np.nanargmin(distances), distances.shape)
                
                # Get reflectivity value
                reflectivity_fields = [field for field in radar.fields.keys() if 'DBZ' in field or 'ZDR' in field or 'REF' in field]
                
                if not reflectivity_fields:
                    # If no DBZ fields, try any field that might contain reflectivity data
                    reflectivity_fields = list(radar.fields.keys())
                    if not reflectivity_fields:
                        result = {"success": False, "error": "No data fields found in radar file"}
                    else:
                        # Use the first available field
                        field_name = reflectivity_fields[0]
                        reflectivity_data = radar.fields[field_name]['data']
                        dbz_value = reflectivity_data[min_idx]
                        
                        if hasattr(dbz_value, 'mask') and dbz_value.mask:
                            result = {"success": False, "error": "No radar data at this location (masked)"}
                        else:
                            dbz_value = float(dbz_value)
                            # If the field is not DBZ, we might need to convert it
                            # For now, assume it's already in dBZ or similar units
                            rainfall_rate = zr_to_rainfall([dbz_value], a, b)[0]
                            
                            result = {
                                "success": True,
                                "point": {"lat": lat, "lon": lon},
                                "closest_gate": {
                                    "gate_lat": float(gate_lats[min_idx]),
                                    "gate_lon": float(gate_lons[min_idx]),
                                    "distance_km": float(np.sqrt((gate_lats[min_idx] - lat)**2 + (gate_lons[min_idx] - lon)**2) * 111)
                                },
                                "reflectivity": {
                                    "field": field_name,
                                    "value": dbz_value,
                                    "units": "unknown"  # We don't know the units for non-DBZ fields
                                },
                                "rainfall_rate_mm_hr": rainfall_rate,
                                "zr_parameters": {"a": a, "b": b},
                                "note": "Used available field (may not be dBZ)"
                            }
                else:
                    # Use the first reflectivity field found
                    field_name = reflectivity_fields[0]
                    reflectivity_data = radar.fields[field_name]['data']
                    dbz_value = reflectivity_data[min_idx]
                    
                    if hasattr(dbz_value, 'mask') and dbz_value.mask:
                        result = {"success": False, "error": "No radar data at this location (masked)"}
                    else:
                        dbz_value = float(dbz_value)
                        rainfall_rate = zr_to_rainfall([dbz_value], a, b)[0]
                        
                        result = {
                            "success": True,
                            "point": {"lat": lat, "lon": lon},
                            "closest_gate": {
                                "gate_lat": float(gate_lats[min_idx]),
                                "gate_lon": float(gate_lons[min_idx]),
                                "distance_km": float(np.sqrt((gate_lats[min_idx] - lat)**2 + (gate_lons[min_idx] - lon)**2) * 111)
                            },
                            "reflectivity": {
                                "field": field_name,
                                "dbz": dbz_value
                            },
                            "rainfall_rate_mm_hr": rainfall_rate,
                            "zr_parameters": {"a": a, "b": b}
                        }
            
            print(json.dumps(result, indent=2))
            
        except Exception as e:
            print(json.dumps({"success": False, "error": str(e)}))