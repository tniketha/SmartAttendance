import React, { useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import jsQR from 'jsqr';
import { Button } from '../common/Button';
interface CameraProps { active: boolean; disabled: boolean; onScan: (value: { data: string }) => void; onError: (message: string) => void; }
// Bundle decoding locally; never load executable scanner code from a third-party CDN.
export function AttendanceCamera({ active, disabled, onScan, onError }: CameraProps) {
  const video = useRef<HTMLVideoElement>(null);
  const callback = useRef({ disabled, onScan, onError });
  callback.current = { disabled, onScan, onError };
  const [attempt, retry] = useState(0);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!active) return;
    let stopped = false;
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setTimeout>;
    const canvas = document.createElement('canvas');
    const scan = () => {
      if (stopped) return;
      const v = video.current;
      if (v && v.readyState >= 2 && !callback.current.disabled) {
        canvas.width = 640; canvas.height = Math.round(640 * v.videoHeight / v.videoWidth);
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (context && canvas.height) {
          context.drawImage(v, 0, 0, canvas.width, canvas.height);
          const frame = context.getImageData(0, 0, canvas.width, canvas.height);
          const result = jsQR(frame.data, frame.width, frame.height);
          if (result) callback.current.onScan({ data: result.data });
        }
      }
      timer = setTimeout(scan, 180);
    };
    const start = async () => {
      try {
        setError('');
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access needs HTTPS or localhost and a supported browser.');
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (stopped) { stream.getTracks().forEach(t => t.stop()); return; }
        if (video.current) { video.current.srcObject = stream; await video.current.play(); }
        scan();
      } catch (e: any) {
        if (!stopped) setError(e.name === 'NotAllowedError' ? 'Camera permission was blocked. Allow camera access in your browser settings, then retry.' : e.message || 'Camera unavailable.');
      }
    };
    void start();
    return () => { stopped = true; clearTimeout(timer); stream?.getTracks().forEach(t => t.stop()); };
  }, [active, attempt]);
  if (!active) return null;
  return <>
    <video ref={video} muted playsInline aria-label="Attendance QR camera" style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' }} />
    {!!error && <View style={{ position: 'absolute', inset: 0, justifyContent: 'center', padding: 24, backgroundColor: '#0B1220', zIndex: 2 }}>
      <Text accessibilityRole="alert" style={{ color: '#FFFFFF', textAlign: 'center' }}>{error}</Text>
      <Button title="Retry camera" onPress={() => retry(n => n + 1)} />
    </View>}
  </>;
}
