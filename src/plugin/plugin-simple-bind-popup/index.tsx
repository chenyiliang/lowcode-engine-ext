import React, { Component } from 'react';
import { Button, Overlay } from '@alifd/next';
import { PluginProps, PluginConfig, IPublicModelSettingField } from '@alilc/lowcode-types';
import { event } from '@alilc/lowcode-engine';
import MonacoEditor from '@alilc/lowcode-plugin-base-monaco-editor';
import './index.less';
import { adjustOverlayPosition } from './utils';

/**
 * 宿主（编辑器）通过 `skeleton.add` 注入的插件配置，
 * `PluginConfig.props` 只声明了通用字段，这里补上本插件用到的 `maxTextSize`。
 */
interface SimpleVariableBindPopupConfig extends PluginConfig {
  props: PluginConfig['props'] & {
    /** 绑定变量最大字符数 */
    maxTextSize?: number;
  };
}

interface SimpleVariableBindPopupProps extends Omit<PluginProps, 'config'> {
  config?: SimpleVariableBindPopupConfig;
  /** 编辑后是否自动保存 */
  autoSave?: boolean;
}

interface SimpleVariableBindPopupState {
  visiable: boolean;
  isOverFlowMaxSize: boolean;
  jsCode?: string;
  /** 低代码字段模型，openDialog 事件回填 */
  field: IPublicModelSettingField | null;
  treeList: unknown[];
  minimize: boolean; // 是否最小化
  autoExpandParent: boolean;
  maxTextSize?: number; // 绑定变量最大字符数
  /** 触发弹层的 DOM 节点 */
  node: HTMLElement | null;
}

const defaultEditorProps = {
  width: '100%',
  height: '150px',
};

const defaultEditorOption = {
  options:{
    readOnly: false,
    automaticLayout: true,
    folding: false, // 默认开启折叠代码功能
    lineNumbers: 'off',
    wordWrap: 'on',
    formatOnPaste: true,
    fontSize: 12,
    tabSize: 2,
    scrollBeyondLastLine: false,
    fixedOverflowWidgets: false,
    snippetSuggestions: 'top',
    minimap: {
      enabled: false,
    },
    scrollbar: {
      vertical: 'auto',
      horizontal: 'auto',
      verticalScrollbarSize:0
    },
  }
};

export default class SimpleVariableBindPopup extends Component<
  SimpleVariableBindPopupProps,
  SimpleVariableBindPopupState
> {
  state: SimpleVariableBindPopupState = {
    visiable: false,
    isOverFlowMaxSize: false,
    jsCode: '',
    field: null, // 编辑器全局变量
    treeList: [],
    minimize: false, // 是否最小化
    autoExpandParent: true,
    maxTextSize: 0, // 绑定变量最大字符数
    node: null, // 触发的节点
  };

  private editorJsRef = React.createRef<HTMLDivElement>();
  private nodeRef: HTMLDivElement | null = null;
  private overlayRef = React.createRef<HTMLDivElement>();
  /** 记录当前 monaco 编辑器容器 dom 节点 */
  private editorNode: HTMLDivElement | null = null;

  componentDidMount() {
    event.on(
      'common:variableBindDialog.openDialog',
      ({
        field,
        node,
        maxTextSize,
      }: {
        field: IPublicModelSettingField;
        node?: HTMLElement;
        maxTextSize?: number;
      }) => {
        const finalMaxTextSize =
          maxTextSize && typeof maxTextSize === 'number'
            ? maxTextSize
            : this.props.config?.props?.maxTextSize;
        this.setState(
          {
            field,
            node: node || this.nodeRef,
            maxTextSize: finalMaxTextSize,
          },
          () => {
            this.initCode();
            this.openDialog();
          },
        );
      },
    );
  }

  initCode = () => {
    const { field } = this.state;
    if (!field) return;
    const fieldValue = field.getValue();
    const jsCode = fieldValue?.value;

    this.setState({
      jsCode,
      // fullScreenStatus: false,
      minimize: false, // 是否最小化
      isOverFlowMaxSize:false,
    });
  };

  openDialog = () => {
    this.setState({ visiable: true });
  };

  closeDialog = () => {
    this.setState({
      visiable: false,
      minimize: false,
    });
  };

  updateCode = (newCode: string) => {
    let isOverFlowMaxSize = false;
    if (this.state.maxTextSize){
      isOverFlowMaxSize = (newCode?.length ?? 0) > this.state.maxTextSize
    }

    this.setState(
      {
        jsCode: newCode,
        isOverFlowMaxSize
      },
      this.autoSave,
    );
  };

  autoSave = () => {
    const { autoSave } = this.props;
    if (autoSave) {
      this.onOk(true);
    }
  };

  // MonacoEditor 的 editorDidMount 回调签名为 (monaco, editor)，调用处按此约定透传
  editorDidMount = (_editor?: unknown, _useMonaco?: unknown) => {
    setTimeout(() => {
      this.editorNode = this.editorJsRef.current; // 记录当前dom节点；
    }, 0);
  };

  onOk = (autoSave?: boolean) => {
    const { field, jsCode } = this.state;
    if (!field) return;
    if(jsCode === undefined || jsCode?.length == 0) {
      return this.removeTheBinding()
    }

    const fieldValue = field.getValue();
    field.setValue({
      type: 'JSExpression',
      value: jsCode,
      mock:
        Object.prototype.toString.call(fieldValue) === '[object Object]'
          ? fieldValue.mock
          : fieldValue,
    });
    if (autoSave !== true) {
      this.closeDialog();
    }
  };

  removeTheBinding = () => {
    const { field } = this.state;
    if (!field) return;
    const fieldValue = field.getValue();
    const value =
      Object.prototype.toString.call(fieldValue) === '[object Object]'
        ? fieldValue.mock
        : fieldValue;
    console.debug('value', value, 'fieldValue', fieldValue, field)
    field.setValue(value);
    this.closeDialog();
  };

  renderBottom = () => {
    const { jsCode } = this.state;
    return (
      <div className="simple-bind-dialog-bottom">
        <div className="bottom-left-container">
          {jsCode && jsCode.length > 0 && (
            <Button type="normal" warning onClick={this.removeTheBinding}>
              移除绑定
            </Button>
          )}
        </div>

        <div className="bottom-right-container">
          <Button type="primary" onClick={() => this.onOk()} disabled={this.isBtnDisable()}>
            确定
          </Button>
          &nbsp;&nbsp;
          <Button type="normal" onClick={this.closeDialog}>
            取消
          </Button>
        </div>
      </div>
    );
  };

  minimizeClick = (state: boolean) => {
    this.setState({
      minimize: state,
      visiable: !state,
    });
  };

  renderErrorMessage = () => {
    const {isOverFlowMaxSize,maxTextSize} = this.state;
    return (
      isOverFlowMaxSize ? <span className='error-message'>表达式文本不能超过{maxTextSize}个字符，请换成函数调用</span> :null
    )
  }

  isBtnDisable = () => {
    const { isOverFlowMaxSize } = this.state;
    return isOverFlowMaxSize;
  }


  render() {
    const {
      visiable,
      jsCode,
      minimize,
      isOverFlowMaxSize,
    } = this.state;

    return (
      <div>
        {minimize ? (
          <div className="vs-variable-minimize">
            <img
              onClick={() => this.minimizeClick(false)}
              src="https://img.alicdn.com/imgextra/i2/O1CN01HzeCND1vl948xPEWm_!!6000000006212-55-tps-200-200.svg"
            />
            <span onClick={() => this.minimizeClick(false)} className="vs-variable-minimize-title">
              变量绑定
            </span>
            <img
              onClick={this.closeDialog}
              src="https://img.alicdn.com/imgextra/i2/O1CN017cO64O1DzwlxwDSKW_!!6000000000288-55-tps-200-200.svg"
            />
          </div>
        ) : (
          ''
        )}
        {/* React 19：callback ref 必须返回 void，故用块体而非箭头返回赋值结果 */}
        <div style={{ position: 'absolute', top: 0, right: 100 }} ref={(ref) => { this.nodeRef = ref; }} />
        {this.state.node &&
          <Overlay
            v2
            key={this.state.field?.id}
            visible={!minimize && visiable}
            onRequestClose={this.closeDialog}
            // Fusion 运行时把 safeNode 当作「DOM 节点或其 id」，但其类型声明为 React.ReactNode，
            // 二者不一致（DOM Element 不属于 ReactNode）。这里过滤掉未命中的 null，
            // 再按其声明类型断言，绕过 Fusion 类型定义的不准确（运行时行为不变）。
            safeNode={
              [
                document.querySelector('.lc-left-area'),
                document.querySelector('.lc-left-fixed-pane'),
              ].filter(Boolean) as unknown as React.ReactNode
            }
            target={() => this.state.node}
            offset={[-380, 0]}
            onPosition={() => {
              adjustOverlayPosition(this.overlayRef.current!, [20])
            }}
          >
            <div className="simple-dialog-body" ref={this.overlayRef}>
              <div className="dialog-right-container">
                <div className="dialog-small-title">绑定 {this.renderErrorMessage()}</div>
                <div id="jsEditorDom" className={isOverFlowMaxSize?"editor-context editor-context-error":"editor-context"} ref={this.editorJsRef}>
                  <div className="editor-type-tag">=</div>
                  <MonacoEditor
                    value={jsCode}
                    {...defaultEditorProps}
                    {...defaultEditorOption}
                    {...{ language: 'javascript' }}
                    onChange={(newCode: string) => this.updateCode(newCode)}
                    editorDidMount={(useMonaco: unknown, editor: unknown) => {
                      this.editorDidMount(editor, useMonaco);
                    }}
                  />
                </div>
              </div>
              {this.renderBottom()}
          </div>
          </Overlay>
        }
      </div>
    );
  }
}
