import { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Loader2 } from "lucide-react";
import Link from "next/link";

interface Video {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  publishedAt: string;
}

// Simple card components since we don't have the full shadcn/ui card components
const Card = ({ className = "", children }: { className?: string, children: React.ReactNode }) => (
  <div className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-col space-y-1.5 p-6">{children}</div>
);

const CardTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-2xl font-semibold leading-none tracking-tight">{children}</h3>
);

const CardDescription = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-muted-foreground">{children}</p>
);

const CardContent = ({ children }: { children: React.ReactNode }) => (
  <div className="p-6 pt-0">{children}</div>
);

const CardFooter = ({ className = "", children }: { className?: string, children: React.ReactNode }) => (
  <div className={`flex items-center p-6 pt-0 ${className}`}>{children}</div>
);

export const RandomVideoFeature = () => {
  const [loading, setLoading] = useState(false);
  const [randomVideo, setRandomVideo] = useState<Video | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRandomVideo = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // This would be replaced with an actual API endpoint that returns a random video
      // from the user's subscriptions or from previously summarized videos
      const response = await fetch("/api/random-video");
      
      if (!response.ok) {
        throw new Error("Failed to fetch random video");
      }
      
      const data = await response.json();
      setRandomVideo(data);
    } catch (err) {
      setError("Could not fetch a random video. Please try again later.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // For demo purposes, let's use some placeholder data
  useEffect(() => {
    const demoVideo = {
      id: "dQw4w9WgXcQ",
      title: "Sample YouTube Video",
      channelTitle: "Sample Channel",
      thumbnailUrl: "https://via.placeholder.com/320x180",
      publishedAt: new Date().toISOString(),
    };
    setRandomVideo(demoVideo);
  }, []);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Feeling Lucky?</CardTitle>
        <CardDescription>
          Discover a random video from your subscriptions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : randomVideo ? (
          <div className="space-y-4">
            <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
              <img 
                src={randomVideo.thumbnailUrl} 
                alt={randomVideo.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 className="font-medium text-lg">{randomVideo.title}</h3>
              <p className="text-sm text-gray-500">{randomVideo.channelTitle}</p>
            </div>
          </div>
        ) : error ? (
          <div className="py-8 text-center text-red-500">{error}</div>
        ) : null}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={fetchRandomVideo}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            "Get Another"
          )}
        </Button>
        {randomVideo && (
          <Button asChild>
            <Link href={`https://youtube.com/watch?v=${randomVideo.id}`} target="_blank">
              Watch Video
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default RandomVideoFeature; 