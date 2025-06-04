import Quagga from 'quagga';

/**
 * Scans a blob for barcodes using Quagga
 * @param imageBlob - The image blob to scan
 * @returns A promise that resolves to the barcode string or null if not found
 */
export const scanBlobForBarcode = (imageBlob: Blob): Promise<string | null> => {
  return new Promise((resolve, reject) => {
    // Convert blob to URL for Quagga
    const imageUrl = URL.createObjectURL(imageBlob);
    
    // Configure Quagga
    Quagga.decodeSingle({
      decoder: {
        readers: [
          "ean_reader", // For EAN-13 codes (common product barcodes)
          "ean_8_reader", // For EAN-8 codes
          "upc_reader", // For UPC-A codes
          "upc_e_reader", // For UPC-E codes
          "code_128_reader", // Code 128
          "code_39_reader", // Code 39
          "code_93_reader", // Code 93
          "codabar_reader", // Codabar
          "i2of5_reader" // Interleaved 2 of 5
        ],
        multiple: false // Only detect the first barcode
      },
      locate: true, // Try to locate the barcode in the image
      src: imageUrl
    }, (result: any) => {
      // Clean up the created URL
      URL.revokeObjectURL(imageUrl);
      
      if (result && result.codeResult) {
        resolve(result.codeResult.code);
      } else {
        resolve(null); // No barcode found
      }
    });
  });
};

/**
 * Sets up a live barcode scanner on a video element
 * @param videoElement - The video element to scan
 * @param onDetected - Callback function when a barcode is detected
 */
export const setupLiveBarcodeScanner = (
  videoElement: HTMLVideoElement,
  onDetected: (barcode: string) => void
): Promise<void> => {
  return new Promise((resolve, reject) => {
    Quagga.init({
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: videoElement,
        constraints: {
          facingMode: "environment" // Use back camera on mobile
        }
      },
      decoder: {
        readers: [
          "ean_reader",
          "ean_8_reader",
          "upc_reader",
          "upc_e_reader",
          "code_128_reader"
        ],
        multiple: false
      },
      locate: true
    }, (err: any) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Start Quagga
      Quagga.start();
      
      // Register callback for detection
      Quagga.onDetected((result: any) => {
        if (result && result.codeResult) {
          onDetected(result.codeResult.code);
        }
      });
      
      resolve();
    });
  });
};

/**
 * Stops the live barcode scanner
 */
export const stopBarcodeScanner = (): void => {
  Quagga.stop();
};
