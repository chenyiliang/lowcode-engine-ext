import { common } from '@alilc/lowcode-engine';
import enUS from './en-US.json';
import zhCN from './zh-CN.json';

const { intl } = common?.utils?.createIntl?.({
  'en-US': enUS,
  'zh-CN': zhCN,
}) || {
  // 兜底实现：直接用中文语言包按 key 取值
  intl: (id: string): string => {
    return (zhCN as Record<string, string>)[id];
  }
};

export { intl };
