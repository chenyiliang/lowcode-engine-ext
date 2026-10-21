import { ReactNode } from "react"
// 用公共 API 类型而非 designer 内部类：本包是引擎的外部插件，应消费 IPublic* 契约。
// engine 的 `SettingField` 导出的是 designer 的内部类型（ISettingField 显式 Omit 了 'node'），
// 只有 nodes/getNode()，没有 node；而本包 setter 需要 field.node。
import type { IPublicModelSettingField } from '@alilc/lowcode-types';

class MixedSetterConfig {
  config: {
    renderSlot?: (props: {bindCode?: string, field?: IPublicModelSettingField}) => ReactNode
  } = {}

  setConfig(config: {
    renderSlot?: (props: {bindCode?: string, field?: IPublicModelSettingField}) => ReactNode
  }) {
    this.config = config;
  }
}

export const MixedSetterController = new MixedSetterConfig()
