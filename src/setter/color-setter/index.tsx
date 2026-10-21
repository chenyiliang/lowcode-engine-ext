import * as React from 'react';
import { Input, Balloon } from '@alifd/next';
import { SketchPicker } from 'react-color';
import './index.less';
interface ColorSetterProps {
  value: string;
  onChange: (val: any) => void;
  defaultValue: string;
}
interface ColorSetterState {
  width: number;
  // 初始为 null，getDerivedStateFromProps 会用 value/defaultValue 填充
  setterValue: string | null;
}
export default class ColorSetter extends React.Component<ColorSetterProps, ColorSetterState> {
  static displayName = 'ColorSetter';
  constructor(props: ColorSetterProps) {
    super(props);
    this.state = {
      width: -92,
      setterValue: null,
    };
  }
  componentDidMount() {
    this.screenChange();
    this.changeWidth();
  }
  /**
   * 屏幕分辨率监听
   */
  screenChange = () => {
    window.addEventListener('resize', this.changeWidth);
  };
  /**
   * 屏幕分辨率 变换 =>  改变冒泡框的位置
   */
  changeWidth = () => {
    this.setState({ width: document.body.clientWidth < 1860 ? -92 : -138 });
  };
  componentWillUnmount() {
    window.removeEventListener('resize', this.changeWidth);
  }
  // 形参用 Partial 而非 ColorSetterProps：React 19 的 @types 对 ComponentClass<any> 的
  // getDerivedStateFromProps 检查更严，要求它能接受 Readonly<any>。声明具体 Props 会因函数参数
  // 逆变而不兼容，导致下游 registerSetter(setterMap) 报 TS2345。Partial 既满足逆变又保留体内类型。
  static getDerivedStateFromProps(
    nextProps: Partial<ColorSetterProps>,
    prevState: ColorSetterState,
  ): Partial<ColorSetterState> | null {
    const { value, defaultValue } = nextProps;
    if (prevState.setterValue == null) {
      if (value == undefined && defaultValue) {
        return {
          setterValue: defaultValue,
        };
      }
    }
    return {
      setterValue: value,
    };
  }
  handleChange = (color: any) => {
    const { onChange } = this.props;
    const { rgb, hex } = color;
    const { r, g, b, a } = rgb;
    if (a === 1) {
      onChange(hex);
    } else {
      onChange(`rgba(${r},${g},${b},${a})`);
    }
  };

  render() {
    const { width, setterValue } = this.state;
    const { onChange } = this.props;
    const InputTarget = (
      <Input
        size="small"
        className="lowcode-setter-color"
        style={{ width: '100%' }}
        innerBefore={<div className="color-box" style={{ backgroundColor: setterValue ?? undefined }} />}
        value={setterValue}
        onChange={onChange}
      />
    );
    return (
      <Balloon
        needAdjust
        align="tr"
        offset={[width, 0]}
        style={{ padding: 0 }}
        trigger={InputTarget}
        triggerType="click"
        closable={false}
      >
        <SketchPicker color={setterValue ?? undefined} onChange={this.handleChange} />
      </Balloon>
    );
  }
}
