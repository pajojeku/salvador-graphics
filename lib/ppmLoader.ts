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
    const tokens: number[] = [];
    let current = '';

    for (let i = position; i < buffer.length; i++) {
      const char = buffer[i];
      if (char === 32 || char === 9 || char === 10 || char === 13) {
        if (current) {
          tokens.push(parseInt(current, 10));
          current = '';
        }
      } else if (char === 35) {
        if (current) {
          tokens.push(parseInt(current, 10));
          current = '';
        }
        while (i < buffer.length && buffer[i] !== 10) i++;
      } else {
        current += String.fromCharCode(char);
      }
    }
    if (current) tokens.push(parseInt(current, 10));

    const scale = maxVal === 255 ? 1 : 255 / maxVal;
    for (let i = 0; i < width * height; i++) {
      const r = Math.min(255, Math.round((tokens[i * 3] || 0) * scale));
      const g = Math.min(255, Math.round((tokens[i * 3 + 1] || 0) * scale));
      const b = Math.min(255, Math.round((tokens[i * 3 + 2] || 0) * scale));
      rgbaData[i * 4] = r;
      rgbaData[i * 4 + 1] = g;
      rgbaData[i * 4 + 2] = b;
      rgbaData[i * 4 + 3] = 255;
    }
  }

  private static parseP6Data(buffer: Uint8Array, position: number, width: number, height: number, maxVal: number, rgbaData: Uint8ClampedArray) {
    const scale = maxVal === 255 ? 1 : 255 / maxVal;
    const bytesPerSample = maxVal > 255 ? 2 : 1;
    
    for (let i = 0; i < width * height; i++) {
      let r, g, b;
      if (bytesPerSample === 1) {
        r = buffer[position++] || 0;
        g = buffer[position++] || 0;
        b = buffer[position++] || 0;
      } else {
        r = ((buffer[position++] || 0) << 8) | (buffer[position++] || 0);
        g = ((buffer[position++] || 0) << 8) | (buffer[position++] || 0);
        b = ((buffer[position++] || 0) << 8) | (buffer[position++] || 0);
      }
      
      rgbaData[i * 4] = Math.min(255, Math.round(r * scale));
      rgbaData[i * 4 + 1] = Math.min(255, Math.round(g * scale));
      rgbaData[i * 4 + 2] = Math.min(255, Math.round(b * scale));
      rgbaData[i * 4 + 3] = 255;
    }
  }
}
