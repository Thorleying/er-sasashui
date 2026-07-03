interface PreviewLegendFitMetrics {
  headerWidth: number;
  horizontalPadding: number;
  titleWidth: number;
  legendWidth: number;
  actionsWidth: number;
  gap: number;
}

export function canPlaceLegendInPreviewHeader({
  headerWidth,
  horizontalPadding,
  titleWidth,
  legendWidth,
  actionsWidth,
  gap,
}: PreviewLegendFitMetrics): boolean {
  const contentWidth = headerWidth - horizontalPadding;
  const availableMiddleWidth = contentWidth - titleWidth - actionsWidth - gap * 2;
  return legendWidth <= availableMiddleWidth;
}
