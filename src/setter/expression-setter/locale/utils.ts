import IntlMessageFormat from 'intl-messageformat';

export const isJSExpression = (obj: any = ''): boolean => {
  if (obj && typeof obj === 'object' && obj.type === 'JSExpression') {
    return true;
  }
  return false;
};

/**
 * 用于构造国际化字符串处理函数
 * @param locale 国际化标识，例如 zh-CN、en-US
 * @param messages 国际化语言包（key -> ICU 模板串）
 */
export const generateI18n = (
  locale = 'zh-CN',
  messages: Record<string, string> = {},
) => {
  return function (key: string, values: Record<string, any> = {}): string {
    if (!messages || !messages[key]) return '';
    const formater = new IntlMessageFormat(messages[key], locale);
    // v12 的 format 可能返回 string / array，setter 场景只处理字符串
    const result = formater.format(values);
    return typeof result === 'string' ? result : String(result);
  };
};
