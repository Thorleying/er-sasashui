/**
 * 全站品牌 mark：双实体 + 关系菱形（Chen 记法）。
 * 小尺寸用填充实心 + 粗连线，保证顶栏 22px 下仍清晰。
 */
import type { SVGProps } from "react";

/** 24×24 视口 ER mark；currentColor 随徽章前景色。 */
export function BrandMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <g fill="currentColor">
        <rect x="1.5" y="3.5" width="10" height="6" rx="1.4" />
        <rect x="12.5" y="3.5" width="10" height="6" rx="1.4" />
        <path d="M12 13.5 16.2 17.7 12 21.9 7.8 17.7Z" />
      </g>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6.5 9.5 10.4 13.2" />
        <path d="M17.5 9.5 13.6 13.2" />
      </g>
    </svg>
  );
}
