export async function updateUserLocation() {
  if (!navigator.geolocation) {
    console.log('Geolocation not supported');
    return;
  }

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      });
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
