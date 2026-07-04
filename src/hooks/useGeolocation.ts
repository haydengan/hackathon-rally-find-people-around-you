'use client';

import { useState, useEffect, useCallback } from 'react';

interface GeolocationState {
  location: { lat: number; lng: number } | null;
  loading: boolean;
  error: string | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    loading: true,
    error: null,
  });

  const requestPermission = useCallback(() => {
    if (!navigator.geolocation) {
      setState({ location: null, loading: false, error: 'Geolocation not supported' });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          location: { lat: position.coords.latitude, lng: position.coords.longitude },
          loading: false,
          error: null,
        });
      },
      (error) => {
        setState({
          location: null,
          loading: false,
          error: error.code === 1 ? 'Location permission denied' : 'Unable to get location',
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  return { ...state, requestPermission };
}
