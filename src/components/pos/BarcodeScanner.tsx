import { useState, useEffect, useRef } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScanLine, X, Camera, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, isOpen, onClose }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !scannerRef.current) {
      initScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const initScanner = async () => {
    try {
      setError(null);
      const scannerId = "barcode-scanner-container";
      
      // Wait for DOM element to be ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const scanner = new Html5Qrcode(scannerId);
      scannerRef.current = scanner;
      
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.5,
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        (errorMessage) => {
          // Ignore scan errors - these happen frequently when no barcode is in view
        }
      );
      
      setIsScanning(true);
    } catch (err: any) {
      console.error("Scanner init error:", err);
      setError(err.message || "Failed to initialize camera");
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleScanSuccess = (barcode: string) => {
    // Vibrate on successful scan if supported
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
    
    toast.success(`Scanned: ${barcode}`);
    onScan(barcode);
    handleClose();
  };

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  const handleRetry = () => {
    stopScanner().then(() => {
      initScanner();
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            Scan Barcode/QR Code
          </DialogTitle>
        </DialogHeader>
        
        <div className="relative bg-black">
          {/* Scanner Container */}
          <div 
            id="barcode-scanner-container" 
            ref={containerRef}
            className="w-full aspect-[4/3]"
          />
          
          {/* Scanning overlay indicator */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-32 border-2 border-primary rounded-lg relative">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary animate-scan" />
              </div>
            </div>
          )}
          
          {/* Error state */}
          {error && (
            <div className="absolute inset-0 bg-background/90 flex flex-col items-center justify-center p-4 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={handleRetry} variant="outline" size="sm">
                <Camera className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          )}
        </div>
        
        <div className="p-4 pt-2 flex flex-col gap-2">
          <p className="text-xs text-muted-foreground text-center">
            Point your camera at a barcode or QR code
          </p>
          <Button variant="outline" onClick={handleClose} className="w-full">
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Trigger button component for easy integration
interface ScanTriggerButtonProps {
  onScan: (barcode: string) => void;
  className?: string;
}

export function ScanTriggerButton({ onScan, className }: ScanTriggerButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <Button 
        variant="outline" 
        size="icon" 
        onClick={() => setIsOpen(true)}
        className={className}
      >
        <ScanLine className="h-5 w-5" />
      </Button>
      <BarcodeScanner 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        onScan={onScan}
      />
    </>
  );
}
