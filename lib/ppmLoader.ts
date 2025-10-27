export interface PPMData {
  width: number;
  height: number;
  maxVal: number;
  format: 'P3' | 'P6';
  pixels: Uint8ClampedArray;
}

export class PPMLoader {
  static async loadFromFile(file: File): Promise<PPMData> {
    const buffer = await file.arrayBuffer();
    return this.parseBuffer(new Uint8Array(buffer));
  }

  private static parseBuffer(buffer: Uint8Array): PPMData {
    let position = 0;

    const skipWhitespaceAndComments = () => {
      while (position < buffer.length) {
        const char = buffer[position];
        if (char === 32 || char === 9 || char === 10 || char === 13) {
          position++;
          continue;
        }
        if (char === 35) {
          while (position < buffer.length && buffer[position] !== 10) {
            position++;
          }
          continue;
        }
        break;
      }
    };

    const readToken = (): string => {
      skipWhitespaceAndComments();
      const start = position;
      while (position < buffer.length) {
        const char = buffer[position];
        if (char === 32 || char === 9 || char === 10 || char === 13 || char === 35) {
          break;
        }
        position++;
      }
      return String.fromCharCode(...buffer.slice(start, position));
    };

    const magicNumber = readToken();
    if (magicNumber !== 'P3' && magicNumber !== 'P6') {
      throw new Error(`Unsupported format: ${magicNumber}`);
    }

    const isP3 = magicNumber === 'P3';
    const width = parseInt(readToken(), 10);
    const height = parseInt(readToken(), 10);
    const maxVal = parseInt(readToken(), 10);

    if (!width || !height || width <= 0 || height <= 0) {
      throw new Error('Invalid PPM dimensions');
    }
    if (!maxVal || maxVal <= 0 || maxVal > 65535) {
      throw new Error('Invalid PPM max color value');
    }

    skipWhitespaceAndComments();

    const rgbaData = new Uint8ClampedArray(width * height * 4);

    if (isP3) {
      this.parseP3Data(buffer, position, width, height, maxVal, rgbaData);
    } else {
      this.parseP6Data(buffer, position, width, height, maxVal, rgbaData);
    }

    return { width, height, maxVal, format: magicNumber as 'P3' | 'P6', pixels: rgbaData };
  }

  private static parseP3Data(buffer: Uint8Array, position: number, width: number, height: number, maxVal: number, rgbaData: Uint8ClampedArray) {
    // Blokowe tokenizowanie: szybkie przetwarzanie liczb bez stringów
    const tokens = new Uint16Array(width * height * 3);
    let tokenIdx = 0;
    let value = 0;
    let inToken = false;
    for (let i = position; i < buffer.length && tokenIdx < tokens.length; i++) {
      const char = buffer[i];
      if (char >= 48 && char <= 57) { // '0'-'9'
        value = value * 10 + (char - 48);
        inToken = true;
      } else if (char === 35) { // #
        while (i < buffer.length && buffer[i] !== 10) i++;
        if (inToken) {
          tokens[tokenIdx++] = value;
          value = 0;
          inToken = false;
        }
      } else if (char === 32 || char === 9 || char === 10 || char === 13) {
        if (inToken) {
          tokens[tokenIdx++] = value;
          value = 0;
          inToken = false;
        }
      }
    }
    if (inToken && tokenIdx < tokens.length) tokens[tokenIdx++] = value;

    const scale = maxVal === 255 ? 1 : 255 / maxVal;
    for (let i = 0; i < width * height; i++) {
      const r = Math.min(255, Math.round(tokens[i * 3] * scale));
      const g = Math.min(255, Math.round(tokens[i * 3 + 1] * scale));
      const b = Math.min(255, Math.round(tokens[i * 3 + 2] * scale));
      rgbaData[i * 4] = r;
      rgbaData[i * 4 + 1] = g;
      rgbaData[i * 4 + 2] = b;
      rgbaData[i * 4 + 3] = 255;
    }
  }

  private static parseP6Data(buffer: Uint8Array, position: number, width: number, height: number, maxVal: number, rgbaData: Uint8ClampedArray) {
    // Blokowe kopiowanie dla P6
    const scale = maxVal === 255 ? 1 : 255 / maxVal;
    const bytesPerSample = maxVal > 255 ? 2 : 1;
    const pixelCount = width * height;
    if (bytesPerSample === 1) {
      // Szybkie kopiowanie bloków
      let src = position;
      let dst = 0;
      const end = src + pixelCount * 3;
      while (src + 2 < end) {
        rgbaData[dst++] = Math.min(255, Math.round(buffer[src++] * scale)); // R
        rgbaData[dst++] = Math.min(255, Math.round(buffer[src++] * scale)); // G
        rgbaData[dst++] = Math.min(255, Math.round(buffer[src++] * scale)); // B
        rgbaData[dst++] = 255;
      }
    } else {
      // 16-bit na kanał
      let src = position;
      let dst = 0;
      for (let i = 0; i < pixelCount; i++) {
        const r = ((buffer[src++] << 8) | buffer[src++]) || 0;
        const g = ((buffer[src++] << 8) | buffer[src++]) || 0;
        const b = ((buffer[src++] << 8) | buffer[src++]) || 0;
        rgbaData[dst++] = Math.min(255, Math.round(r * scale));
        rgbaData[dst++] = Math.min(255, Math.round(g * scale));
        rgbaData[dst++] = Math.min(255, Math.round(b * scale));
        rgbaData[dst++] = 255;
      }
    }
  }
}
