const LOCATION_PERMISSION_KEY = 'location_permission_status';

export async function updateUserLocation() {
  if (!navigator.geolocation) {
    console.log('Geolocation not supported');
    return;
  }

  // Check if we've already asked for location permission
  const permissionStatus = localStorage.getItem(LOCATION_PERMISSION_KEY);
  
  // If user previously denied, don't ask again
  if (permissionStatus === 'denied') {
    console.log('Location permission previously denied - skipping update');
    return;
  }

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          // Permission granted - save this so we don't prompt again
          if (permissionStatus !== 'granted') {
            localStorage.setItem(LOCATION_PERMISSION_KEY, 'granted');
            console.log('Location permission granted and saved');
          }
          resolve(pos);
        },
        (err) => {
          // Only save 'denied' status if user explicitly denied permission
          // Error codes: 1=PERMISSION_DENIED, 2=POSITION_UNAVAILABLE, 3=TIMEOUT
          if (err.code === 1 && permissionStatus !== 'denied') {
            localStorage.setItem(LOCATION_PERMISSION_KEY, 'denied');
            console.log('Location permission denied by user and saved');
          } else if (err.code === 2) {
            console.log('Location position unavailable - will retry next time');
          } else if (err.code === 3) {
            console.log('Location request timeout - will retry next time');
          }
          reject(err);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    });

    const { latitude, longitude } = position.coords;

    // Send location to backend
    await fetch('/api/user/location', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        latitude,
        longitude
      })
    });

    console.log('Location updated:', latitude, longitude);
  } catch (error) {
    console.log('Location update failed:', error);
  }
}

// Helper function to reset location permission (for settings/testing)
export function resetLocationPermission() {
  localStorage.removeItem(LOCATION_PERMISSION_KEY);
  console.log('Location permission reset - will prompt again on next request');
}

// Helper function to check current permission status
export function getLocationPermissionStatus(): 'granted' | 'denied' | 'prompt' {
  const status = localStorage.getItem(LOCATION_PERMISSION_KEY);
  return (status as 'granted' | 'denied') || 'prompt';
}
