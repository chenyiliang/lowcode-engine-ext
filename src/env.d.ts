/**
 * 环境声明。
 *
 * 老构建栈（build-plugin-component + webpack css-loader）为 `import './x.less'` 提供类型，
 * 迁到 Vite 后没有 webpack 的类型注入，需要显式声明样式副作用导入。
 * 本文件放在 `src/` 下，保证 vite-plugin-dts 的 entryRoot 能带上它，
 * 发布出去的 `dist/index.d.ts` 不依赖消费方是否装了 vite。
 */

declare module '*.less' {
  const css: string;
  export default css;
}

declare module '*.scss' {
  const css: string;
  export default css;
}

declare module '*.css' {
  const css: string;
  export default css;
}

/**
 * cssjson 是 UMD 包，既没有自带类型，DefinitelyTyped 上也没有 @types/cssjson。
 * 这里按它实际的 `base.toJSON` / `base.toCSS` 接口手写声明，避免把调用点放宽成 any。
 */
declare module 'cssjson' {
  export interface CssJsonNode {
    children?: Record<string, CssJsonNode>;
    attributes?: Record<string, string>;
  }

  /** CSS 文本 -> JSON 树 */
  export function toJSON(cssText: string, options?: unknown): CssJsonNode;
  /** JSON 树 -> CSS 文本 */
  export function toCSS(node: CssJsonNode, depth?: number): string;
}

/**
 * 由 `vite.config.ts` 的 `define` 注入的包版本号。
 * 替代原先的 `import packagesInfo from '../package.json'`——
 * package.json 在 `src/` 之外，会让 vite-plugin-dts 把它的声明吐到 dist 之外。
 */
declare const __ENGINE_EXT_VERSION__: string;

interface Window {
  /**
   * 低代码引擎既有约定：ext 包把 setter 集合挂到 window 上，
   * 供 UMD/CDN 场景（`externals: { '@alilc/lowcode-engine-ext': 'var window.AliLowCodeEngineExt' }`）消费。
   */
  AliLowCodeEngineExt?: unknown;
  /** 宿主编辑器注入的 setter 开关 */
  lowcodeSetterSwitch?: {
    enablePropsEvents?: boolean;
    [key: string]: unknown;
  };
}
