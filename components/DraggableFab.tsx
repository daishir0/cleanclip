import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, View, LayoutChangeEvent } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FAB_SIZE = 56;
const EDGE_MARGIN = 12;
const TAP_SLOP = 8;
const POSITION_KEY = 'cleanclip_fab_position_v1';

interface Props {
  onPress: () => void;
  bottomInset: number;
  backgroundColor: string;
  accessibilityLabel: string;
  children: React.ReactNode;
}

type Ratio = { xr: number; yr: number };

function parseRatio(raw: string | null): Ratio | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    if (typeof p?.xr === 'number' && typeof p?.yr === 'number') {
      return { xr: Math.min(1, Math.max(0, p.xr)), yr: Math.min(1, Math.max(0, p.yr)) };
    }
  } catch {}
  return null;
}

export function DraggableFab({ onPress, bottomInset, backgroundColor, accessibilityLabel, children }: Props) {
  const [ready, setReady] = useState(false);
  const pan = useRef(new Animated.ValueXY()).current;
  const posRef = useRef({ x: 0, y: 0 });
  const layoutRef = useRef<{ w: number; h: number } | null>(null);
  const ratioRef = useRef<Ratio | null>(null);
  const ratioLoadedRef = useRef(false);
  const bottomInsetRef = useRef(bottomInset);
  bottomInsetRef.current = bottomInset;
  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;

  const bounds = useCallback(() => {
    const layout = layoutRef.current ?? { w: FAB_SIZE, h: FAB_SIZE };
    return {
      minX: EDGE_MARGIN,
      maxX: Math.max(EDGE_MARGIN, layout.w - FAB_SIZE - EDGE_MARGIN),
      minY: EDGE_MARGIN,
      maxY: Math.max(EDGE_MARGIN, layout.h - FAB_SIZE),
    };
  }, []);

  const clamp = useCallback((x: number, y: number) => {
    const b = bounds();
    return {
      x: Math.min(b.maxX, Math.max(b.minX, x)),
      y: Math.min(b.maxY, Math.max(b.minY, y)),
    };
  }, [bounds]);

  const applyPosition = useCallback(() => {
    if (!layoutRef.current || !ratioLoadedRef.current) return;
    const b = bounds();
    let x: number;
    let y: number;
    if (ratioRef.current) {
      x = b.minX + ratioRef.current.xr * (b.maxX - b.minX);
      y = b.minY + ratioRef.current.yr * (b.maxY - b.minY);
    } else {
      x = b.maxX - (20 - EDGE_MARGIN);
      y = layoutRef.current.h - FAB_SIZE - bottomInsetRef.current - 16;
    }
    const clamped = clamp(x, y);
    posRef.current = clamped;
    pan.setOffset({ x: 0, y: 0 });
    pan.setValue(clamped);
    setReady(true);
  }, [bounds, clamp, pan]);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(POSITION_KEY)
      .then(raw => {
        if (cancelled) return;
        ratioRef.current = parseRatio(raw);
      })
      .catch(() => {})
      .finally(() => {
        if (cancelled) return;
        ratioLoadedRef.current = true;
        applyPosition();
      });
    return () => { cancelled = true; };
  }, [applyPosition]);

  useEffect(() => {
    applyPosition();
  }, [bottomInset, applyPosition]);

  const persist = useCallback((x: number, y: number) => {
    const b = bounds();
    const xr = b.maxX > b.minX ? (x - b.minX) / (b.maxX - b.minX) : 0;
    const yr = b.maxY > b.minY ? (y - b.minY) / (b.maxY - b.minY) : 0;
    ratioRef.current = { xr, yr };
    AsyncStorage.setItem(POSITION_KEY, JSON.stringify({ xr, yr })).catch(() => {});
  }, [bounds]);

  const clampRef = useRef(clamp);
  clampRef.current = clamp;
  const persistRef = useRef(persist);
  persistRef.current = persist;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > TAP_SLOP || Math.abs(g.dy) > TAP_SLOP,
      onPanResponderGrant: () => {
        pan.setOffset(posRef.current);
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_e, g) => {
        pan.flattenOffset();
        const moved = Math.hypot(g.dx, g.dy);
        const next = clampRef.current(posRef.current.x + g.dx, posRef.current.y + g.dy);
        posRef.current = next;
        pan.setValue(next);
        if (moved < TAP_SLOP) {
          onPressRef.current();
        } else {
          persistRef.current(next.x, next.y);
        }
      },
      onPanResponderTerminate: () => {
        pan.flattenOffset();
        const next = clampRef.current(posRef.current.x, posRef.current.y);
        posRef.current = next;
        pan.setValue(next);
      },
    })
  ).current;

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (!width || !height) return;
    const prev = layoutRef.current;
    layoutRef.current = { w: width, h: height };
    if (!prev || prev.w !== width || prev.h !== height) applyPosition();
  }, [applyPosition]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" onLayout={handleLayout}>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.fab,
          { backgroundColor, opacity: ready ? 1 : 0, transform: pan.getTranslateTransform() },
        ]}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
