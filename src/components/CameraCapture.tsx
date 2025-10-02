import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, X, Check, RotateCcw, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface CameraCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (file: File) => void;
}

type FilterType = 'none' | 'grayscale' | 'sepia' | 'vintage' | 'cool' | 'warm' | 'vibrant' | 'dreamy';

const filters: { name: FilterType; label: string; style: string }[] = [
  { name: 'none', label: 'Original', style: 'none' },
  { name: 'grayscale', label: 'B&W', style: 'grayscale(100%)' },
  { name: 'sepia', label: 'Sepia', style: 'sepia(100%)' },
  { name: 'vintage', label: 'Vintage', style: 'sepia(50%) contrast(0.9) brightness(1.1)' },
  { name: 'cool', label: 'Cool', style: 'brightness(1.1) contrast(1.1) saturate(1.2) hue-rotate(180deg)' },
  { name: 'warm', label: 'Warm', style: 'brightness(1.1) contrast(1.05) saturate(1.3) sepia(20%)' },
  { name: 'vibrant', label: 'Vibrant', style: 'saturate(2) contrast(1.2)' },
  { name: 'dreamy', label: 'Dreamy', style: 'brightness(1.15) saturate(0.8) contrast(0.9) blur(0.5px)' },
];

export const CameraCapture = ({ open, onOpenChange, onCapture }: CameraCaptureProps) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('none');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
      setCapturedImage(null);
      setSelectedFilter('none');
    }

    return () => stopCamera();
  }, [open, facingMode]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false,
      });
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error: any) {
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please check permissions.",
        variant: "destructive",
      });
      console.error("Camera error:", error);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Apply filter to canvas
    const filterStyle = filters.find(f => f.name === selectedFilter)?.style || 'none';
    context.filter = filterStyle;
    
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedImage(imageDataUrl);
    stopCamera();
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const confirmCapture = async () => {
    if (!capturedImage) return;

    try {
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      onCapture(file);
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to process captured image",
        variant: "destructive",
      });
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const currentFilterStyle = filters.find(f => f.name === selectedFilter)?.style || 'none';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Camera
          </DialogTitle>
        </DialogHeader>
        
        <div className="relative bg-black">
          {!capturedImage ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-[400px] object-cover"
                style={{ filter: currentFilterStyle }}
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Filter Selection */}
              <div className="absolute bottom-20 left-0 right-0 px-4">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {filters.map((filter) => (
                    <Badge
                      key={filter.name}
                      variant={selectedFilter === filter.name ? "default" : "outline"}
                      className="cursor-pointer whitespace-nowrap backdrop-blur-sm bg-background/60 hover:bg-background/80"
                      onClick={() => setSelectedFilter(filter.name)}
                    >
                      {filter.name === 'none' ? '✨' : '🎨'} {filter.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Camera Controls */}
              <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4 px-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleCamera}
                  className="rounded-full bg-background/60 backdrop-blur-sm hover:bg-background/80"
                >
                  <RotateCcw className="w-5 h-5" />
                </Button>
                
                <Button
                  onClick={capturePhoto}
                  size="icon"
                  className="w-16 h-16 rounded-full bg-white hover:bg-white/90 border-4 border-background shadow-lg"
                >
                  <Camera className="w-8 h-8 text-black" />
                </Button>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                  className="rounded-full bg-background/60 backdrop-blur-sm hover:bg-background/80"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full h-[400px] object-cover"
              />
              
              {/* Confirm/Retake Controls */}
              <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4 px-4">
                <Button
                  variant="outline"
                  onClick={retakePhoto}
                  className="rounded-full bg-background/60 backdrop-blur-sm hover:bg-background/80"
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Retake
                </Button>
                
                <Button
                  onClick={confirmCapture}
                  className="rounded-full bg-gradient-primary shadow-lg"
                >
                  <Check className="w-5 h-5 mr-2" />
                  Use Photo
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};