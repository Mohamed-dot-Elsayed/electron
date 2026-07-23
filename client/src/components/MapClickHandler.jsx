//helper component to handle map clicks and geocoding
import { useMapEvents } from "react-leaflet";

const MapClickHandler = ({ setSelectedLocation, setLocationName, form }) => {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setSelectedLocation({ lat, lng });

      // Try different approaches to avoid CORS
      const tryGeocode = async () => {
        try {
          // Method 1: Try with different parameters
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en&addressdetails=1`,
            {
              method: "GET",
              mode: "cors",
              headers: {
                Accept: "application/json",
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data && data.display_name) {
              setLocationName(data.display_name);
              form.setValue("address", data.display_name, {
                shouldValidate: true,
              });
              return;
            }
          }
        } catch (error) {
          console.warn("Method 1 failed:", error);
        }

        // Method 2: Try with JSONP-like approach using a different service
        try {
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
          );

          if (response.ok) {
            const data = await response.json();
            if (data && (data.display_name || data.locality)) {
              const address =
                data.display_name || `${data.locality}, ${data.countryName}`;
              setLocationName(address);
              form.setValue("address", address, { shouldValidate: true });
              return;
            }
          }
        } catch (error) {
          console.warn("Method 2 failed:", error);
        }

        // Fallback: Use coordinates
        const fallbackAddress = `Location: ${lat.toFixed(4)}, ${lng.toFixed(
          4
        )}`;
        setLocationName(fallbackAddress);
        form.setValue("address", fallbackAddress, { shouldValidate: true });
      };

      tryGeocode();
    },
  });
  return null;
};

export default MapClickHandler;