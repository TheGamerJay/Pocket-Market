import React, { useEffect, useState } from "react";
import { haversineMiles } from "../utils/distance.js";

export default function DistanceLabel({ listing }) {
  const [me, setMe] = useState(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setMe({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setMe(null),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  if (!listing?.lat || !listing?.lng) return <span>{listing?.zip || listing?.city || "Nearby"}</span>;
  if (!me) return <span>{listing?.zip || listing?.city || "Nearby"}</span>;

  const miles = haversineMiles(me.lat, me.lng, listing.lat, listing.lng);
  return <span>{miles.toFixed(1)} miles away</span>;
}
