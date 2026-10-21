import * as React from 'react';
import { Component, Fragment } from 'react';
import { Button } from '@alifd/next';
import { common } from '@alilc/lowcode-engine';
import { IPublicTypeSetterType, IPublicModelSettingField, IPublicTypeFieldConfig, IPublicTypeCustomView, IPublicTypeTitleContent } from '@alilc/lowcode-types';
import CustomIcon from '../../components/custom-icon';
import './index.less';

const { editorCabin, skeletonCabin, designerCabin } = common;
const { Title } = editorCabin;
const { isSettingField } = designerCabin;
const { createSettingFieldView, PopupContext } = skeletonCabin;

/**
 * descriptor 既可传一个属性名字符串（走 field.getPropValue 取值），
 * 也可传一个由 field 计算标题的函数。解析后的结果作为 ReactNode 展示。
 */
type Descriptor = string | ((field: IPublicModelSettingField) => React.ReactNode);

export default class ObjectSetter extends Component<{
  field: IPublicModelSettingField;
  descriptor?: Descriptor;
  config: ObjectSetterConfig;
  mode?: 'popup' | 'form';
  // 1: in tablerow  2: in listrow 3: in column-cell
  forceInline?: number;
}> {
  render() {
    const { mode, forceInline = 0, ...props } = this.props;
    if (forceInline || mode === 'popup') {
      if (forceInline > 2 || mode === 'popup') {
        // popup
        return <RowSetter {...props} primaryButton={!forceInline} />;
      } else {
        return <RowSetter columns={forceInline > 1 ? 2 : 4} {...props} />;
      }
    } else {
      // form
      return <FormSetter {...props} />;
    }
  }
}

interface ObjectSetterConfig {
  items?: IPublicTypeFieldConfig[];
  extraSetter?: IPublicTypeSetterType;
  canCloseByOutSideClick: boolean;
}

interface RowSetterProps {
  value?: any;
  field: IPublicModelSettingField;
  descriptor?: Descriptor;
  config: ObjectSetterConfig;
  columns?: number;
  primaryButton?: boolean;
}

interface RowSetterState {
  items: IPublicModelSettingField[];
  descriptor?: React.ReactNode;
}

/**
 * skeletonCabin.PopupContext 提供的浮层管道。它属于引擎内部能力，
 * `@alilc/lowcode-engine` 尚未产出 dist，这里按其真实用法声明最小接口，
 * 而不是把 context 放宽成 any。
 */
interface PopupPipe {
  create(options: { width?: number; canCloseByOutSideClick?: boolean }): PopupPipe;
  send(content: React.ReactNode, title?: React.ReactNode): void;
  show(target: Element | EventTarget, key?: string): void;
}

/** 子字段 setValue 包装：既触发子字段本身、也冒泡到父字段 */
function wrapSetValue(
  original: ((target: IPublicModelSettingField, value: any) => void) | undefined,
  parentExtraProps: IPublicModelSettingField['extraProps'],
) {
  return (target: IPublicModelSettingField, value: any) => {
    // 调用子字段本身的 setValue
    original?.apply(null, [target, value]);
    // 调用父字段本身的 setValue
    parentExtraProps.setValue?.apply(null, [target, value]);
  };
}

/**
 * designerCabin.isSettingField 的本地类型收窄包装。
 * 引擎 dist 未产出前该 guard 是 any、无法在 TS 里收窄联合类型，
 * 这里显式声明为类型谓词，运行期仍委托原 guard。
 */
function isFieldItem(
  item: IPublicModelSettingField | IPublicTypeCustomView,
): item is IPublicModelSettingField {
  return isSettingField(item);
}

function getItemsFromProps(props: RowSetterProps, state?: RowSetterState) {
  const { config, field, columns } = props;
  const { extraProps } = field;
  const items: IPublicModelSettingField[] = [];
  if (columns && config?.items) {
    const l = Math.min(config.items.length, columns);
    for (let i = 0; i < config.items.length; i++) {
      const conf = config.items[i];
      if (conf.isRequired || conf.important || (conf.setter as any)?.isRequired) {
        const item = state?.items?.filter(d => d.name === conf.name)?.[0] || field.createField({
          ...conf,
          // in column-cell
          forceInline: 3,
        });
        item.extraProps.setValue = wrapSetValue(item.extraProps.setValue, extraProps);
        items.push(item);
      }
      if (items.length >= l) {
        break;
      }
    }
  }
  return items;
}

class RowSetter extends Component<RowSetterProps, RowSetterState> {
  static contextType = PopupContext;

  state: RowSetterState = {
    descriptor: '',
    items: [],
  };

  static getDerivedStateFromProps(props: RowSetterProps, state: RowSetterState) {
    return {
      items: getItemsFromProps(props, state),
    };
  }

  constructor(props: RowSetterProps) {
    super(props);
    const { descriptor, field } = props;
    const items: IPublicModelSettingField[] = getItemsFromProps(props);
    this.state = { items };

    let firstRun = true;
    field.onEffect(() => {
      let descriptorNode: React.ReactNode;
      if (descriptor) {
        descriptorNode =
          typeof descriptor === 'function' ? descriptor(field) : field.getPropValue(descriptor);
      } else {
        descriptorNode = field.title;
      }
      const state = { descriptor: descriptorNode };

      if (firstRun) {
        firstRun = false;
        // 保持原实现：首帧直接整体替换 this.state（只含 descriptor）
        this.state = state as RowSetterState;
      } else {
        this.setState(state);
      }
    });
  }

  shouldComponentUpdate(nextProps: RowSetterProps, nextState: RowSetterState) {
    if (this.state.descriptor !== nextState.descriptor) {
      return true;
    }
    if (this.props.value !== nextProps.value) {
      return true;
    }
    return false;
  }

  private pipe: PopupPipe | null = null;

  render() {
    const { items } = this.state;
    const { field, config } = this.props;

    if (!this.pipe) {
      this.pipe = (this.context as PopupPipe).create({
        width: 320,
        canCloseByOutSideClick: config.canCloseByOutSideClick
      });
    }

    const title = (
      <Fragment>
        <Title title={this.state.descriptor} />
      </Fragment>
    );

    this.pipe.send(<FormSetter key={field.id} field={field} config={config} />, title);

    if (items && items.length) {
      return (
        <div className="lc-setter-object-row">
          <Button
            className="lc-setter-object-row-edit"
            size="small"
            ghost="light"
            onClick={(e) => {
              this.pipe?.show((e as any).target, field.id);
            }}
          >
            <CustomIcon type="icon-ic_edit" />
          </Button>
          <div className="lc-setter-object-row-body">
            {items.map((item) => createSettingFieldView(item, field))}
          </div>
        </div>
      );
    }

    return (
      <div className="lc-setter-object-row">
        <Button
          className="lc-setter-object-row-edit"
          size="small"
          ghost="light"
          onClick={(e) => {
            this.pipe?.show((e as any).target, field.id);
          }}
        >
          <CustomIcon type="icon-ic_edit" />
        </Button>
        <div className="lc-setter-object-row-body">{this.state.descriptor}：未配置快捷编辑项</div>
      </div>
    );
  }
}

interface FormSetterProps {
  field: IPublicModelSettingField;
  config: ObjectSetterConfig;
}
class FormSetter extends Component<FormSetterProps> {
  private items: (IPublicModelSettingField | IPublicTypeCustomView)[];

  constructor(props: RowSetterProps) {
    super(props);
    const { config, field } = props;
    const { extraProps } = field;

    if (Array.isArray(field.items) && field.items.length > 0) {
      field.items.forEach((item: IPublicModelSettingField | IPublicTypeCustomView) => {
        if (isFieldItem(item)) {
          item.extraProps.setValue = wrapSetValue(item.extraProps.setValue, extraProps);
        }
      });
      this.items = field.items;
    } else {
      this.items = (config?.items || []).map((conf) =>
        field.createField({
          ...conf,
          setValue: extraProps?.setValue,
        }),
      );
    }
    // TODO: extraConfig for custom fields
  }

  render() {
    const { field } = this.props;
    return (
      <div className="lc-setter-object lc-block-setter">
        {this.items.map((item, index) => createSettingFieldView(item, field, index))}
      </div>
    );
  }
}
