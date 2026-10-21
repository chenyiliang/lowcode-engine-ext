import React, { useState } from 'react';
import { Switch, Input, Box } from '@alifd/next';
import { IPublicModelSettingTarget } from '@alilc/lowcode-types';

import './index.scss';

/**
 * 导出该接口：TitleSetter 是本包 default export（并被 `engineExt` 再导出），
 * 声明文件生成器需要能按名字引用它的 props 类型，否则报 TS4023「cannot be named」。
 */
export interface TitleSetterProps {
  field?: IPublicModelSettingTarget;
  prop?: IPublicModelSettingTarget;
  value: string;
  defaultValue: string;
  defaultChecked?: boolean;
  onChange: Function;
}

/**
 * 运行时的 SettingField 上有 `getHotValue`（designer 内部 API），
 * 但公开的 `IPublicModelSettingTarget` 类型没有声明它。
 * 代码里已经用 `?.()` 做了防御式调用，这里把该方法作为可选项补进本地类型，
 * 而不是在调用点做 `as any` 断言。
 */
type SettingTargetWithHotValue = IPublicModelSettingTarget & {
  getHotValue?: () => any;
};

const TitleSetter = (props: TitleSetterProps) => {
  const { value, defaultValue, defaultChecked, onChange, field, prop } = props;
  const [checked, setChecked] = useState(defaultChecked);
  const target = (field || prop) as SettingTargetWithHotValue | undefined;
  const theVal = target?.getHotValue?.() || defaultValue || value;

  const handleToggle = (vis: boolean) => {
    onChange?.(vis ? theVal : '');
    setChecked(vis);
  };
  // Fusion Input.onChange 回传 `(value: string | number, e, reason?)`，
  // 这里把处理函数入参放宽到 Fusion 的真实签名，再窄化成字符串。
  const handleChangeText = (text: string | number) => {
    onChange?.(String(text));
  };

  return (
    <Box className="setter-title" direction="row" align="center" spacing={10}>
      <Switch size="small" checked={checked} onChange={handleToggle} />
      {checked && <Input size="small" value={theVal} onChange={handleChangeText} />}
    </Box>
  );
};

export default TitleSetter;
