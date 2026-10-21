import React, { Component } from 'react';
import { isJSExpression, isJSFunction, isJSSlot } from '@alilc/lowcode-types';
import { isPlainObject } from './utils';
import { DatePicker, TimePicker } from '@alifd/next';
import moment from 'moment';
import ExpressionSetter from './setter/expression-setter';
import ColorSetter from './setter/color-setter';
import JsonSetter from './setter/json-setter';
import EventsSetter from './setter/events-setter';
import StyleSetterV2 from './setter/style-setter';
import IconSetter from './setter/icon-setter';
import FunctionSetter from './setter/function-setter';
import ClassNameSetter from './setter/classname-setter';
import StringSetter from './setter/string-setter';
import SelectSetter from './setter/select-setter';
import RadioGroupSetter from './setter/radiogroup-setter';
import BoolSetter from './setter/bool-setter';
import NumberSetter from './setter/number-setter';
import I18nSetter from './setter/i18n-setter';
import MixedSetter from './setter/mixed-setter';
import SlotSetter from './setter/slot-setter';
import TextAreaSetter from './setter/textarea-setter';
import ArraySetter from './setter/array-setter';
import ObjectSetter from './setter/object-setter';
import VariableSetter from './setter/variable-setter';
import TitleSetter from './setter/title-setter';
import EventBindDialog from './plugin/plugin-event-bind-dialog';
import VariableBindDialog from './plugin/plugin-variable-bind-dialog';
import SimpleVariableBindPopup from './plugin/plugin-simple-bind-popup'
import './index.less';
// suggest: 做成 StringSetter 的一个参数，
// export const TextAreaSetter = {
//   component: TextAreaSetter,
//   title: 'TextareaSetter',
//   recommend: true,
//   condition: (field: any) => {
//     const v = field.getValue();
//     return typeof v === 'string';
//   },
// };

export const DateSetter = DatePicker;
export const DateYearSetter = DatePicker.YearPicker;
export const DateMonthSetter = DatePicker.MonthPicker;
export const DateRangeSetter = DatePicker.RangePicker;

export { ExpressionSetter, EventsSetter, JsonSetter, IconSetter };

interface StringDateSetterProps {
  value?: any;
  showTime?: any;
  onChange?: (value: any) => void;
}

interface StringTimePickerProps {
  value?: any;
  onChange?: (value: any) => void;
}

// eslint-disable-next-line react/no-multi-comp
class StringDateSetter extends Component<StringDateSetterProps> {
  render() {
    const { onChange, value, showTime } = this.props;
    return (
      <DatePicker
        value={moment(value)}
        showTime={showTime}
        onChange={(val) => {
          // Fusion 的 onChange 回传 `Moment | string`（清空时为 ''），
          // 只在拿到 Moment 实例时才 format，清空则原样回传空值。
          onChange?.(moment.isMoment(val) ? val.format() : val);
        }}
      />
    );
  }
}

// eslint-disable-next-line react/no-multi-comp
class StringTimePicker extends Component<StringTimePickerProps> {
  render() {
    const { onChange, value } = this.props;
    return (
      <TimePicker
        value={moment(value)}
        onChange={(val) => {
          onChange?.(moment.isMoment(val) ? val.format('HH:mm:ss') : val);
        }}
      />
    );
  }
}

const DataExpressionSetter = {
  component: ExpressionSetter,
  condition: (field: any) => {
    const v = field.getValue();
    return isJSExpression(v);
  },
  valueType: ['JSExpression'],
  defaultProps: { placeholder: '请输入表达式' },
  title: '表达式输入',
  recommend: true,
};

const DataVariableSetter = {
  component: VariableSetter,
  condition: (field: any) => {
    const v = field.getValue();
    return isJSExpression(v);
  },
  valueType: ['JSExpression'],
  title: '变量输入',
  recommend: true,
};

const FunctionBindSetter = {
  component: FunctionSetter,
  title: '函数绑定',
  condition: (field: any) => {
    const v = field.getValue();
    return isJSFunction(v);
  },

  valueType: ['JSFunction'],
};

const DataJsonSetter = {
  component: JsonSetter,
  valueType: ['object', 'array'],
};

const DataArraySetter = {
  component: ArraySetter,
  defaultProps: {},
  title: 'ArraySetter',
  condition: (field: any) => {
    const v = field.getValue();
    return v == null || Array.isArray(v);
  },
  initialValue: [],
  recommend: true,
  valueType: ['array'],
};

const DataObjectSetter = {
  component: ObjectSetter,
  // todo: defaultProps
  defaultProps: {},
  title: 'ObjectSetter', // TODO
  condition: (field: any) => {
    const v = field.getValue();
    return v == null || isPlainObject(v);
  },
  initialValue: {},
  recommend: true,
};

const DataSlotSetter = {
  component: SlotSetter,
  // `as const` 保持 type 为字面量 'i18n'：否则对象字面量会被推宽成 string，
  // 匹配不上 IPublicTypeTitleContent 里的 IPublicTypeI18nData（其 type: 'i18n' 是字面量），
  // 导致下游 registerSetter(setterMap) 报 TS2345。
  // 这里刻意不整体标注成 IPublicTypeRegisteredSetter —— 该接口没有 valueType 字段，
  // 标注反而会触发多余属性检查。valueType 的类型缺口由 engine 侧补（见 CONVENTIONS 待办）。
  title: {
    type: 'i18n' as const,
    'zh-CN': '插槽输入',
    'en-US': 'Slot Setter',
  },
  condition: (field: any) => {
    return isJSSlot(field.getValue());
  },
  initialValue: (field: any, value: any) => {
    if (isJSSlot(value)) {
      return value;
    }
    return {
      type: 'JSSlot',
      value,
    };
  },
  recommend: true,
  valueType: ['JSSlot'],
};

/**
 * 版本号由 vite.config.ts 的 `define` 在构建期注入，
 * 替代原先的 `import packagesInfo from '../package.json'`——
 * package.json 在 src 之外，会让 vite-plugin-dts 把它的声明吐到 dist 之外。
 */
const engineExt = {
  version: __ENGINE_EXT_VERSION__,
  setters: {
    StringSetter,
    NumberSetter,
    BoolSetter,
    SelectSetter,
    VariableSetter: DataVariableSetter,
    ExpressionSetter: DataExpressionSetter,
    RadioGroupSetter,
    TextAreaSetter,
    DateSetter: StringDateSetter,
    TimePicker: StringTimePicker,
    DateYearSetter,
    DateMonthSetter,
    DateRangeSetter,
    EventsSetter,
    ColorSetter,
    JsonSetter: DataJsonSetter,
    StyleSetter: StyleSetterV2,
    IconSetter,
    ClassNameSetter,
    I18nSetter,
    FunctionSetter: FunctionBindSetter,
    MixedSetter,
    SlotSetter: DataSlotSetter,
    ArraySetter: DataArraySetter,
    ObjectSetter: DataObjectSetter,
    TitleSetter,
  },

  setterMap: {
    StringSetter,
    NumberSetter,
    BoolSetter,
    SelectSetter,
    VariableSetter: DataVariableSetter,
    ExpressionSetter: DataExpressionSetter,
    RadioGroupSetter,
    TextAreaSetter,
    DateSetter: StringDateSetter,
    TimePicker: StringTimePicker,
    DateYearSetter,
    DateMonthSetter,
    DateRangeSetter,
    EventsSetter,
    ColorSetter,
    JsonSetter: DataJsonSetter,
    StyleSetter: StyleSetterV2,
    IconSetter,
    ClassNameSetter,
    I18nSetter,
    FunctionSetter: FunctionBindSetter,
    MixedSetter,
    SlotSetter: DataSlotSetter,
    ArraySetter: DataArraySetter,
    ObjectSetter: DataObjectSetter,
    TitleSetter,
  },

  pluginMap: {
    EventBindDialog,
    VariableBindDialog,
    SimpleVariableBindPopup,
  },
};
window.AliLowCodeEngineExt = engineExt;
console.log(
  '%c AliLowCodeExt %c v'.concat(engineExt.version, ' '),
  'padding: 2px 1px; border-radius: 3px 0 0 3px; color: #fff; background: #5584ff; font-weight: bold;',
  'padding: 2px 1px; border-radius: 0 3px 3px 0; color: #fff; background: #42c02e; font-weight: bold;',
);
export default engineExt;

// registerSetter(builtinSetters);
