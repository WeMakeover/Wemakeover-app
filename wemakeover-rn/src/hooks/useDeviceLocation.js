import { useCallback, useEffect, useState } from "react";
import { fetchDeviceCoords, reverseGeocodeCoords } from "../lib/locationService";

/**
 * Device GPS + BigDataCloud reverse geocode — mirrors website LocationDisplay.jsx.
 */
export function useDeviceLocation() {
  const [city, setCity] = useState("Loading...");
  const [subline, setSubline] = useState("");
  const [coords, setCoords] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setCity("Loading...");
    setSubline("");
    setCoords(null);

    const device = await fetchDeviceCoords();
    if (device.error) {
      setCity(device.message);
      setError(device.error);
      setIsLoading(false);
      return;
    }

    setCoords({ latitude: device.latitude, longitude: device.longitude });
    const result = await reverseGeocodeCoords(device.latitude, device.longitude);
    setCity(result.city);
    setSubline(result.subline);
    setError(result.error);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { city, subline, coords, isLoading, error, refresh };
}
