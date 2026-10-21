import React, { PureComponent } from 'react';
import { Select, Balloon } from '@alifd/next';
import { project } from '@alilc/lowcode-engine';
import * as acorn from 'acorn';

import { isJSExpression, generateI18n } from './locale/utils';
import zhCN from './locale/zh-CN';

import './index.less';

const { Option, AutoComplete } = Select;
const { Tooltip } = Balloon;
const helpMap: Record<string, string> = {
  this: '容器上下文对象',
  state: '容器的state',
  props: '容器的props',
  context: '容器的context',
  schema: '页面上下文对象',
  component: '组件上下文对象',
  constants: '应用常量对象',
  utils: '应用工具对象',
  dataSourceMap: '容器数据源Map',
  field: '表单Field对象',
};

/**
 * React 19 已移除 `propTypes` 运行时校验，改用 TS 类型描述入参契约。
 * 这些字段由 lowcode 引擎的 setter 调度层注入，因此除 value/onChange 外都是可选的。
 */
export interface ExpressionSetterProps {
  /** 低代码字段模型，用于取 editor 上下文 */
  field?: any;
  context?: Record<string, any>;
  dataSource?: string[];
  locale?: string;
  messages?: Record<string, string>;
  onChange?: (value: { type: 'JSExpression'; value: string } | undefined) => void;
  placeholder?: string;
  value?: any;
  [key: string]: any;
}

interface ExpressionSetterState {
  value: any;
  dataSource: string[];
}

const defaultMessages: Record<string, string> = zhCN;

export default class ExpressionView extends PureComponent<
  ExpressionSetterProps,
  ExpressionSetterState
> {
  static displayName = 'Expression';

  /**
   * React 19 只在**函数组件**上移除了 `defaultProps`，类组件仍支持。
   * 这里保留 static defaultProps，避免把 setter 的默认值散落到各个解构点。
   */
  static defaultProps: Partial<ExpressionSetterProps> = {
    context: {},
    dataSource: [],
    locale: 'zh-CN',
    messages: defaultMessages,
    onChange: () => {},
    placeholder: '',
    value: '',
  };

  expression: React.RefObject<HTMLDivElement | null>;

  i18n: (key: string, values?: Record<string, any>) => string;

  t: ReturnType<typeof setTimeout> | undefined;

  $input: HTMLInputElement | null = null;

  listenerFun: ((event: KeyboardEvent | MouseEvent) => void) | null = null;

  state: ExpressionSetterState = {
    value: undefined,
    dataSource: [],
  };

  static getInitValue(val: { type?: string; value?: any } | string | undefined) {
    if (isJSExpression(val)) {
      if (typeof val === 'object') {
        return val.value;
      } else if (typeof val === 'string') {
        const arr = val.match(/^\{\{(.*?)\}\}$/);
        if (arr) return arr[1];
      }
    }
    return val;
  }

  constructor(props: ExpressionSetterProps) {
    super(props);
    this.expression = React.createRef<HTMLDivElement | null>();
    this.i18n = generateI18n(props.locale ?? 'zh-CN', props.messages ?? defaultMessages);
    this.state = {
      value: ExpressionView.getInitValue(props.value as any),
      dataSource: props.dataSource ?? [],
    };
  }

  // static getDerivedStateFromProps(props: { value: any }, state: { preValue: any }) {
  //   const curValue = ExpressionView.getInitValue(props.value);
  //   if (curValue !== state.preValue) {
  //     return {
  //       preValue: curValue,
  //       value: curValue,
  //     };
  //   }
  //   return null;
  // }

  onChange(value: string) {
    const realInputValue = value;
    const realDataSource: string[] | null = null;
    let nextCursorIndex: number | undefined;
    // 更新值
    // if (actionType === 'itemClick' || actionType === 'enter') {
    //   // const curValue = this.state.value;
    //   // if (curValue) {
    //   //   realInputValue = curValue + realInputValue;
    //   // }
    // }
    // 更新数据源
    const newState: Partial<ExpressionSetterState> = {
      value: realInputValue,
    };
    if (realDataSource !== null) newState.dataSource = realDataSource;
    this.setState(newState as ExpressionSetterState, () => {
      nextCursorIndex && this.setInputCursorPosition(nextCursorIndex);
    });
    // 默认加上变量表达式
    this.t && clearTimeout(this.t);
    this.t = setTimeout(() => {
      const { onChange } = this.props;
      // realInputValue = realInputValue ? `{{${realInputValue}}}` : undefined;
      onChange &&
        onChange({
          type: 'JSExpression',
          value: realInputValue,
        });
    }, 300);
  }

  /**
   * 获取AutoComplete数据源
   * @param  {String}
   * @return {Array}
   */
  getDataSource(): any[] {
    const schema = project.exportSchema();
    const stateMap = schema.componentsTree[0].state;
    const dataSource = [];

    const datasourceMap = schema.componentsTree[0]?.dataSource;
    const list = datasourceMap?.list || [];

    for (const key in stateMap) {
      dataSource.push(`this.state.${key}`);
    }

    for (const item of list) {
      if (item && item.id) {
        dataSource.push(`this.state.${item.id}`);
      }
    }

    return dataSource;
  }

  /**
   * 获取光标前的对象字符串，语法解析获取对象字符串
   * @param  {String} str 模板字符串
   * @return {String}     光标前的对象字符串
   */
  getCurrentFiled(str: string) {
    const source = `${str}x`; // .后面加一个x字符，便于acorn解析
    try {
      // acorn 8 起 `ecmaVersion` 是必填项（缺省时运行时只会 warn 并回退到 2020）
      const astTree = acorn.parse(source, { ecmaVersion: 'latest' });
      const [firstStatement] = astTree.body;
      if (!firstStatement || firstStatement.type !== 'ExpressionStatement') return null;
      const { expression } = firstStatement;
      const right = expression.type === 'AssignmentExpression' ? expression.right : expression;
      if (right.type === 'MemberExpression') {
        const { start, end } = right;
        return { str: source.slice(start, end), start, end };
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  /**
   * 获取输入的上下文信息
   * @param  {Array}
   * @return {Array}
   */
  getContextKeys(keys: string[]): string[] {
    const { editor } = this.props.field ?? {};
    const limitKeys = ['schema', 'utils', 'constants'];
    if (keys.length === 0) return limitKeys;
    if (!limitKeys.includes(keys[0])) return [];
    let result: string[] = [];
    let keyValue: any = editor;
    let assert = false;
    keys.forEach((item) => {
      if (!keyValue[item] || typeof keyValue[item] !== 'object') {
        assert = true;
      }
      if (keyValue[item]) {
        keyValue = keyValue[item];
      }
    });
    if (assert) return [];
    result = Object.keys(keyValue);
    return result;
    // return utilsKeys.concat(constantsKeys).concat(schemaKeys);
  }

  /* 过滤key */
  filterKey(obj: Record<string, any>, name: string) {
    const filterKeys = [
      'reloadDataSource',
      'REACT_HOT_LOADER_RENDERED_GENERATION',
      'refs',
      'updater',
      'appHelper',
      'isReactComponent',
      'forceUpdate',
      'setState',
      'isPureReactComponent',
    ];
    const result: string[] = [];
    for (const key in obj) {
      if (key.indexOf('_') !== 0 && filterKeys.indexOf(key) === -1) {
        result.push(`${name}.${key}`);
      }
    }
    return result;
  }

  /**
   * 根据输入项进行筛选
   * @param  {String}
   * @param  {String}
   * @return {Boolen}
   */
  filterOption(inputValue: string | number, item: { value?: string | number | boolean | null }) {
    const cursorIndex = this.getInputCursorPosition();
    if (typeof inputValue != 'string') return false;
    const preStr = inputValue.substr(0, cursorIndex ?? 0);
    // dataSource 是 string[]，取光标前最后一段作为匹配关键字
    const lastKey = preStr.split('.').slice(-1)[0];
    if (lastKey === undefined) return true;
    // 选项值运行期恒为字符串，非字符串值不参与匹配
    if (typeof item.value !== 'string') return false;
    if (item.value.indexOf(lastKey) > -1) return true;
    return false;
  }

  // handleClick = () => {
  //   this.props.field.editor.emit('variableBindDialog.open');
  // }

  render() {
    const { value, dataSource } = this.state;
    // locale/messages/field/context 是 setter 自身消费的属性，不能透传给 Fusion AutoComplete
    //（locale 类型也不同）；其余属性作为 Fusion 透传项保留。
    const {
      placeholder,
      locale: _locale,
      messages: _messages,
      field: _field,
      context: _context,
      value: _value,
      onChange: _onChange,
      dataSource: _dataSource,
      ...autoCompleteProps
    } = this.props;
    const isValObject = !!(value == '[object Object]');
    const title = isValObject
      ? this.i18n('valueIllegal')
      : (value || placeholder || this.i18n('jsExpression')).toString();
    const cursorIndex = this.getInputCursorPosition();
    const childNode = cursorIndex ? (
      <div className="cursor-blink">
        {title.substr(0, cursorIndex)}
        <b>|</b>
        {title.substr(cursorIndex)}
      </div>
    ) : (
      title
    );

    return (
      <div ref={this.expression} style={{ width: '100%', display: 'inline-block' }}>
        <Tooltip
          triggerType={isValObject ? ['click'] : ['focus']}
          align="tl"
          popupClassName="code-input-overlay"
          trigger={
            isValObject ? (
              value
            ) : (
              <div>
                <AutoComplete
                  size="small"
                  {...autoCompleteProps}
                  style={{ width: '100%' }}
                  dataSource={dataSource}
                  placeholder={placeholder || this.i18n('jsExpression')}
                  value={value}
                  disabled={isValObject}
                  innerBefore={<span style={{ color: '#999', marginLeft: 4 }}>{'{{'}</span>}
                  innerAfter={<span style={{ color: '#999', marginRight: 4 }}>{'}}'}</span>}
                  popupClassName="expression-setter-item-inner"
                  // eslint-disable-next-line no-shadow
                  itemRender={(itemValue) => {
                    const itemKey = String(itemValue.value);
                    return (
                      <Option key={itemKey} value={itemValue.value}>
                        <div className="code-input-value">{itemValue.value}</div>
                        <div className="code-input-help">{helpMap[itemKey]}</div>
                      </Option>
                    );
                  }}
                  onChange={this.onChange.bind(this)}
                  filter={this.filterOption.bind(this)}
                />
              </div>
            )
          }
        >
          {childNode}
        </Tooltip>
      </div>
    );
  }

  componentDidMount() {
    this.$input = this.findInputElement();
    if (this.$input) {
      this.listenerFun = (event: KeyboardEvent | MouseEvent) => {
        const isMoveKey = !!(
          event.type == 'keyup' &&
          ~[37, 38, 39, 91].indexOf((event as KeyboardEvent).keyCode)
        );
        const isMouseup = event.type == 'mouseup';
        if (isMoveKey || isMouseup) {
          // eslint-disable-next-line react/no-access-state-in-setstate
          const dataSource = this.getDataSource() || [];
          this.setState({
            dataSource,
          });
        }
      };
      this.$input.addEventListener('keyup', this.listenerFun, false);
      this.$input.addEventListener('mouseup', this.listenerFun, false);
    }
  }

  componentWillUnmount() {
    if (this.t) {
      clearTimeout(this.t);
    }
    if (this.listenerFun && this.$input) {
      this.$input.removeEventListener('keyup', this.listenerFun, false);
      this.$input.removeEventListener('mouseup', this.listenerFun, false);
    }
    this.$input = null;
    this.listenerFun = null;
  }

  /**
   * 获取 Input 输入框 DOM 节点。
   *
   * React 19 移除了 `ReactDOM.findDOMNode`，这里沿用已有的容器 ref 往下查，
   * 不依赖实例 -> DOM 的隐式解析。
   */
  findInputElement(): HTMLInputElement | null {
    const container = this.expression.current;
    return container?.querySelector('input') ?? null;
  }

  /**
   * 获取光标位置
   */
  getInputCursorPosition(): number | undefined {
    if (!this.$input) return undefined;
    return this.$input.selectionStart ?? undefined;
  }

  /*
   * 字符串取得对象keys
   */
  getObjectKeys(str: string) {
    const keys = str ? str.split('.') : [];
    return keys.slice(0, keys.length - 1);
  }

  /*
   * 设置input组件光标位置在闭合}前
   */
  setInputCursorPosition(idx: number) {
    this.$input?.setSelectionRange(idx, idx);
    this.forceUpdate();
  }
}
