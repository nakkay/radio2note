class AudioCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.frameCount = 0;
  }

  process(inputs, outputs) {
    const input = inputs[0];
    if (input && input.length > 0 && input[0] && input[0].length > 0) {
      const inputData = input[0];
      this.frameCount++;
      
      // Float32をInt16に変換
      const int16Data = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      // RMS計算用にFloat32Arrayも送信
      const float32Copy = new Float32Array(inputData.length);
      float32Copy.set(inputData);

      // メインスレッドに送信
      this.port.postMessage({
        type: 'audioData',
        int16Data: int16Data.buffer,
        float32Data: float32Copy.buffer,
        frameCount: this.frameCount,
      }, [int16Data.buffer, float32Copy.buffer]);
    }
    return true;
  }
}

registerProcessor('audio-capture-processor', AudioCaptureProcessor);

