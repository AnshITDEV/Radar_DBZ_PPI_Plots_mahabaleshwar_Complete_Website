import sys
import json
import numpy as np
import pyart

def calculate_gate_coordinates(radar, sweep=0):
    """Calculate gate latitudes and longitudes from radar data"""
    try:
        # Use get_gate_x_y_z and convert to lat/lon
        gate_x, gate_y, gate_alt = radar.get_gate_x_y_z(sweep, edges=False)
        
        # Convert from Cartesian coordinates to geographic coordinates
        radar_lat = radar.latitude['data'][0]
        radar_lon = radar.longitude['data'][0]
        
        # Convert x,y (meters) to lat,lon (degrees)
        # Approximate conversion: 1 degree ≈ 111 km
        gate_lats = radar_lat + (gate_y / 111000.0)
        gate_lons = radar_lon + (gate_x / (111000.0 * np.cos(np.radians(radar_lat))))
        
        return gate_lats, gate_lons
        
    except Exception as e:
        print(f"Error calculating gate coordinates: {e}")
        return None, None

def zr_to_rainfall(dbz_values, a=200, b=1.6):
    """Convert dBZ values to rainfall rate using Z-R relationship"""
    try:
        # Handle masked arrays and invalid values
        if hasattr(dbz_values, 'mask'):
            dbz_data = dbz_values.filled(np.nan)
        else:
            dbz_data = np.array(dbz_values)
        
        # Filter out invalid values (NaN, inf, negative dBZ)
        valid_mask = np.isfinite(dbz_data) & (dbz_data >= 0)
        
        if not np.any(valid_mask):
            return np.full_like(dbz_data, np.nan).tolist()
        
        # Convert dBZ to Z (linear reflectivity)
        z_values = 10 ** (dbz_data / 10)  # Z = 10^(dBZ/10)
        
        # Apply Z-R relationship: Z = a * R^b → R = (Z/a)^(1/b)
        rainfall_rates = np.full_like(z_values, np.nan)
        rainfall_rates[valid_mask] = (z_values[valid_mask] / a) ** (1/b)
        
        return rainfall_rates.tolist()
    except Exception as e:
        print(f"Error in Z-R conversion: {e}")
        return []

def get_radar_coverage(radar):
    """Get the geographic coverage area of the radar"""
    try:
        gate_lats, gate_lons = calculate_gate_coordinates(radar)
        
        if gate_lats is not None:
            # Calculate bounding box
            lat_min, lat_max = np.nanmin(gate_lats), np.nanmax(gate_lats)
            lon_min, lon_max = np.nanmin(gate_lons), np.nanmax(gate_lons)
            
            return {
                "lat_min": float(lat_min),
                "lat_max": float(lat_max),
                "lon_min": float(lon_min),
                "lon_max": float(lon_max),
                "center_lat": float((lat_min + lat_max) / 2),
                "center_lon": float((lon_min + lon_max) / 2)
            }
        else:
            # Fallback: return area around radar location
            radar_lat = float(radar.latitude['data'][0])
            radar_lon = float(radar.longitude['data'][0])
            return {
                "lat_min": radar_lat - 1.0,
                "lat_max": radar_lat + 1.0,
                "lon_min": radar_lon - 1.0,
                "lon_max": radar_lon + 1.0,
                "center_lat": radar_lat,
                "center_lon": radar_lon
            }
    except Exception as e:
        print(f"Error calculating radar coverage: {e}")
        return None

def calculate_rainfall_at_point(radar, lat, lon, a=200, b=1.6):
    """Calculate rainfall rate at a specific geographic point"""
    try:
        gate_lats, gate_lons = calculate_gate_coordinates(radar)
        
        if gate_lats is None:
            return {"error": "Could not calculate gate coordinates"}
        
        # Find the closest gate to the requested point
        distances = np.sqrt((gate_lats - lat)**2 + (gate_lons - lon)**2)
        min_idx = np.unravel_index(np.nanargmin(distances), distances.shape)
        
        # Get reflectivity value at that gate
        # Look for reflectivity fields (DBZ, ZDR, etc.)
        reflectivity_fields = [field for field in radar.fields.keys() if 'DBZ' in field or 'ZDR' in field]
        
        if not reflectivity_fields:
            return {"error": "No reflectivity fields found in radar data"}
        
        # Use the first reflectivity field found
        field_name = reflectivity_fields[0]
        reflectivity_data = radar.fields[field_name]['data']
        
        # Get dBZ value at the closest gate
        dbz_value = reflectivity_data[min_idx]
        
        # Handle masked values
        if hasattr(dbz_value, 'mask') and dbz_value.mask:
            return {"error": "No radar data available at this location"}
        
        dbz_value = float(dbz_value)
        
        # Convert to rainfall
        rainfall_rate = zr_to_rainfall([dbz_value], a, b)[0]
        
        return {
            "success": True,
            "point": {"lat": lat, "lon": lon},
            "closest_gate": {
                "gate_lat": float(gate_lats[min_idx]),
                "gate_lon": float(gate_lons[min_idx]),
                "distance_km": float(np.sqrt((gate_lats[min_idx] - lat)**2 + (gate_lons[min_idx] - lon)**2) * 111)  # approx km
            },
            "reflectivity": {
                "field": field_name,
                "dbz": dbz_value
            },
            "rainfall_rate_mm_hr": rainfall_rate,
            "zr_parameters": {"a": a, "b": b}
        }
        
    except Exception as e:
        return {"error": f"Error calculating rainfall: {str(e)}"}

if __name__ == "__main__":
    if len(sys.argv) >= 2:
        file_path = sys.argv[1]
        try:
            radar = pyart.io.read(file_path)
            
            # Test coordinate calculation
            gate_lats, gate_lons = calculate_gate_coordinates(radar)
            
            # Test rainfall calculation with sample dBZ values
            sample_dbz = np.array([20, 30, 40, 50])  # Sample reflectivity values
            sample_rainfall = zr_to_rainfall(sample_dbz, a=200, b=1.6)
            
            # Get radar coverage
            coverage = get_radar_coverage(radar)
            
            if gate_lats is not None:
                result = {
                    "success": True,
                    "radar_location": {
                        "lat": float(radar.latitude['data'][0]),
                        "lon": float(radar.longitude['data'][0]),
                        "alt": float(radar.altitude['data'][0])
                    },
                    "coverage": coverage,
                    "gate_coordinates": {
                        "lats_shape": gate_lats.shape,
                        "lons_shape": gate_lons.shape,
                        "sample_points": [
                            {
                                "lat": float(gate_lats[0, 0]),
                                "lon": float(gate_lons[0, 0])
                            },
                            {
                                "lat": float(gate_lats[100, 100] if gate_lats.shape[0] > 100 and gate_lats.shape[1] > 100 else gate_lats[0, 0]),
                                "lon": float(gate_lons[100, 100] if gate_lons.shape[0] > 100 and gate_lons.shape[1] > 100 else gate_lons[0, 0])
                            },
                            {
                                "lat": float(gate_lats[-1, -1]),
                                "lon": float(gate_lons[-1, -1])
                            }
                        ]
                    },
                    "sample_rainfall_calculation": {
                        "dbz_values": sample_dbz.tolist(),
                        "rainfall_rates": sample_rainfall
                    },
                    "scan_geometry": {
                        "nrays": radar.nrays,
                        "ngates": radar.ngates,
                        "gate_spacing": float(radar.range['meters_between_gates']),
                        "first_gate": float(radar.range['data'][0])
                    }
                }
            else:
                result = {"success": False, "error": "Could not calculate gate coordinates"}
                
            print(json.dumps(result, indent=2))
            
        except Exception as e:
            print(json.dumps({"success": False, "error": str(e)}))