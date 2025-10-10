// Request location permission and update location if granted
export async function requestLocationPermission(): Promise<boolean> {
  if (!navigator.geolocation) {
    console.log('Geolocation not supported');
    return false;
  }

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
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
    return true;
  } catch (error) {
    console.log('Location permission denied or failed:', error);
    return false;
  }
}

// Silently update location if permission already granted (no prompt)
export async function updateUserLocation() {
  if (!navigator.geolocation) {
    return;
  }

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 300000 // Use cached location up to 5 minutes old
      });
    });

    const { latitude, longitude } = position.coords;

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

    console.log('Location updated silently:', latitude, longitude);
  } catch (error) {
    // Silently fail - don't prompt user
    console.log('Silent location update failed:', error);
  }
}
