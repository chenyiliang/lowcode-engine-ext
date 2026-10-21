import * as React from 'react';
import { useEffect, useState, useMemo } from 'react';
import { NumberPicker, Select } from '@alifd/next';
import { StyleData, onStyleChange } from '../../utils/types';
import {
  addUnit,
  removeUnit,
  isEmptyValue,
  getPlaceholderPropertyValue,
  unifyStyle,
  getUnit,
  isCssVarBind,
} from '../../utils';
import './index.less';

interface numberProps {
  styleKey: string;
  styleData: StyleData | any;
  onStyleChange?: onStyleChange;
  unit?: string | string[];
  min?: number;
  max?: number;
  style?: any;
  className?: string;
  field?: any;
  placeholderScale?: number;
  defaultPlaceholder?: string;
  useComputedStyle?: boolean;
  onChangeFunction?: any;
  multiProp?: any; // 属性值包含多项是的项序号
}

export default (props: numberProps) => {
  const {
    styleData,
    styleKey,
    unit,
    onStyleChange,
    min,
    max,
    style = {},
    className = '',
    placeholderScale,
    onChangeFunction,
    multiProp,
    defaultPlaceholder,
  } = props;

  const [placeholder, setPlaceholder] = useState<string | number | undefined>(defaultPlaceholder);
  const onNumberChange = (
    styleKey: string,
    value: number | string | null | undefined,
    unit?: string,
  ) => {
    onStyleChange?.([
      {
        styleKey,
        // addUnit 内部已对 undefined 做兜底（返回 null），这里的断言只为满足其入参类型，运行时不变
        value: unit ? addUnit(value as number | string, unit) : String(value),
      },
    ]);
  };

  const initData = (props: numberProps) => {
    const { field, styleKey, useComputedStyle } = props;
    if (useComputedStyle) {
      const placeholder = getPlaceholderPropertyValue(field, styleKey);

      if (placeholder && !isNaN(Number(placeholder))) {
        // placeholderScale 缺省时沿用原运行时行为（1 / undefined => NaN）
        setPlaceholder(Number(placeholder) * (1 / placeholderScale!));
      } else {
        setPlaceholder('auto');
      }
    }
  };

  useEffect(() => {
    initData(props);
  }, []);

  let value: string | number | null = unit
    ? removeUnit(styleData[styleKey])
    : styleData[styleKey];
  let curUnit = unit ? getUnit(styleData[styleKey]) || 'px' : '';
  // 不加multiprop一样，加了单独处理
  if (typeof multiProp === 'number') {
    value = unifyStyle(styleData[styleKey])?.split(' ')?.[multiProp] ?? null;
    if (value === null || value === undefined || value === 'auto') {
      value = null;
      curUnit = 'px';
    } else {
      curUnit = unit ? getUnit(value) || 'px' : '';
      value = unit ? removeUnit(value) : value;
    }
  }
  if (value !== null && value !== '' && isNaN(Number(value))) {
    value = 0;
  }
  const getInnerAfter = useMemo(() => {
    if (typeof unit === 'string') {
      return unit;
    }
    if (!unit) {
      return '';
    }
    const options = unit?.map((item: string) => {
      return {
        value: item,
        label: item,
      };
    });
    return (
        <Select
          defaultValue="px"
          style={{ width: '24px' }}
          value={curUnit || 'px'}
          autoWidth={false}
          hasBorder={false}
          hasArrow={false}
          onChange={(val) =>
            // options 由 `unit.map((item: string) => ({ value: item }))` 构造，
            // 运行时 val 必为字符串单位；这里做针对性收窄以满足 onNumberChange 的 unit 类型
            onChangeFunction
              ? onChangeFunction(styleKey, value, val)
              : onNumberChange(styleKey, value, val as string)
          }
          dataSource={options}
        />
    );
  }, [unit]);
  const originValue = styleData[styleKey]
  if (isCssVarBind(originValue)) {
    return <div className='ext-css-variable-ghost' title={originValue}>
      {originValue}
    </div>;
  }
  // Fusion 的 NumberPickerProps 类型未声明 placeholder，但组件运行时会通过
  // `obj.pickOthers` 把未识别的 props 透传给内部的 Input（Input 支持 placeholder），
  // 所以这里用只含 placeholder 的对象透传（用 Pick 精确限定，避免带入 onChange/value 等冲突 prop），
  // 保持既有运行时行为不变。
  // placeholder state 可能是 number（来自 getPlaceholderPropertyValue * scale），
  // React 运行时会把 number 属性渲染成其字符串形式；这里显式 String() 收窄以匹配类型，行为不变。
  const forwardedProps: Pick<React.InputHTMLAttributes<HTMLInputElement>, 'placeholder'> = {
    placeholder:
      placeholder === undefined || placeholder === null ? undefined : String(placeholder),
  };
  return (
    <NumberPicker
      style={style}
      className={className}
      value={value ?? undefined}
      min={min === undefined ? Number.MIN_SAFE_INTEGER : min}
      max={max === undefined ? Number.MAX_SAFE_INTEGER : max}
      onChange={(val) =>
        onChangeFunction
          ? onChangeFunction(styleKey, val, curUnit)
          : onNumberChange(styleKey, val, curUnit)
      }
      innerAfter={getInnerAfter}
      {...forwardedProps}
     />
  );
};
