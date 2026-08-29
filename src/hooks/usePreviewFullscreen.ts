import { useCallback, useEffect, useRef, useState } from "react";

const BODY_IMMERSIVE_CLASS = "editor-preview-immersive";

function getFullscreenElement(): Element | null {
  return (
    document.fullscreenElement ??
    (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement ??
    null
  );
}

async function requestElementFullscreen(el: HTMLElement): Promise<boolean> {
  const request =
    el.requestFullscreen?.bind(el) ??
    (el as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen?.bind(
      el,
    );

  if (!request) return false;

  try {
    await request();
    return getFullscreenElement() === el;
  } catch {
    return false;
  }
}

/**
 * 预览区全屏：优先原生 Fullscreen API；不支持时回退 fixed 沉浸层（兼容 iOS）。
 */
export function usePreviewFullscreen() {
  const targetRef = useRef<HTMLDivElement>(null);
  const [immersive, setImmersive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const exitFullscreen = useCallback(async () => {
    if (getFullscreenElement()) {
      try {
        await document.exitFullscreen();
      } catch {
        /* 忽略退出失败，仍清理沉浸态 */
      }
    }
    setImmersive(false);
    document.body.classList.remove(BODY_IMMERSIVE_CLASS);
    setIsFullscreen(false);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = targetRef.current;
    if (!el) return;

    if (isFullscreen) {
      await exitFullscreen();
      return;
    }

    const entered = await requestElementFullscreen(el);
    if (entered) {
      setImmersive(false);
      document.body.classList.remove(BODY_IMMERSIVE_CLASS);
      setIsFullscreen(true);
      return;
    }

    setImmersive(true);
    document.body.classList.add(BODY_IMMERSIVE_CLASS);
    setIsFullscreen(true);
  }, [exitFullscreen, isFullscreen]);

  useEffect(() => {
    const sync = () => {
      const el = targetRef.current;
      const nativeActive = el != null && getFullscreenElement() === el;
      if (nativeActive) {
        setImmersive(false);
        document.body.classList.remove(BODY_IMMERSIVE_CLASS);
        setIsFullscreen(true);
        return;
      }
      setIsFullscreen(immersive);
      if (!immersive) {
        document.body.classList.remove(BODY_IMMERSIVE_CLASS);
      }
    };

    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, [immersive]);

  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") void exitFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [exitFullscreen, isFullscreen]);

  useEffect(() => () => void exitFullscreen(), [exitFullscreen]);

  return { targetRef, isFullscreen, toggleFullscreen, exitFullscreen };
}
