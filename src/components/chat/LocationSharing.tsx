import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MapPin, Navigation, X } from "lucide-react";
import { toast } from "sonner";

interface LocationSharingProps {
  onLocationShare: (location: { lat: number; lng: number; address?: string }) => void;
  disabled?: boolean;
}

interface SharedLocation {
  lat: number;
  lng: number;
  address?: string;
}

export const LocationSharing = ({ onLocationShare, disabled }: LocationSharingProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState<SharedLocation | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Try to get address using reverse geocoding (free service)
        let address = "";
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          address = data.display_name || "";
        } catch (error) {
          console.log("Could not fetch address");
        }

        setLocation({ lat: latitude, lng: longitude, address });
        setIsLoading(false);
      },
      (error) => {
        setIsLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error("Location permission denied. Please enable location access.");
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error("Location information is unavailable.");
            break;
          case error.TIMEOUT:
            toast.error("Location request timed out.");
            break;
          default:
            toast.error("An unknown error occurred.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const shareLocation = () => {
    if (location) {
      onLocationShare(location);
      setIsOpen(false);
      setLocation(null);
      toast.success("Location shared!");
    }
  };

  const getMapUrl = (lat: number, lng: number) => {
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01}%2C${lat - 0.01}%2C${lng + 0.01}%2C${lat + 0.01}&layer=mapnik&marker=${lat}%2C${lng}`;
  };

  const getGoogleMapsLink = (lat: number, lng: number) => {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled}
          title="Share Location"
        >
          <MapPin className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-accent" />
            Share Your Location
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!location ? (
            <div className="text-center py-8">
              <MapPin className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground mb-4">
                Share your current location with the chat. Your location will only be shared when you confirm.
              </p>
              <Button
                onClick={getCurrentLocation}
                disabled={isLoading}
                className="accent-glow"
              >
                {isLoading ? (
                  <>
                    <Navigation className="mr-2 h-4 w-4 animate-spin" />
                    Getting Location...
                  </>
                ) : (
                  <>
                    <Navigation className="mr-2 h-4 w-4" />
                    Get My Location
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Map Preview */}
              <div className="rounded-lg overflow-hidden border border-border">
                <iframe
                  title="Location Preview"
                  width="100%"
                  height="200"
                  frameBorder="0"
                  scrolling="no"
                  src={getMapUrl(location.lat, location.lng)}
                  className="bg-muted"
                />
              </div>

              {/* Location Details */}
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-accent mt-1 shrink-0" />
                  <div className="flex-1 min-w-0">
                    {location.address ? (
                      <p className="text-sm">{location.address}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
                      </p>
                    )}
                    <a
                      href={getGoogleMapsLink(location.lat, location.lng)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      Open in Google Maps
                    </a>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setLocation(null)}
                  className="flex-1"
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button onClick={shareLocation} className="flex-1 accent-glow">
                  <MapPin className="mr-2 h-4 w-4" />
                  Share Location
                </Button>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Your privacy is important. Location is shared only when you confirm.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Component to display shared location in chat
interface LocationMessageProps {
  lat: number;
  lng: number;
  address?: string;
}

export const LocationMessage = ({ lat, lng, address }: LocationMessageProps) => {
  const getGoogleMapsLink = (lat: number, lng: number) => {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  };

  const getStaticMapUrl = (lat: number, lng: number) => {
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.005}%2C${lat - 0.005}%2C${lng + 0.005}%2C${lat + 0.005}&layer=mapnik&marker=${lat}%2C${lng}`;
  };

  return (
    <div className="rounded-lg overflow-hidden border border-border/50 bg-background">
      <iframe
        title="Shared Location"
        width="100%"
        height="150"
        frameBorder="0"
        scrolling="no"
        src={getStaticMapUrl(lat, lng)}
        className="bg-muted"
      />
      <div className="p-2">
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-accent shrink-0" />
          <span className="truncate">
            {address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`}
          </span>
        </div>
        <a
          href={getGoogleMapsLink(lat, lng)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline mt-1 inline-block"
        >
          Open in Google Maps →
        </a>
      </div>
    </div>
  );
};

export default LocationSharing;
