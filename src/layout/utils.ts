/**
 * Layout Utilities Module
 * Contains common utility functions for layout calculations:
 * - Deterministic hash and random number generation
 * - Angle normalization (re-exported from the shared geometry module)
 * - Node radius calculation
 */
import type { GraphNodeLike } from "../types";

export { normalizeAngle } from "./geometry";

/**
 * 基于字符串生成确定性哈希值（用于替代Math.random）
 * @param {string} str - 输入字符串
 * @param {number} extraSeed - 额外的种子值
 * @returns {number} 哈希值
 */
export const deterministicHash = (str: string, extraSeed = 0): number => {
  let hash = extraSeed;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

/**
 * 生成确定性的[-0.5, 0.5)范围内的数值
 * @param {number} seed - 种子值
 * @param {number} extraSeed - 额外的种子值
 * @returns {number} 确定性随机数
 */
export const deterministicRandom = (seed: number, extraSeed = 0): number => {
  const x = Math.sin(seed + extraSeed * 1000) * 10000;
  return x - Math.floor(x) - 0.5;
};

/**
 * 计算节点的半径（基于边界框的对角线）
 * @param {Object} node - G6 节点实例
 * @returns {number} 节点半径
 */
export const getRadius = (node?: GraphNodeLike | null): number => {
  if (!node) return 30;
  const bbox = node.getBBox();
  return Math.sqrt(bbox.width * bbox.width + bbox.height * bbox.height) / 2;
};
