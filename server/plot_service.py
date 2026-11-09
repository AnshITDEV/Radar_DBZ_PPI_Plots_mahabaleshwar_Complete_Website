import sys
import pyart
import matplotlib
matplotlib.use('Agg')  # Headless mode for server
import matplotlib.pyplot as plt
import tempfile
import os
import json

def generate_plot(file_path, plot_type, variable):
    try:
        print(f"Generating plot: {file_path}, {plot_type}, {variable}")
        
        # Read radar file
        radar = pyart.io.read(file_path)
        print(f"Radar file loaded successfully. Scan type: {radar.metadata.get('scan_type', 'unknown')}")
        
        fig = plt.figure(figsize=(8, 6))
        
        # Auto-detect scan type if not specified or use provided type
        radar_scan_type = radar.metadata.get('scan_type', '').lower()
        
        if plot_type.upper() == "PPI" or radar_scan_type in ['ppi', 'surveillance']:
            print("Generating PPI plot")
            display = pyart.graph.RadarDisplay(radar)

            display.plot_ppi(
                variable,
                sweep=0,
                title=f"{variable} PPI",
                colorbar_label=variable,
                vmin=-30,
                vmax=80
            )
        elif plot_type.upper() == "RHI" or radar_scan_type in ['rhi']:
            print("Generating RHI plot")
            display = pyart.graph.RadarDisplay(radar)
            display.plot_rhi(
                variable,
                0,  # first azimuth
                fig=fig,
                title=f"{variable} RHI",
                colorbar_label=variable,
                vmin=-30,  # Adjust based on variable
                vmax=80    # Adjust based on variable
            )
        else:
            # Default to PPI if unknown
            print("Defaulting to PPI plot")
            display = pyart.graph.RadarMapDisplay(radar)
            display.plot_ppi_map(
                variable,
                0,
                fig=fig,
                title=f"{variable} PPI",
                colorbar_label=variable
            )
        
        # Save to temporary file
        temp_file = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
        plt.savefig(temp_file.name, dpi=150, bbox_inches='tight', facecolor='white')
        plt.close()
        
        print(f"Plot saved to: {temp_file.name}")
        return temp_file.name
        
    except Exception as e:
        print(f"Error generating plot: {str(e)}")
        plt.close()
        raise e

if __name__ == "__main__":
    # For command line usage
    if len(sys.argv) >= 5:
        file_path = sys.argv[1]
        plot_type = sys.argv[2]
        variable = sys.argv[3]
        output_path = sys.argv[4]
        
        try:
            plot_path = generate_plot(file_path, plot_type, variable)
            os.rename(plot_path, output_path)
            print(f"SUCCESS: {output_path}")
        except Exception as e:
            print(f"ERROR: {str(e)}")
            sys.exit(1)
    else:
        print("Usage: python plot_service.py <file_path> <plot_type> <variable> <output_path>")
        sys.exit(1)