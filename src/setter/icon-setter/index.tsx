import React, { PureComponent } from 'react';
// import PropTypes from 'prop-types';
import { Input, Icon, Balloon } from '@alifd/next';

import './index.less';
import { intl } from './locale';

const icons = [
  'smile',
  'cry',
  'success',
  'warning',
  'prompt',
  'error',
  'help',
  'clock',
  'success-filling',
  'delete-filling',
  'favorites-filling',
  'add',
  'minus',
  'arrow-up',
  'arrow-down',
  'arrow-left',
  'arrow-right',
  'arrow-double-left',
  'arrow-double-right',
  'switch',
  'sorting',
  'descending',
  'ascending',
  'select',
  'semi-select',
  'loading',
  'search',
  'close',
  'ellipsis',
  'picture',
  'calendar',
  'ashbin',
  'upload',
  'download',
  'set',
  'edit',
  'refresh',
  'filter',
  'attachment',
  'account',
  'email',
  'atm',
  'copy',
  'exit',
  'eye',
  'eye-close',
  'toggle-left',
  'toggle-right',
  'lock',
  'unlock',
  'chart-pie',
  'chart-bar',
  'form',
  'detail',
  'list',
  'dashboard',
];
/** type === 'node' 时，onChange 回传的是低代码组件节点而非字符串 */
interface IconNodeValue {
  componentName: string;
  props: { type: string };
}

interface IconSetterProps {
  value: string;
  type: string;
  defaultValue: string;
  placeholder: string;
  hasClear: boolean;
  /** string 模式回传图标名；node 模式回传 { componentName, props } 节点 */
  onChange: (icon: string | IconNodeValue) => void;
  icons: string[];
}
interface IconSetterState {
  setterValue: string | IconNodeValue | null;
}

export default class IconSetter extends PureComponent<IconSetterProps, IconSetterState> {
  static defaultProps = {
    value: undefined,
    type: 'string',
    defaultValue: '',
    hasClear: true,
    icons,
    placeholder: `${intl('PleaseClickToSelectIcon')}`,
    onChange: () => undefined,
  };
  static displayName = 'IconSetter';

  // 形参用 Partial：见 color-setter 同款说明（React 19 @types 对 ComponentClass<any> 的
  // getDerivedStateFromProps 逆变检查更严，声明具体 Props 会让下游 registerSetter 报 TS2345）
  static getDerivedStateFromProps(
    nextProps: Partial<IconSetterProps>,
    prevState: IconSetterState,
  ): Partial<IconSetterState> | null {
    const { value, defaultValue } = nextProps;
    if (prevState.setterValue == null) {
      if (value === undefined && defaultValue) {
        return {
          setterValue: defaultValue,
        };
      }
    }

    return {
      setterValue: value,
    };
  }

  state: IconSetterState = {
    setterValue: null,
  };

  _onChange = (icon: string) => {
    const { onChange, type } = this.props;
    if (type === 'string') {
      onChange(icon);
    } else if (type === 'node') {
      onChange({
        componentName: 'Icon',
        props: {
          type: icon,
        },
      });
    }
  };

  // Fusion Input.onChange 回传 `(value: string | number, e, reason?)`，窄化成字符串
  onInputChange = (icon: string | number) => {
    this._onChange(String(icon));
  };

  onSelectIcon = (icon: string) => {
    this._onChange(icon);
  };

  render() {
    const { placeholder, hasClear } = this.props;
    const { setterValue } = this.state;
    const _value = typeof setterValue === 'object' ? setterValue?.props?.type : setterValue;
    const currentIcon = <Icon size="xs" type={_value} />;
    const clearIcon = hasClear && (
      <Icon
        size="xs"
        id="icon-clear"
        type="delete-filling"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          this.onSelectIcon('');
        }}
      />
    );

    const triggerNode = (
      <div>
        <Input
          size="small"
          placeholder={placeholder}
          addonTextBefore={currentIcon}
          onChange={this.onInputChange}
          value={_value}
          readOnly
          addonTextAfter={clearIcon}
        />
      </div>
    );
    const InnerBeforeNode = (
      <Balloon
        className={'lowcode-icon-content'}
        trigger={triggerNode}
        needAdjust
        triggerType="click"
        closable={false}
        alignEdge
        align="l"
        popupClassName="lowcode-icon-setter-popup"
      >
        <ul className="lowcode-icon-list">
          {icons.map((icon) => (
            <li key={icon} onClick={() => this.onSelectIcon(icon)}>
              <Icon type={icon} size="medium" />
            </li>
          ))}
        </ul>
      </Balloon>
    );

    return <div className="lc-icon-setter">{InnerBeforeNode}</div>;
  }
}
