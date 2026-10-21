export interface StyleData {
  styleKey: string;
  /**
   * `null` / `undefined` 是合法取值：调用方用它表示"删除该样式项"
   * （见 style-setter/index.tsx 的 onStyleChange：值为空时 delete 对应 key）。
   */
  value: string | number | boolean | null | undefined;
}

export interface RadioItem {
  value: string;
  icon?: string;
  title?: string;
  tips: string;
}

export interface onStyleChange {
  (styleDataList: Array<StyleData>): void;
}
