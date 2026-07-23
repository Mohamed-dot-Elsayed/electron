// Helper functions for geocoding
export const tryGeocode = async (lat, lng, setLocationName, form) => {
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
    console.warn("Nominatim failed:", error);
  }

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
    console.warn("BigDataCloud failed:", error);
  }

  // Fallback: Use coordinates
  const fallbackAddress = `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  setLocationName(fallbackAddress);
  form.setValue("address", fallbackAddress, { shouldValidate: true });
};

// Helper function to parse coordinates from the map string
export const parseCoordinates = (mapString) => {
  if (!mapString) return { latitude: null, longitude: null };

  // Check if it's a Google Maps URL
  if (mapString.includes("maps?q=")) {
    const url = new URL(mapString);
    const qParam = url.searchParams.get("q");
    if (qParam) {
      const [lat, lng] = qParam.split(",").map(Number);
      return { latitude: lat, longitude: lng };
    }
  }

  // Assume it's a comma-separated string
  const [lat, lng] = mapString.split(",").map(Number);
  return { latitude: lat, longitude: lng };
};