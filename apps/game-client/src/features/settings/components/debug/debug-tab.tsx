import type { FC } from "react";

export const DebugTab: FC = () => {
  const zoomFactor = window.getZoomFactor ? window.getZoomFactor() : null;

  return (
    <div className="ll:flex ll:flex-col ll:gap-4 ll:p-4">
      <div>
        <h3 className="ll:text-lg ll:font-semibold ll:mb-2">Zoom Factor</h3>
        <p className="ll:text-sm">
          {zoomFactor !== null ? `${zoomFactor}` : "brak danych"}
        </p>
      </div>
    </div>
  );
};
