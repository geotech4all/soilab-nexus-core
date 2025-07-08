import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface MapProps {
  latitude?: number;
  longitude?: number;
  onLocationSelect?: (lat: number, lng: number) => void;
  mapboxToken?: string;
}

const Map: React.FC<MapProps> = ({ 
  latitude = 40.7128, 
  longitude = -74.0060, 
  onLocationSelect,
  mapboxToken 
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [isTokenSet, setIsTokenSet] = useState(false);

  useEffect(() => {
    if (mapboxToken) {
      setIsTokenSet(true);
      initializeMap(mapboxToken);
    }
  }, [mapboxToken, latitude, longitude]);

  const handleTokenSubmit = () => {
    if (tokenInput.trim()) {
      setIsTokenSet(true);
      initializeMap(tokenInput.trim());
    }
  };

  const initializeMap = (token: string) => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = token;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [longitude, latitude],
      zoom: 10
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add initial marker
    marker.current = new mapboxgl.Marker({ draggable: true })
      .setLngLat([longitude, latitude])
      .addTo(map.current);

    // Handle marker drag
    marker.current.on('dragend', () => {
      if (marker.current && onLocationSelect) {
        const lngLat = marker.current.getLngLat();
        onLocationSelect(lngLat.lat, lngLat.lng);
      }
    });

    // Handle map click
    map.current.on('click', (e) => {
      if (marker.current && onLocationSelect) {
        marker.current.setLngLat(e.lngLat);
        onLocationSelect(e.lngLat.lat, e.lngLat.lng);
      }
    });
  };

  useEffect(() => {
    // Update marker position when coordinates change
    if (marker.current && isTokenSet) {
      marker.current.setLngLat([longitude, latitude]);
      map.current?.setCenter([longitude, latitude]);
    }
  }, [latitude, longitude, isTokenSet]);

  if (!isTokenSet) {
    return (
      <Card className="w-full h-96">
        <CardHeader>
          <CardTitle>Map Configuration Required</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Please enter your Mapbox public token to enable the interactive map.
          </p>
          <div className="space-y-2">
            <Label htmlFor="mapbox-token">Mapbox Public Token</Label>
            <Input
              id="mapbox-token"
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="pk.eyJ1..."
            />
          </div>
          <button
            onClick={handleTokenSubmit}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Load Map
          </button>
          <p className="text-xs text-muted-foreground">
            Get your token from{' '}
            <a 
              href="https://account.mapbox.com/access-tokens/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Mapbox Dashboard
            </a>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative w-full h-96 rounded-lg overflow-hidden border">
      <div ref={mapContainer} className="absolute inset-0" />
      <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm rounded px-2 py-1 text-xs">
        Click or drag marker to set location
      </div>
    </div>
  );
};

export default Map;